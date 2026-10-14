const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor ID is required'],
    },
    startAt: {
      type: Date,
      required: [true, 'Slot start time is required'],
    },
    endAt: {
      type: Date,
      required: [true, 'Slot end time is required'],
    },
    status: {
      type: String,
      enum: ['available', 'booked', 'blocked'],
      default: 'available',
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// CRITICAL UNIQUE COMPOUND INDEX:
// Guarantees at database level that no doctor can ever have duplicate slot entries
// for the exact same start time.
slotSchema.index({ doctorId: 1, startAt: 1 }, { unique: true });

// Query index for checking availability across dates
slotSchema.index({ doctorId: 1, status: 1, startAt: 1 });

const Slot = mongoose.model('Slot', slotSchema);
module.exports = Slot;
