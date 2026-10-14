const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/rbacMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { createPatientSchema } = require('../validators/patientValidator');

// Search patients: Admin and Receptionist (and Doctor viewing patients)
router.get('/search', authenticate, patientController.searchPatients);
router.get('/:id', authenticate, patientController.getPatientById);

// Register patient: Admin and Receptionist
router.post(
  '/',
  authenticate,
  authorizeRoles('admin', 'receptionist'),
  validate(createPatientSchema),
  patientController.createPatient
);

module.exports = router;
