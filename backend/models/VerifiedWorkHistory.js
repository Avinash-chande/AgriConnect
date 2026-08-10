import mongoose from 'mongoose';

/**
 * VerifiedWorkHistory Model — System A Verified Work Experience
 *
 * Tracks verified job completions performed by workers on AgriConnect.
 * CANNOT be created manually by workers. Only verified job completion events trigger creation.
 */
const verifiedWorkHistorySchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: [true, 'Job reference is required'],
      index: true,
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: [true, 'Application reference is required'],
      unique: true,
      index: true,
    },
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
    cropType: {
      type: String,
      trim: true,
      default: '',
    },
    skillsUsed: [
      {
        type: String,
        trim: true,
      },
    ],
    durationDays: {
      type: Number,
      default: 1,
      min: [0, 'Duration cannot be negative'],
    },
    completionDate: {
      type: Date,
      default: Date.now,
    },
    rating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot exceed 5'],
    },
    farmerFeedback: {
      type: String,
      trim: true,
      default: '',
    },
    verifiedByEvent: {
      type: String,
      default: 'SYSTEM_JOB_COMPLETED',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

verifiedWorkHistorySchema.index({ worker: 1, completionDate: -1 });
verifiedWorkHistorySchema.index({ farmer: 1, worker: 1 });

export const VerifiedWorkHistory = mongoose.model('VerifiedWorkHistory', verifiedWorkHistorySchema);
export default VerifiedWorkHistory;
