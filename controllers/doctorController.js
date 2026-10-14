const DoctorService = require('../services/doctorService');
const ApiResponse = require('../utils/apiResponse');

const getDoctors = async (req, res, next) => {
  try {
    const { departmentId, search } = req.query;
    const doctors = await DoctorService.getAll({ departmentId, search });
    return ApiResponse.success(res, 'Doctors retrieved successfully', doctors);
  } catch (error) {
    next(error);
  }
};

const getDoctorById = async (req, res, next) => {
  try {
    const doctor = await DoctorService.getById(req.params.id);
    return ApiResponse.success(res, 'Doctor retrieved successfully', doctor);
  } catch (error) {
    next(error);
  }
};

const createDoctor = async (req, res, next) => {
  try {
    const doctor = await DoctorService.createDoctor(req.body, req.user);
    return ApiResponse.created(res, 'Doctor created successfully', doctor);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDoctors,
  getDoctorById,
  createDoctor,
};
