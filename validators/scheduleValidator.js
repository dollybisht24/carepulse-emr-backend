const { z } = require('zod');

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const sessionSchema = z.object({
  sessionName: z.string().min(1, 'Session name is required'),
  startTime: z.string().regex(timeRegex, 'Start time must be HH:mm (e.g. 09:00)'),
  endTime: z.string().regex(timeRegex, 'End time must be HH:mm (e.g. 12:00)'),
});

const breakSchema = z.object({
  breakName: z.string().min(1, 'Break name is required'),
  startTime: z.string().regex(timeRegex, 'Start time must be HH:mm (e.g. 12:00)'),
  endTime: z.string().regex(timeRegex, 'End time must be HH:mm (e.g. 13:00)'),
});

const configureScheduleSchema = z.object({
  body: z.object({
    doctorId: z.string().min(1, 'Doctor ID is required'),
    workingDays: z
      .array(z.number().int().min(0).max(6))
      .min(1, 'At least one working day must be selected (0=Sun, 6=Sat)'),
    sessions: z.array(sessionSchema).min(1, 'At least one working session is required'),
    breaks: z.array(breakSchema).optional().default([]),
    slotDuration: z.number().int().min(5).max(120).default(15),
  }),
});

module.exports = {
  configureScheduleSchema,
};
