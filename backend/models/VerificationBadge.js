import mongoose from 'mongoose';
import { VERIFICATION_BADGES } from '../constants/index.js';

const verificationBadgeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: Object.values(VERIFICATION_BADGES),
        message: '{VALUE} is not a valid verification badge type',
      },
      required: [true, 'Badge type is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Badge title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'revoked', 'expired'],
      default: 'active',
      index: true,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Prevent duplicate active badges of the same type per user
verificationBadgeSchema.index(
  { user: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active' },
    name: 'unique_active_badge_per_user_type',
  }
);

verificationBadgeSchema.index({ user: 1, status: 1 });

/**
 * Pre-save validation: IDENTITY_VERIFIED badge must ONLY be granted via Aadhaar e-KYC
 */
verificationBadgeSchema.pre('save', function (next) {
  if (this.type === VERIFICATION_BADGES.IDENTITY_VERIFIED) {
    if (this.metadata?.source === 'TRUST_SCORE' || this.metadata?.source === 'SYSTEM_A') {
      return next(
        new Error(
          'CRITICAL RULE VIOLATION: IDENTITY_VERIFIED badge cannot be issued from Trust Score or System A logic.'
        )
      );
    }
  }
  next();
});

export const VerificationBadge = mongoose.model('VerificationBadge', verificationBadgeSchema);
export default VerificationBadge;
