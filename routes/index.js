const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const doctorRoutes = require('./doctorRoutes');
const departmentRoutes = require('./departmentRoutes');
const scheduleRoutes = require('./scheduleRoutes');
const slotRoutes = require('./slotRoutes');
const appointmentRoutes = require('./appointmentRoutes');
const patientRoutes = require('./patientRoutes');
const auditRoutes = require('./auditRoutes');

// Mount sub-routes
router.use('/auth', authRoutes);
router.use('/doctors', doctorRoutes);
router.use('/departments', departmentRoutes);
router.use('/schedules', scheduleRoutes);
router.use('/slots', slotRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/patients', patientRoutes);
router.use('/audit-logs', auditRoutes);

module.exports = router;
