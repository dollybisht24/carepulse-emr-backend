const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/rbacMiddleware');
const validate = require('../middlewares/validateMiddleware');
const { configureScheduleSchema } = require('../validators/scheduleValidator');

// Any authenticated staff can view schedule
router.get('/:doctorId', authenticate, scheduleController.getScheduleByDoctor);

// Admin only: configure schedule
router.post(
  '/',
  authenticate,
  authorizeRoles('admin'),
  validate(configureScheduleSchema),
  scheduleController.configureSchedule
);

router.put(
  '/:id',
  authenticate,
  authorizeRoles('admin'),
  validate(configureScheduleSchema),
  scheduleController.configureSchedule
);

module.exports = router;
