const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/rbacMiddleware');

// Audit logs viewable only by Admin
router.get('/', authenticate, authorizeRoles('admin'), auditController.getAuditLogs);

module.exports = router;
