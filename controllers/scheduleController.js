const ScheduleService = require('../services/scheduleService');
const ApiResponse = require('../utils/apiResponse');

const getScheduleByDoctor = async (req, res, next) => {
  try {
    const schedule = await ScheduleService.getScheduleByDoctorId(req.params.doctorId);
    return ApiResponse.success(res, 'Doctor schedule retrieved', schedule);
  } catch (error) {
    next(error);
  }
};

const configureSchedule = async (req, res, next) => {
  try {
    const schedule = await ScheduleService.configureSchedule(req.body, req.user);
    return ApiResponse.success(res, 'Schedule configured successfully', schedule);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getScheduleByDoctor,
  configureSchedule,
};
