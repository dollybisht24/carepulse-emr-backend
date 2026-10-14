const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/rbacMiddleware');

router.get('/', authenticate, departmentController.getDepartments);
router.post('/', authenticate, authorizeRoles('admin'), departmentController.createDepartment);

module.exports = router;
