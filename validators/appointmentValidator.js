const { z } = require('zod');

const bookAppointmentSchema = z.object({
  body: z.object({
    patientId: z.string().min(1, 'Patient ID is required'),
    doctorId: z.string().min(1, 'Doctor ID is required'),
    departmentId: z.string().min(1, 'Department ID is required'),
    startAt: z.string().datetime({ message: 'startAt must be a valid ISO 8601 datetime string' }),
    endAt: z.string().datetime({ message: 'endAt must be a valid ISO 8601 datetime string' }),
    purpose: z.string().min(3, 'Purpose must be at least 3 characters').max(500),
  }),
});

const updateAppointmentSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Appointment ID is required'),
  }),
  body: z.object({
    doctorId: z.string().optional(),
    departmentId: z.string().optional(),
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    purpose: z.string().min(3).max(500).optional(),
  }),
});

const cancelAppointmentSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Appointment ID is required'),
  }),
  body: z.object({
    reason: z.string().min(3, 'Cancellation reason must be provided').max(300).optional(),
  }),
});

const completeAppointmentSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Appointment ID is required'),
  }),
  body: z.object({
    consultationNotes: z.string().max(2000).optional(),
  }),
});

module.exports = {
  bookAppointmentSchema,
  updateAppointmentSchema,
  cancelAppointmentSchema,
  completeAppointmentSchema,
};
