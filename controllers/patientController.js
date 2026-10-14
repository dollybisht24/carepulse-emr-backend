const PatientService = require('../services/patientService');
const ApiResponse = require('../utils/apiResponse');

const searchPatients = async (req, res, next) => {
  try {
    const { q } = req.query;
    const patients = await PatientService.search(q);
    return ApiResponse.success(res, 'Patients retrieved successfully', patients);
  } catch (error) {
    next(error);
  }
};

const getPatientById = async (req, res, next) => {
  try {
    const data = await PatientService.getById(req.params.id);
    return ApiResponse.success(res, 'Patient retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

const createPatient = async (req, res, next) => {
  try {
    const patient = await PatientService.createPatient(req.body, req.user);
    return ApiResponse.created(res, 'Patient registered successfully', patient);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchPatients,
  getPatientById,
  createPatient,
};
