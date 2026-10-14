const DepartmentService = require('../services/departmentService');
const ApiResponse = require('../utils/apiResponse');

const getDepartments = async (req, res, next) => {
  try {
    const departments = await DepartmentService.getAll();
    return ApiResponse.success(res, 'Departments retrieved successfully', departments);
  } catch (error) {
    next(error);
  }
};

const createDepartment = async (req, res, next) => {
  try {
    const department = await DepartmentService.create(req.body);
    return ApiResponse.created(res, 'Department created successfully', department);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDepartments,
  createDepartment,
};
