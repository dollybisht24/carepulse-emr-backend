const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient ID is required'],
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor ID is required'],
      index: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department ID is required'],
      index: true,
    },
    startAt: {
      type: Date,
      required: [true, 'Appointment start time is required'],
    },
    endAt: {
      type: Date,
      required: [true, 'Appointment end time is required'],
    },
    status: {
      type: String,
      enum: ['scheduled', 'arrived', 'completed', 'cancelled'],
      default: 'scheduled',
      index: true,
    },
    purpose: {
      type: String,
      required: [true, 'Purpose of appointment is required'],
      trim: true,
    },
    consultationNotes: {
      type: String,
      default: '',
      trim: true,
    },
    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    arrivedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelledReason: {
      type: String,
      default: null,
      trim: true,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Performance compound indexes justified by access patterns
appointmentSchema.index({ doctorId: 1, startAt: 1 });
appointmentSchema.index({ departmentId: 1, startAt: 1 });
appointmentSchema.index({ status: 1, startAt: 1 });
appointmentSchema.index({ patientId: 1, startAt: -1 });
appointmentSchema.index({ startAt: 1, status: 1 });

const Appointment = mongoose.model('Appointment', appointmentSchema);
module.exports = Appointment;
