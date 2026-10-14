const { User, Doctor, Department } = require('../models');
const AppError = require('../utils/appError');
const AuditService = require('./auditService');

class DoctorService {
  /**
   * Retrieves doctors list with optional department filter and search
   */
  static async getAll({ departmentId, search } = {}) {
    const query = { isActive: true };

    if (departmentId) {
      query.departmentId = departmentId;
    }

    let doctors = await Doctor.find(query)
      .populate('userId', 'name email role')
      .populate('departmentId', 'name description')
      .lean();

    if (search) {
      const term = search.toLowerCase();
      doctors = doctors.filter(
        (doc) =>
          doc.userId?.name?.toLowerCase().includes(term) ||
          doc.specialization?.toLowerCase().includes(term) ||
          doc.departmentId?.name?.toLowerCase().includes(term)
      );
    }

    return doctors;
  }

  /**
   * Retrieves a single doctor by doctorId
   */
  static async getById(id) {
    const doctor = await Doctor.findById(id)
      .populate('userId', 'name email role')
      .populate('departmentId', 'name description');

    if (!doctor) {
      throw new AppError('Doctor not found', 404);
    }
    return doctor;
  }

  /**
   * Creates a new doctor account and associated doctor profile (Admin only)
   */
  static async createDoctor(
    { name, email, password, departmentId, specialization, roomNumber, consultationFee },
    adminUser
  ) {
    // 1. Verify department exists
    const dept = await Department.findById(departmentId);
    if (!dept) {
      throw new AppError('Department not found', 404);
    }

    // 2. Check email uniqueness
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new AppError('A user with this email address already exists', 400);
    }

    // 3. Hash password and create User
    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: 'doctor',
    });

    // 4. Create Doctor Profile
    const doctor = await Doctor.create({
      userId: user._id,
      departmentId,
      specialization,
      roomNumber: roomNumber || 'OPD-101',
      consultationFee: consultationFee || 500,
    });

    // 5. Audit Log
    await AuditService.log({
      userId: adminUser._id,
      userEmail: adminUser.email,
      role: adminUser.role,
      action: 'DOCTOR_CREATED',
      entityType: 'Doctor',
      entityId: doctor._id,
      details: { doctorName: name, email, department: dept.name, specialization },
    });

    return await Doctor.findById(doctor._id)
      .populate('userId', 'name email role')
      .populate('departmentId', 'name description');
  }
}

module.exports = DoctorService;
