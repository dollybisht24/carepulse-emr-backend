const { z } = require('zod');

const createDoctorSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Doctor name must be at least 2 characters').max(100),
    email: z.string().email('Please enter a valid email address').toLowerCase(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    departmentId: z.string().min(1, 'Department ID is required'),
    specialization: z.string().min(2, 'Specialization is required'),
    roomNumber: z.string().optional().default('OPD-101'),
    consultationFee: z.number().min(0).optional().default(500),
  }),
});

module.exports = {
  createDoctorSchema,
};
