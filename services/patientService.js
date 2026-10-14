const { Patient, Appointment } = require('../models');
const AppError = require('../utils/appError');
const AuditService = require('./auditService');

class PatientService {
  /**
   * Generates next sequential / timestamp-based patient ID (e.g. PAT-2026-1001)
   */
  static async generatePatientId() {
    const count = await Patient.countDocuments();
    const currentYear = new Date().getFullYear();
    const sequence = String(count + 1).padStart(4, '0');
    return `PAT-${currentYear}-${sequence}`;
  }

  /**
   * Searches patients by query string (name, mobile, or patient ID)
   */
  static async search(searchQuery) {
    if (!searchQuery || searchQuery.trim().length === 0) {
      // Return latest 10 patients
      return Patient.find({ isActive: true }).sort({ createdAt: -1 }).limit(10);
    }

    const cleanQuery = searchQuery.trim();
    const regex = new RegExp(cleanQuery, 'i');

    return Patient.find({
      isActive: true,
      $or: [{ name: regex }, { mobile: regex }, { patientId: regex }],
    })
      .limit(20)
      .sort({ name: 1 });
  }

  /**
   * Retrieves single patient with appointment history
   */
  static async getById(id) {
    const patient = await Patient.findById(id);
    if (!patient) {
      throw new AppError('Patient not found', 404);
    }

    const appointments = await Appointment.find({ patientId: id })
      .populate('doctorId')
      .populate('departmentId')
      .sort({ startAt: -1 })
      .limit(10);

    return { patient, appointments };
  }

  /**
   * Registers a new patient
   */
  static async createPatient(
    { name, mobile, gender, dateOfBirth, bloodGroup, address, emergencyContact },
    user
  ) {
    // Check if patient with exact mobile already exists
    const existing = await Patient.findOne({ mobile: mobile.trim() });
    if (existing) {
      throw new AppError(
        `A patient with mobile number ${mobile} is already registered (${existing.name}, ID: ${existing.patientId})`,
        400
      );
    }

    const patientId = await this.generatePatientId();

    const patient = await Patient.create({
      patientId,
      name: name.trim(),
      mobile: mobile.trim(),
      gender,
      dateOfBirth: new Date(dateOfBirth),
      bloodGroup: bloodGroup || 'Unknown',
      address: address || '',
      emergencyContact: emergencyContact || '',
    });

    await AuditService.log({
      userId: user._id,
      userEmail: user.email,
      role: user.role,
      action: 'PATIENT_REGISTERED',
      entityType: 'Patient',
      entityId: patient._id,
      details: { patientId, name: patient.name, mobile: patient.mobile },
    });

    return patient;
  }
}

module.exports = PatientService;
