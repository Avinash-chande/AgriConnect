import mongoose from 'mongoose';
import { REPORT_STATUS, REPORT_CATEGORY, REPORT_PRIORITY } from '../constants/index.js';
import { softDeletePlugin } from './schemas/commonSchemas.js';

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reporter (User ID) is required'],
      index: true,
    },
    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    reportedJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      default: null,
    },
    reportedApplication: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      default: null,
    },
    reportedCertificate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CertificateVerification',
      default: null,
    },
    category: {
      type: String,
      enum: {
        values: Object.values(REPORT_CATEGORY),
        message: '{VALUE} is not a valid report category',
      },
      required: [true, 'Report category is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Report title is required'],
      trim: true,
      minlength: [3, 'Report title must be at least 3 characters'],
      maxlength: [200, 'Report title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Report description is required'],
      trim: true,
      maxlength: [3000, 'Report description cannot exceed 3000 characters'],
    },
    evidence: {
      type: [String],
      default: [],
      validate: {
        validator: function (val) {
          return val.length <= 10;
        },
        message: 'Maximum 10 evidence files allowed per report',
      },
    },
    status: {
      type: String,
      enum: {
        values: Object.values(REPORT_STATUS),
        message: '{VALUE} is not a valid report status',
      },
      default: REPORT_STATUS.PENDING,
      index: true,
    },
    priority: {
      type: String,
      enum: {
        values: Object.values(REPORT_PRIORITY),
        message: '{VALUE} is not a valid priority level',
      },
      default: REPORT_PRIORITY.MEDIUM,
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    resolution: {
      type: String,
      trim: true,
      maxlength: [3000, 'Resolution notes cannot exceed 3000 characters'],
      default: '',
    },
    internalNotes: {
      type: String,
      trim: true,
      maxlength: [3000, 'Internal notes cannot exceed 3000 characters'],
      default: '',
      select: false, // Hidden by default from normal user queries!
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Apply Soft Delete Plugin
reportSchema.plugin(softDeletePlugin);

// Compound indexes for admin queries
reportSchema.index({ status: 1, priority: -1, createdAt: -1 });
reportSchema.index({ assignedTo: 1, status: 1 });
reportSchema.index({ reporter: 1, createdAt: -1 });
reportSchema.index({ category: 1, status: 1 });

/**
 * Pre-save Sanitation & Timestamp Enforcement
 */
reportSchema.pre('save', function (next) {
  if (
    this.isModified('status') &&
    [REPORT_STATUS.RESOLVED, REPORT_STATUS.REJECTED].includes(this.status)
  ) {
    if (!this.resolvedAt) this.resolvedAt = new Date();
  }
  next();
});

export const Report = mongoose.model('Report', reportSchema);
export default Report;
