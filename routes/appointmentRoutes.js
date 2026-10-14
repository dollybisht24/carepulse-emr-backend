const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/rbacMiddleware');
const validate = require('../middlewares/validateMiddleware');
const {
  bookAppointmentSchema,
  updateAppointmentSchema,
  cancelAppointmentSchema,
  completeAppointmentSchema,
} = require('../validators/appointmentValidator');

// Dashboard statistics
router.get('/stats', authenticate, appointmentController.getDashboardStats);

// List appointments (role scoping applied in service)
router.get('/', authenticate, appointmentController.listAppointments);

// Get single appointment
router.get('/:id', authenticate, appointmentController.getAppointmentById);

// Book appointment: Receptionist and Admin
router.post(
  '/',
  authenticate,
  authorizeRoles('admin', 'receptionist'),
  validate(bookAppointmentSchema),
  appointmentController.bookAppointment
);

// Reschedule / update appointment: Receptionist and Admin
router.put(
  '/:id',
  authenticate,
  authorizeRoles('admin', 'receptionist'),
  validate(updateAppointmentSchema),
  appointmentController.updateAppointment
);

// Cancel appointment: Receptionist, Admin, Doctor
router.delete(
  '/:id',
  authenticate,
  authorizeRoles('admin', 'receptionist', 'doctor'),
  validate(cancelAppointmentSchema),
  appointmentController.cancelAppointment
);

// Mark arrived: Receptionist and Admin
router.post(
  '/:id/arrive',
  authenticate,
  authorizeRoles('admin', 'receptionist'),
  appointmentController.markArrived
);

// Complete appointment with consultation notes: Doctor and Admin
router.post(
  '/:id/complete',
  authenticate,
  authorizeRoles('admin', 'doctor'),
  validate(completeAppointmentSchema),
  appointmentController.completeAppointment
);

module.exports = router;
