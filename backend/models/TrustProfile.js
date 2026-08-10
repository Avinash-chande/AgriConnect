import mongoose from 'mongoose';
import { TRUST_LEVELS } from '../constants/index.js';

/**
 * System A — AgriConnect TrustProfile Model
 *
 * Maintains the internal platform Trust Score (0-100) and Trust Level.
 * Completely decoupled from Aadhaar Identity Verification (System B).
 */
const trustProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
      index: true,
    },
    mobileVerified: {
      type: Boolean,
      default: false,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    profileCompleted: {
      type: Boolean,
      default: false,
    },
    certificateVerified: {
      type: Boolean,
      default: false,
    },
    verifiedExperience: {
      type: Boolean,
      default: false,
    },
    completedJobs: {
      type: Number,
      default: 0,
      min: [0, 'Completed jobs count cannot be negative'],
    },
    averageRating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot exceed 5'],
    },
    trustScore: {
      type: Number,
      default: 0,
      min: [0, 'Trust score cannot be negative'],
      max: [100, 'Trust score cannot exceed 100'],
      index: true,
    },
    trustLevel: {
      type: String,
      enum: {
        values: Object.values(TRUST_LEVELS),
        message: '{VALUE} is not a valid trust level',
      },
      default: TRUST_LEVELS.BASIC,
      index: true,
    },
    scoreBreakdown: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    badges: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VerificationBadge',
      },
    ],
    isFlagged: {
      type: Boolean,
      default: false,
    },
    flaggedReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes
trustProfileSchema.index({ trustScore: -1, trustLevel: 1 });
trustProfileSchema.index({ user: 1, trustLevel: 1 });

export const TrustProfile = mongoose.model('TrustProfile', trustProfileSchema);
export default TrustProfile;
