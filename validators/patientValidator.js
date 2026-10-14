const { z } = require('zod');

const createPatientSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    mobile: z.string().min(8, 'Mobile number must be at least 8 digits').max(15),
    gender: z.enum(['male', 'female', 'other']),
    dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date of birth format',
    }),
    bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown']).optional(),
    address: z.string().optional(),
    emergencyContact: z.string().optional(),
  }),
});

module.exports = {
  createPatientSchema,
};
