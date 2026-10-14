const SlotService = require('../services/slotService');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/appError');

const getSlots = async (req, res, next) => {
  try {
    const { doctorId, date } = req.query;

    if (!doctorId || !date) {
      throw new AppError('Both doctorId and date (YYYY-MM-DD) query parameters are required', 400);
    }

    const slotData = await SlotService.getSlotsForDoctorAndDate(doctorId, date);
    return ApiResponse.success(res, 'Slots retrieved successfully', slotData);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSlots,
};
