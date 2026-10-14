const mongoose = require('mongoose');
const { Appointment, Slot, Doctor, Patient, Department, Schedule } = require('../models');
const AppError = require('../utils/appError');
const AuditService = require('./auditService');
const { emitAppointmentEvent } = require('../utils/socketEmitter');
const { getDayOfWeek, isPastTime, timeStringToMinutes, doesSlotOverlapBreak } = require('../utils/dateUtils');

class AppointmentService {
  /**
   * Atomically books an appointment with zero double-booking concurrency guarantee
   */
  static async bookAppointment({
    patientId,
    doctorId,
    departmentId,
    startAt,
    endAt,
    purpose,
    user,
  }) {
    const slotStartDate = new Date(startAt);
    const slotEndDate = new Date(endAt);

    // 1. Check if time is in the past
    if (isPastTime(slotStartDate)) {
      throw new AppError('Cannot book an appointment for a past date or time', 400);
    }

    // 2. Validate Patient, Doctor, and Department exist
    const [patient, doctor, department] = await Promise.all([
      Patient.findById(patientId),
      Doctor.findById(doctorId).populate('userId', 'name'),
      Department.findById(departmentId),
    ]);

    if (!patient) throw new AppError('Patient not found', 404);
    if (!doctor) throw new AppError('Doctor not found', 404);
    if (!department) throw new AppError('Department not found', 404);

    // 3. Validate Schedule and Break rules
    const schedule = await Schedule.findOne({ doctorId, isActive: true });
    if (schedule) {
      const dayOfWeek = getDayOfWeek(slotStartDate);
      if (!schedule.workingDays.includes(dayOfWeek)) {
        throw new AppError('Doctor is not scheduled to work on this day of the week', 400);
      }

      // Check if slot overlaps any break
      const hours = slotStartDate.getUTCHours();
      const minutes = slotStartDate.getUTCMinutes();
      const slotStartMin = hours * 60 + minutes;
      const slotEndMin = slotStartMin + (schedule.slotDuration || 15);

      for (const brk of schedule.breaks || []) {
        const breakStartMin = timeStringToMinutes(brk.startTime);
        const breakEndMin = timeStringToMinutes(brk.endTime);
        if (doesSlotOverlapBreak(slotStartMin, slotEndMin, breakStartMin, breakEndMin)) {
          throw new AppError(
            `Selected slot overlaps doctor's break (${brk.breakName}: ${brk.startTime} - ${brk.endTime})`,
            400
          );
        }
      }
    }

    // 4. ATOMIC SLOT RESERVATION:
    // First, try conditional atomic update if slot document already exists in DB
    let reservedSlot = await Slot.findOneAndUpdate(
      { doctorId, startAt: slotStartDate, status: 'available' },
      { $set: { status: 'booked', endAt: slotEndDate } },
      { new: true }
    );

    // If slot document was not yet created, create it atomically.
    // Compound unique index { doctorId: 1, startAt: 1 } ensures that concurrent
    // creation requests will throw a duplicate key error (code 11000).
    if (!reservedSlot) {
      try {
        reservedSlot = await Slot.create({
          doctorId,
          startAt: slotStartDate,
          endAt: slotEndDate,
          status: 'booked',
        });
      } catch (err) {
        if (err.code === 11000) {
          throw new AppError(
            'This appointment slot is no longer available. It was just booked by another user.',
            409
          );
        }
        throw err;
      }
    }

    // 5. Create Appointment with Compensation Safety
    let appointment;
    try {
      appointment = await Appointment.create({
        patientId,
        doctorId,
        departmentId,
        startAt: slotStartDate,
        endAt: slotEndDate,
        purpose,
        bookedBy: user._id,
        status: 'scheduled',
      });

      // Link appointmentId into the slot record
      reservedSlot.appointmentId = appointment._id;
      await reservedSlot.save();
    } catch (creationError) {
      // Rollback atomic reservation in case of unexpected creation failure
      await Slot.findOneAndUpdate(
        { _id: reservedSlot._id },
        { $set: { status: 'available', appointmentId: null } }
      );
      throw creationError;
    }

    // 6. Record Audit Log
    await AuditService.log({
      userId: user._id,
      userEmail: user.email,
      role: user.role,
      action: 'APPOINTMENT_CREATED',
      entityType: 'Appointment',
      entityId: appointment._id,
      details: {
        patientName: patient.name,
        doctorName: doctor.userId?.name,
        startAt: appointment.startAt,
        purpose,
      },
    });

    // 7. Emit real-time Socket.IO event
    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('patientId', 'name mobile patientId gender dateOfBirth')
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email' },
      })
      .populate('departmentId', 'name')
      .populate('bookedBy', 'name role');

    emitAppointmentEvent('appointment:created', {
      appointment: populatedAppointment,
      doctorId: doctor._id.toString(),
      slotTime: slotStartDate.toISOString(),
    });

    return populatedAppointment;
  }

  /**
   * Retrieves list of appointments with filters, search, pagination, and RBAC doctor scoping
   */
  static async listAppointments(filters, user) {
    const {
      page = 1,
      limit = 10,
      status,
      doctorId,
      departmentId,
      patientId,
      search,
      startDate,
      endDate,
      sortBy = 'startAt',
      order = 'asc',
    } = filters;

    const query = {};

    // STRICT DOCTOR RBAC RESTRICTION:
    // If the authenticated user is a doctor, they CANNOT view other doctors' appointments.
    if (user.role === 'doctor') {
      const doctorProfile = await Doctor.findOne({ userId: user._id });
      if (!doctorProfile) {
        throw new AppError('Doctor profile not found for this account', 404);
      }
      query.doctorId = doctorProfile._id;
    } else if (doctorId) {
      query.doctorId = doctorId;
    }

    if (departmentId) query.departmentId = departmentId;
    if (patientId) query.patientId = patientId;
    if (status) query.status = status;

    // Date range filter
    if (startDate || endDate) {
      query.startAt = {};
      if (startDate) {
        query.startAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        query.startAt.$lte = end;
      }
    }

    // Text search on patient name or mobile
    if (search && search.trim()) {
      const patientRegex = new RegExp(search.trim(), 'i');
      const matchingPatients = await Patient.find({
        $or: [{ name: patientRegex }, { mobile: patientRegex }, { patientId: patientRegex }],
      }).select('_id');
      const patientIds = matchingPatients.map((p) => p._id);
      query.patientId = { $in: patientIds };
    }

    const sortOrder = order === 'desc' ? -1 : 1;
    const sortObj = { [sortBy]: sortOrder };

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [appointments, total] = await Promise.all([
      Appointment.find(query)
        .populate('patientId', 'name mobile patientId gender dateOfBirth bloodGroup')
        .populate({
          path: 'doctorId',
          populate: { path: 'userId', select: 'name email' },
        })
        .populate('departmentId', 'name')
        .populate('bookedBy', 'name role')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Appointment.countDocuments(query),
    ]);

    return {
      appointments,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Retrieves single appointment by ID with role check
   */
  static async getById(id, user) {
    const appointment = await Appointment.findById(id)
      .populate('patientId')
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email' },
      })
      .populate('departmentId')
      .populate('bookedBy', 'name role')
      .populate('cancelledBy', 'name role');

    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    // Doctor privacy check
    if (user.role === 'doctor') {
      const doctorProfile = await Doctor.findOne({ userId: user._id });
      if (!doctorProfile || appointment.doctorId._id.toString() !== doctorProfile._id.toString()) {
        throw new AppError('Access forbidden: you can only view your own appointments', 403);
      }
    }

    return appointment;
  }

  /**
   * Marks a patient as arrived (Receptionist or Admin)
   */
  static async markArrived(id, user) {
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    if (appointment.status !== 'scheduled') {
      throw new AppError(`Cannot mark as arrived: appointment is currently '${appointment.status}'`, 400);
    }

    appointment.status = 'arrived';
    appointment.arrivedAt = new Date();
    await appointment.save();

    await AuditService.log({
      userId: user._id,
      userEmail: user.email,
      role: user.role,
      action: 'PATIENT_ARRIVED',
      entityType: 'Appointment',
      entityId: appointment._id,
      details: { status: 'arrived' },
    });

    const populated = await Appointment.findById(id)
      .populate('patientId')
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email' },
      })
      .populate('departmentId');

    emitAppointmentEvent('appointment:status_changed', {
      appointment: populated,
      doctorId: appointment.doctorId.toString(),
      status: 'arrived',
    });

    return populated;
  }

  /**
   * Completes appointment and updates consultation notes (Doctor or Admin)
   */
  static async completeAppointment(id, consultationNotes, user) {
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    // Role verification: If doctor, must be assigned doctor
    if (user.role === 'doctor') {
      const doctorProfile = await Doctor.findOne({ userId: user._id });
      if (!doctorProfile || appointment.doctorId.toString() !== doctorProfile._id.toString()) {
        throw new AppError('Access forbidden: you can only complete your own appointments', 403);
      }
    }

    if (appointment.status === 'completed') {
      throw new AppError('Appointment is already completed', 400);
    }
    if (appointment.status === 'cancelled') {
      throw new AppError('Cannot complete a cancelled appointment', 400);
    }

    appointment.status = 'completed';
    appointment.completedAt = new Date();
    if (consultationNotes !== undefined) {
      appointment.consultationNotes = consultationNotes;
    }
    await appointment.save();

    await AuditService.log({
      userId: user._id,
      userEmail: user.email,
      role: user.role,
      action: 'APPOINTMENT_COMPLETED',
      entityType: 'Appointment',
      entityId: appointment._id,
      details: { status: 'completed' },
    });

    const populated = await Appointment.findById(id)
      .populate('patientId')
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email' },
      })
      .populate('departmentId');

    emitAppointmentEvent('appointment:status_changed', {
      appointment: populated,
      doctorId: appointment.doctorId.toString(),
      status: 'completed',
    });

    return populated;
  }

  /**
   * Cancels appointment and atomically releases the reserved slot
   */
  static async cancelAppointment(id, reason, user) {
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    // Doctor can only cancel own appointment
    if (user.role === 'doctor') {
      const doctorProfile = await Doctor.findOne({ userId: user._id });
      if (!doctorProfile || appointment.doctorId.toString() !== doctorProfile._id.toString()) {
        throw new AppError('Access forbidden: you can only cancel your own appointments', 403);
      }
    }

    if (appointment.status === 'cancelled') {
      throw new AppError('Appointment is already cancelled', 400);
    }
    if (appointment.status === 'completed') {
      throw new AppError('Cannot cancel an already completed appointment', 400);
    }

    appointment.status = 'cancelled';
    appointment.cancelledAt = new Date();
    appointment.cancelledReason = reason || 'Cancelled by staff';
    appointment.cancelledBy = user._id;
    await appointment.save();

    // ATOMICALLY RELEASE THE SLOT BACK TO AVAILABLE:
    await Slot.findOneAndUpdate(
      { doctorId: appointment.doctorId, startAt: appointment.startAt },
      { $set: { status: 'available', appointmentId: null } }
    );

    await AuditService.log({
      userId: user._id,
      userEmail: user.email,
      role: user.role,
      action: 'APPOINTMENT_CANCELLED',
      entityType: 'Appointment',
      entityId: appointment._id,
      details: { reason: appointment.cancelledReason },
    });

    emitAppointmentEvent('appointment:cancelled', {
      appointmentId: appointment._id.toString(),
      doctorId: appointment.doctorId.toString(),
      slotTime: appointment.startAt.toISOString(),
    });

    return appointment;
  }

  /**
   * Reschedules or updates an existing appointment
   */
  static async updateAppointment(id, { startAt, endAt, purpose, doctorId, departmentId }, user) {
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    if (['completed', 'cancelled'].includes(appointment.status)) {
      throw new AppError(`Cannot modify appointment with status '${appointment.status}'`, 400);
    }

    const previousDoctorId = appointment.doctorId;
    const previousStartAt = appointment.startAt;

    const newStartAt = startAt ? new Date(startAt) : appointment.startAt;
    const newEndAt = endAt ? new Date(endAt) : appointment.endAt;
    const newDoctorId = doctorId || appointment.doctorId;
    const newDepartmentId = departmentId || appointment.departmentId;

    const isSlotChanged =
      newStartAt.getTime() !== previousStartAt.getTime() ||
      newDoctorId.toString() !== previousDoctorId.toString();

    if (isSlotChanged) {
      if (isPastTime(newStartAt)) {
        throw new AppError('Cannot reschedule appointment to past date/time', 400);
      }

      // Reserve new slot atomically
      let newSlot = await Slot.findOneAndUpdate(
        { doctorId: newDoctorId, startAt: newStartAt, status: 'available' },
        { $set: { status: 'booked', endAt: newEndAt } },
        { new: true }
      );

      if (!newSlot) {
        try {
          newSlot = await Slot.create({
            doctorId: newDoctorId,
            startAt: newStartAt,
            endAt: newEndAt,
            status: 'booked',
          });
        } catch (err) {
          if (err.code === 11000) {
            throw new AppError('New slot is already booked. Please choose another time.', 409);
          }
          throw err;
        }
      }

      // Release old slot
      await Slot.findOneAndUpdate(
        { doctorId: previousDoctorId, startAt: previousStartAt },
        { $set: { status: 'available', appointmentId: null } }
      );

      newSlot.appointmentId = appointment._id;
      await newSlot.save();

      appointment.doctorId = newDoctorId;
      appointment.startAt = newStartAt;
      appointment.endAt = newEndAt;
    }

    if (purpose) appointment.purpose = purpose;
    if (newDepartmentId) appointment.departmentId = newDepartmentId;

    await appointment.save();

    await AuditService.log({
      userId: user._id,
      userEmail: user.email,
      role: user.role,
      action: 'APPOINTMENT_UPDATED',
      entityType: 'Appointment',
      entityId: appointment._id,
      details: { startAt: appointment.startAt, isSlotChanged },
    });

    const populated = await Appointment.findById(id)
      .populate('patientId')
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email' },
      })
      .populate('departmentId');

    emitAppointmentEvent('appointment:updated', {
      appointment: populated,
      doctorId: appointment.doctorId.toString(),
    });

    return populated;
  }

  /**
   * Aggregates dashboard analytics
   */
  static async getDashboardStats(user) {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setUTCHours(23, 59, 59, 999);

    const matchStage = {};

    if (user.role === 'doctor') {
      const doctorProfile = await Doctor.findOne({ userId: user._id });
      if (doctorProfile) {
        matchStage.doctorId = doctorProfile._id;
      }
    }

    const [todayCount, scheduledCount, arrivedCount, completedCount, totalPatients, totalDoctors] =
      await Promise.all([
        Appointment.countDocuments({
          ...matchStage,
          startAt: { $gte: todayStart, $lte: todayEnd },
          status: { $ne: 'cancelled' },
        }),
        Appointment.countDocuments({
          ...matchStage,
          startAt: { $gte: todayStart, $lte: todayEnd },
          status: 'scheduled',
        }),
        Appointment.countDocuments({
          ...matchStage,
          startAt: { $gte: todayStart, $lte: todayEnd },
          status: 'arrived',
        }),
        Appointment.countDocuments({
          ...matchStage,
          startAt: { $gte: todayStart, $lte: todayEnd },
          status: 'completed',
        }),
        Patient.countDocuments({ isActive: true }),
        Doctor.countDocuments({ isActive: true }),
      ]);

    // Fetch upcoming 5 appointments for today
    const upcomingAppointments = await Appointment.find({
      ...matchStage,
      startAt: { $gte: todayStart, $lte: todayEnd },
      status: { $in: ['scheduled', 'arrived'] },
    })
      .populate('patientId', 'name mobile patientId gender')
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name' },
      })
      .populate('departmentId', 'name')
      .sort({ startAt: 1 })
      .limit(5);

    return {
      todayCount,
      scheduledCount,
      arrivedCount,
      completedCount,
      totalPatients,
      totalDoctors,
      upcomingAppointments,
    };
  }
}

module.exports = AppointmentService;
