import mongoose from 'mongoose';
import { TRUST_LEVELS } from '../constants/index.js';

const trustScoreHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    previousScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    newScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    delta: {
      type: Number,
      required: true,
    },
    previousLevel: {
      type: String,
      enum: Object.values(TRUST_LEVELS),
      required: true,
    },
    newLevel: {
      type: String,
      enum: Object.values(TRUST_LEVELS),
      required: true,
    },
    triggerReason: {
      type: String,
      required: [true, 'Trigger reason is required'],
      trim: true,
    },
    triggerEntity: {
      kind: {
        type: String,
        enum: ['Application', 'CertificateVerification', 'User', 'WorkerProfile', 'FarmerProfile', 'AdminReview', 'TrustProfile', null],
        default: null,
      },
      id: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
      },
    },
    breakdown: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

trustScoreHistorySchema.index({ user: 1, createdAt: -1 });

export const TrustScoreHistory = mongoose.model('TrustScoreHistory', trustScoreHistorySchema);
export default TrustScoreHistory;
