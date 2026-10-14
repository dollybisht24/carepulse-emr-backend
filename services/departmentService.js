const { Department } = require('../models');
const AppError = require('../utils/appError');

class DepartmentService {
  static async getAll() {
    return Department.find({ isActive: true }).sort({ name: 1 });
  }

  static async getById(id) {
    const dept = await Department.findById(id);
    if (!dept) throw new AppError('Department not found', 404);
    return dept;
  }

  static async create({ name, description }) {
    const existing = await Department.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) {
      throw new AppError('A department with this name already exists', 400);
    }
    return Department.create({ name, description });
  }
}

module.exports = DepartmentService;
