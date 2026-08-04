import mongoose from 'mongoose';
import { APPLICATION_STATUS } from '../constants/index.js';
import { softDeletePlugin } from './schemas/commonSchemas.js';

const applicationSchema = new mongoose.Schema(
  {
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Worker (User ID) is required'],
      index: true,
    },
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Farmer (User ID) is required'],
      index: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: [true, 'Job ID is required'],
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(APPLICATION_STATUS),
        message: '{VALUE} is not a valid application status',
      },
      default: APPLICATION_STATUS.PENDING,
      index: true,
    },
    coverLetter: {
      type: String,
      trim: true,
      maxlength: [2000, 'Cover letter cannot exceed 2000 characters'],
      default: '',
    },
    expectedJoiningDate: {
      type: Date,
      validate: {
        validator: function (val) {
          return !val || new Date(val) >= new Date().setHours(0, 0, 0, 0);
        },
        message: 'Expected joining date cannot be in the past',
      },
    },
    expectedDailyWage: {
      type: Number,
      min: [0, 'Expected daily wage cannot be negative'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
      default: '',
    },
    farmerFeedback: {
      type: String,
      trim: true,
      maxlength: [1000, 'Farmer feedback cannot exceed 1000 characters'],
      default: '',
    },
    workerFeedback: {
      type: String,
      trim: true,
      maxlength: [1000, 'Worker feedback cannot exceed 1000 characters'],
      default: '',
    },
    shortlisted: {
      type: Boolean,
      default: false,
      index: true,
    },
    interviewDate: {
      type: Date,
    },
    hiredDate: {
      type: Date,
    },
    rejectedDate: {
      type: Date,
    },
    withdrawnDate: {
      type: Date,
    },
    cancelledDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Apply Soft Delete Plugin
applicationSchema.plugin(softDeletePlugin);

// Prevent Duplicate Applications: Unique compound index on (job, worker)
applicationSchema.index({ job: 1, worker: 1 }, { unique: true });

// High-performance compound indexes for application queries & filtering
applicationSchema.index({ farmer: 1, status: 1, isDeleted: 1 });
applicationSchema.index({ worker: 1, status: 1, isDeleted: 1 });
applicationSchema.index({ job: 1, status: 1, isDeleted: 1 });
applicationSchema.index({ farmer: 1, isDeleted: 1, createdAt: -1 });
applicationSchema.index({ worker: 1, isDeleted: 1, createdAt: -1 });
applicationSchema.index({ status: 1, shortlisted: 1, createdAt: -1 });

/**
 * Pre-save Lifecycle Hook: Sync status transition timestamps & flags
 */
applicationSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    const currentStatus = this.status;

    if (currentStatus === APPLICATION_STATUS.SHORTLISTED) {
      this.shortlisted = true;
    } else if (currentStatus === APPLICATION_STATUS.HIRED) {
      if (!this.hiredDate) this.hiredDate = new Date();
    } else if (currentStatus === APPLICATION_STATUS.REJECTED) {
      if (!this.rejectedDate) this.rejectedDate = new Date();
    } else if (currentStatus === APPLICATION_STATUS.WITHDRAWN) {
      if (!this.withdrawnDate) this.withdrawnDate = new Date();
    } else if (currentStatus === APPLICATION_STATUS.CANCELLED) {
      if (!this.cancelledDate) this.cancelledDate = new Date();
    }
  }

  // Keep shortlisted flag in sync if explicitly modified
  if (this.isModified('shortlisted') && this.shortlisted && this.status === APPLICATION_STATUS.PENDING) {
    this.status = APPLICATION_STATUS.SHORTLISTED;
  }

  next();
});

/**
 * Virtual: Check if application is currently active (not terminal state)
 */
applicationSchema.virtual('isActive').get(function () {
  return [
    APPLICATION_STATUS.PENDING,
    APPLICATION_STATUS.SHORTLISTED,
    APPLICATION_STATUS.ACCEPTED,
  ].includes(this.status);
});

export const Application = mongoose.model('Application', applicationSchema);
export default Application;
