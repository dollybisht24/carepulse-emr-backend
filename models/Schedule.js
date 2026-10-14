const mongoose = require('mongoose');

const sessionSubSchema = new mongoose.Schema(
  {
    sessionName: {
      type: String,
      required: true,
      trim: true,
      default: 'Regular Session',
    },
    startTime: {
      type: String,
      required: [true, 'Session start time is required (HH:mm)'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)'],
    },
    endTime: {
      type: String,
      required: [true, 'Session end time is required (HH:mm)'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)'],
    },
  },
  { _id: false }
);

const breakSubSchema = new mongoose.Schema(
  {
    breakName: {
      type: String,
      required: true,
      trim: true,
      default: 'Lunch Break',
    },
    startTime: {
      type: String,
      required: [true, 'Break start time is required (HH:mm)'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)'],
    },
    endTime: {
      type: String,
      required: [true, 'Break end time is required (HH:mm)'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)'],
    },
  },
  { _id: false }
);

const scheduleSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor ID is required'],
      index: true,
    },
    workingDays: {
      type: [Number], // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      required: [true, 'Working days are required'],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0 && v.every((d) => d >= 0 && d <= 6);
        },
        message: 'Working days must be an array of integers between 0 and 6',
      },
    },
    sessions: {
      type: [sessionSubSchema],
      required: [true, 'At least one working session is required'],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'At least one working session must be provided',
      },
    },
    breaks: {
      type: [breakSubSchema],
      default: [],
    },
    slotDuration: {
      type: Number,
      required: [true, 'Slot duration in minutes is required'],
      min: [5, 'Slot duration must be at least 5 minutes'],
      max: [120, 'Slot duration cannot exceed 120 minutes'],
      default: 15,
    },
    effectiveFrom: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for active doctor schedule queries
scheduleSchema.index({ doctorId: 1, isActive: 1 });

const Schedule = mongoose.model('Schedule', scheduleSchema);
module.exports = Schedule;
