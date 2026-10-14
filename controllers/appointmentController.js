const AppointmentService = require('../services/appointmentService');
const ApiResponse = require('../utils/apiResponse');

const bookAppointment = async (req, res, next) => {
  try {
    const appointment = await AppointmentService.bookAppointment({
      ...req.body,
      user: req.user,
    });
    return ApiResponse.created(res, 'Appointment booked successfully', appointment);
  } catch (error) {
    next(error);
  }
};

const listAppointments = async (req, res, next) => {
  try {
    const result = await AppointmentService.listAppointments(req.query, req.user);
    return ApiResponse.success(
      res,
      'Appointments retrieved successfully',
      result.appointments,
      200,
      result.meta
    );
  } catch (error) {
    next(error);
  }
};

const getAppointmentById = async (req, res, next) => {
  try {
    const appointment = await AppointmentService.getById(req.params.id, req.user);
    return ApiResponse.success(res, 'Appointment retrieved successfully', appointment);
  } catch (error) {
    next(error);
  }
};

const updateAppointment = async (req, res, next) => {
  try {
    const appointment = await AppointmentService.updateAppointment(
      req.params.id,
      req.body,
      req.user
    );
    return ApiResponse.success(res, 'Appointment updated successfully', appointment);
  } catch (error) {
    next(error);
  }
};

const cancelAppointment = async (req, res, next) => {
  try {
    const appointment = await AppointmentService.cancelAppointment(
      req.params.id,
      req.body.reason,
      req.user
    );
    return ApiResponse.success(res, 'Appointment cancelled successfully', appointment);
  } catch (error) {
    next(error);
  }
};

const markArrived = async (req, res, next) => {
  try {
    const appointment = await AppointmentService.markArrived(req.params.id, req.user);
    return ApiResponse.success(res, 'Patient marked as arrived', appointment);
  } catch (error) {
    next(error);
  }
};

const completeAppointment = async (req, res, next) => {
  try {
    const appointment = await AppointmentService.completeAppointment(
      req.params.id,
      req.body.consultationNotes,
      req.user
    );
    return ApiResponse.success(res, 'Appointment marked as completed', appointment);
  } catch (error) {
    next(error);
  }
};

const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await AppointmentService.getDashboardStats(req.user);
    return ApiResponse.success(res, 'Dashboard statistics retrieved', stats);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  bookAppointment,
  listAppointments,
  getAppointmentById,
  updateAppointment,
  cancelAppointment,
  markArrived,
  completeAppointment,
  getDashboardStats,
};
