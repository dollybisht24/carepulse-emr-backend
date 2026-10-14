const swaggerJsDoc = require('swagger-jsdoc');
const env = require('./env');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Enterprise Hospital Appointment Management System API',
      version: '1.0.0',
      description:
        'Production-grade RESTful API for hospital staff, doctors, and patient appointment management with zero double-booking concurrency guarantees and strict RBAC.',
      contact: {
        name: 'Hospital EMR Team',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}/api/v1`,
        description: 'Local Development Server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT access token',
        },
      },
      schemas: {
        LoginInput: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'admin@hospital.com' },
            password: { type: 'string', example: 'Admin@123' },
          },
        },
        BookAppointmentInput: {
          type: 'object',
          required: ['patientId', 'doctorId', 'departmentId', 'startAt', 'endAt', 'purpose'],
          properties: {
            patientId: { type: 'string', example: '66a1b2c3d4e5f67890123456' },
            doctorId: { type: 'string', example: '66a1b2c3d4e5f67890123457' },
            departmentId: { type: 'string', example: '66a1b2c3d4e5f67890123458' },
            startAt: { type: 'string', format: 'date-time', example: '2026-10-15T09:00:00.000Z' },
            endAt: { type: 'string', format: 'date-time', example: '2026-10-15T09:15:00.000Z' },
            purpose: { type: 'string', example: 'Chest pain and mild shortness of breath' },
          },
        },
      },
    },
    paths: {
      '/auth/login': {
        post: {
          summary: 'User Login',
          tags: ['Authentication'],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginInput' } } },
          },
          responses: {
            200: { description: 'Login successful with JWT access token' },
            401: { description: 'Invalid credentials' },
          },
        },
      },
      '/auth/refresh': {
        post: {
          summary: 'Refresh Access Token',
          tags: ['Authentication'],
          responses: {
            200: { description: 'New access token issued' },
            401: { description: 'Invalid or expired refresh token' },
          },
        },
      },
      '/auth/logout': {
        post: {
          summary: 'Logout and revoke session',
          tags: ['Authentication'],
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: 'Logged out successfully' },
          },
        },
      },
      '/doctors': {
        get: {
          summary: 'List active doctors',
          tags: ['Doctors'],
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'departmentId', in: 'query', schema: { type: 'string' } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'List of doctors' } },
        },
        post: {
          summary: 'Create doctor account (Admin only)',
          tags: ['Doctors'],
          security: [{ BearerAuth: [] }],
          responses: { 201: { description: 'Doctor created' }, 403: { description: 'Forbidden' } },
        },
      },
      '/departments': {
        get: {
          summary: 'List hospital departments',
          tags: ['Departments'],
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'List of departments' } },
        },
      },
      '/schedules/{doctorId}': {
        get: {
          summary: 'Get doctor schedule and working hours',
          tags: ['Schedules'],
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'doctorId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Doctor schedule' } },
        },
      },
      '/schedules': {
        post: {
          summary: 'Configure doctor schedule (Admin only)',
          tags: ['Schedules'],
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Schedule updated' }, 403: { description: 'Forbidden' } },
        },
      },
      '/slots': {
        get: {
          summary: 'Retrieve dynamic slots for doctor and date',
          tags: ['Slots'],
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'doctorId', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'date', in: 'query', required: true, schema: { type: 'string', example: '2026-10-15' } },
          ],
          responses: { 200: { description: 'Generated slots with availability' } },
        },
      },
      '/appointments': {
        get: {
          summary: 'List filtered appointments (Doctor restricted to own)',
          tags: ['Appointments'],
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['scheduled', 'arrived', 'completed', 'cancelled'] } },
            { name: 'doctorId', in: 'query', schema: { type: 'string' } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Paginated appointments list' } },
        },
        post: {
          summary: 'Book appointment with atomic concurrency guard',
          tags: ['Appointments'],
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/BookAppointmentInput' } } },
          },
          responses: {
            201: { description: 'Appointment booked successfully' },
            409: { description: 'Conflict: slot already booked' },
          },
        },
      },
      '/appointments/{id}/arrive': {
        post: {
          summary: 'Mark patient as arrived',
          tags: ['Appointments'],
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Status updated to arrived' } },
        },
      },
      '/appointments/{id}/complete': {
        post: {
          summary: 'Complete appointment & add consultation notes (Doctor/Admin)',
          tags: ['Appointments'],
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Appointment completed' } },
        },
      },
      '/appointments/{id}': {
        delete: {
          summary: 'Cancel appointment and release slot reservation',
          tags: ['Appointments'],
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Appointment cancelled and slot released' } },
        },
      },
      '/patients/search': {
        get: {
          summary: 'Search patients by name, mobile, or ID',
          tags: ['Patients'],
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'q', in: 'query', schema: { type: 'string' } }],
          responses: { 200: { description: 'Matching patients' } },
        },
      },
      '/patients': {
        post: {
          summary: 'Register new patient',
          tags: ['Patients'],
          security: [{ BearerAuth: [] }],
          responses: { 201: { description: 'Patient registered' } },
        },
      },
      '/audit-logs': {
        get: {
          summary: 'View audit logs (Admin only)',
          tags: ['Audit Logs'],
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Paginated audit logs' }, 403: { description: 'Forbidden' } },
        },
      },
    },
  },
  apis: [],
};

const swaggerSpec = swaggerJsDoc(swaggerOptions);
module.exports = swaggerSpec;
