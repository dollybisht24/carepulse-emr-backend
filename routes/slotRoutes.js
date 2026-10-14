const express = require('express');
const router = express.Router();
const slotController = require('../controllers/slotController');
const { authenticate } = require('../middlewares/authMiddleware');

// Get slots for doctor and date
router.get('/', authenticate, slotController.getSlots);

module.exports = router;
