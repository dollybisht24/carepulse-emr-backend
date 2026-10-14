const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/rbacMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { createDoctorSchema } = require('../validators/doctorValidator');

// Public/authenticated: list doctors
router.get('/', authenticate, doctorController.getDoctors);
router.get('/:id', authenticate, doctorController.getDoctorById);

// Admin only: create doctor account & profile
router.post(
  '/',
  authenticate,
  authorizeRoles('admin'),
  validate(createDoctorSchema),
  doctorController.createDoctor
);

module.exports = router;
