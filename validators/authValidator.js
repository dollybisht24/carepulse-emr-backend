const { z } = require('zod');

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Please enter a valid email address').trim().toLowerCase(),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
  }),
});

const refreshSchema = z.object({
  body: z
    .object({
      refreshToken: z.string().optional(),
    })
    .optional(),
});

module.exports = {
  loginSchema,
  refreshSchema,
};
