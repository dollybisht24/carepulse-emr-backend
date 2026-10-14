const { Schedule, Slot, Doctor } = require('../models');
const AppError = require('../utils/appError');
const {
  timeStringToMinutes,
  minutesToTimeString,
  doesSlotOverlapBreak,
  combineDateAndTime,
  getDayOfWeek,
  isPastTime,
} = require('../utils/dateUtils');

class SlotService {
  /**
   * Generates dynamic appointment slots for a given doctor on a given date
   * @param {string} doctorId - Doctor MongoDB ID
   * @param {string} dateStr - Date formatted as YYYY-MM-DD
   */
  static async getSlotsForDoctorAndDate(doctorId, dateStr) {
    // 1. Verify doctor exists
    const doctor = await Doctor.findById(doctorId).populate('userId', 'name').populate('departmentId', 'name');
    if (!doctor) {
      throw new AppError('Doctor not found', 404);
    }

    // 2. Fetch doctor's schedule
    const schedule = await Schedule.findOne({ doctorId, isActive: true });
    if (!schedule) {
      return {
        doctor: {
          id: doctor._id,
          name: doctor.userId?.name,
          specialization: doctor.specialization,
          department: doctor.departmentId?.name,
        },
        date: dateStr,
        isWorkingDay: false,
        message: 'No active schedule configured for this doctor',
        slots: [],
        breaks: [],
      };
    }

    // 3. Check if doctor works on the day of week
    const targetDate = new Date(`${dateStr}T00:00:00.000Z`);
    const dayOfWeek = getDayOfWeek(targetDate);

    if (!schedule.workingDays.includes(dayOfWeek)) {
      return {
        doctor: {
          id: doctor._id,
          name: doctor.userId?.name,
          specialization: doctor.specialization,
          department: doctor.departmentId?.name,
        },
        date: dateStr,
        isWorkingDay: false,
        message: 'Doctor is off-duty on this day of the week',
        slots: [],
        breaks: [],
      };
    }

    // 4. Determine start and end of target day in UTC
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

    // 5. Query already booked / reserved slots from the database
    const existingSlots = await Slot.find({
      doctorId,
      startAt: { $gte: startOfDay, $lte: endOfDay },
    }).lean();

    // Create a lookup map by ISO startAt string
    const reservedSlotMap = new Map();
    for (const slot of existingSlots) {
      reservedSlotMap.set(new Date(slot.startAt).toISOString(), slot);
    }

    const slotDuration = schedule.slotDuration || 15;
    const generatedSlots = [];

    // Parse break intervals in minutes
    const breakIntervals = (schedule.breaks || []).map((b) => ({
      name: b.breakName,
      startMin: timeStringToMinutes(b.startTime),
      endMin: timeStringToMinutes(b.endTime),
      startTime: b.startTime,
      endTime: b.endTime,
    }));

    // 6. Generate slots across each session
    for (const session of schedule.sessions) {
      const sessionStartMin = timeStringToMinutes(session.startTime);
      const sessionEndMin = timeStringToMinutes(session.endTime);

      let currentMin = sessionStartMin;
      while (currentMin + slotDuration <= sessionEndMin) {
        const slotStartMin = currentMin;
        const slotEndMin = currentMin + slotDuration;

        // Check if slot overlaps any break period
        const overlapsBreak = breakIntervals.some((b) =>
          doesSlotOverlapBreak(slotStartMin, slotEndMin, b.startMin, b.endMin)
        );

        if (!overlapsBreak) {
          const startTimeStr = minutesToTimeString(slotStartMin);
          const endTimeStr = minutesToTimeString(slotEndMin);

          const startAtDate = combineDateAndTime(dateStr, startTimeStr);
          const endAtDate = combineDateAndTime(dateStr, endTimeStr);
          const isoKey = startAtDate.toISOString();

          let status = 'available';
          let appointmentId = null;

          // Check against reserved slots in DB
          if (reservedSlotMap.has(isoKey)) {
            const reserved = reservedSlotMap.get(isoKey);
            status = reserved.status; // 'booked' or 'blocked'
            appointmentId = reserved.appointmentId || null;
          } else if (isPastTime(startAtDate)) {
            // Slots earlier than right now are past
            status = 'past';
          }

          generatedSlots.push({
            startAt: startAtDate.toISOString(),
            endAt: endAtDate.toISOString(),
            startTimeString: startTimeStr,
            endTimeString: endTimeStr,
            sessionName: session.sessionName,
            status, // 'available' | 'booked' | 'blocked' | 'past'
            appointmentId,
          });
        }

        currentMin += slotDuration;
      }
    }

    return {
      doctor: {
        id: doctor._id,
        name: doctor.userId?.name,
        specialization: doctor.specialization,
        department: doctor.departmentId?.name,
      },
      date: dateStr,
      isWorkingDay: true,
      slotDuration,
      breaks: schedule.breaks,
      totalSlots: generatedSlots.length,
      availableSlotsCount: generatedSlots.filter((s) => s.status === 'available').length,
      bookedSlotsCount: generatedSlots.filter((s) => s.status === 'booked').length,
      slots: generatedSlots,
    };
  }
}

module.exports = SlotService;
