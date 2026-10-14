const { Schedule, Doctor } = require('../models');
const AppError = require('../utils/appError');
const AuditService = require('./auditService');
const { timeStringToMinutes } = require('../utils/dateUtils');

class ScheduleService {
  /**
   * Retrieves active schedule for a doctor
   */
  static async getScheduleByDoctorId(doctorId) {
    const schedule = await Schedule.findOne({ doctorId, isActive: true });
    return schedule;
  }

  /**
   * Validates sessions and breaks logic
   */
  static validateScheduleTiming(sessions, breaks, slotDuration) {
    if (!sessions || sessions.length === 0) {
      throw new AppError('At least one working session must be defined', 400);
    }

    // Check each session validity
    for (const session of sessions) {
      const startMin = timeStringToMinutes(session.startTime);
      const endMin = timeStringToMinutes(session.endTime);
      if (startMin >= endMin) {
        throw new AppError(`Session '${session.sessionName}' start time must be before end time`, 400);
      }
      if (endMin - startMin < slotDuration) {
        throw new AppError(
          `Session '${session.sessionName}' duration must be greater than or equal to slot duration (${slotDuration} mins)`,
          400
        );
      }
    }

    // Check breaks
    if (breaks && breaks.length > 0) {
      for (const brk of breaks) {
        const breakStart = timeStringToMinutes(brk.startTime);
        const breakEnd = timeStringToMinutes(brk.endTime);
        if (breakStart >= breakEnd) {
          throw new AppError(`Break '${brk.breakName}' start time must be before end time`, 400);
        }
      }
    }
  }

  /**
   * Creates or updates a doctor's schedule (Admin only)
   */
  static async configureSchedule(
    { doctorId, workingDays, sessions, breaks = [], slotDuration = 15 },
    adminUser
  ) {
    // 1. Verify doctor exists
    const doctor = await Doctor.findById(doctorId).populate('userId', 'name');
    if (!doctor) {
      throw new AppError('Doctor not found', 404);
    }

    // 2. Validate timing constraints
    this.validateScheduleTiming(sessions, breaks, slotDuration);

    // 3. Upsert or update active schedule
    let schedule = await Schedule.findOne({ doctorId, isActive: true });

    if (schedule) {
      schedule.workingDays = workingDays;
      schedule.sessions = sessions;
      schedule.breaks = breaks;
      schedule.slotDuration = slotDuration;
      await schedule.save();
    } else {
      schedule = await Schedule.create({
        doctorId,
        workingDays,
        sessions,
        breaks,
        slotDuration,
      });
    }

    // 4. Audit Log
    await AuditService.log({
      userId: adminUser._id,
      userEmail: adminUser.email,
      role: adminUser.role,
      action: 'SCHEDULE_CONFIGURED',
      entityType: 'Schedule',
      entityId: schedule._id,
      details: { doctorName: doctor.userId?.name, workingDays, slotDuration },
    });

    return schedule;
  }
}

module.exports = ScheduleService;
