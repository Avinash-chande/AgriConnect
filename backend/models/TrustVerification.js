import mongoose from 'mongoose';
import { TRUST_VERIFICATION_STATUS } from '../constants/index.js';

/**
 * System A — AgriConnect Trust Verification
 *
 * Tracks trust score components: mobile/email verification, profile completion,
 * certificates, job history, ratings, and experience. Completely separate from
 * Aadhaar identity verification (System B).
 */
const trustVerificationSchema = new mongoose.Schema(
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
    certificatesVerified: {
      type: Number,
      default: 0,
      min: [0, 'Certificates verified count cannot be negative'],
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
    verifiedExperience: {
      type: Boolean,
      default: false,
    },
    trustScore: {
      type: Number,
      default: 0,
      min: [0, 'Trust score cannot be negative'],
      max: [100, 'Trust score cannot exceed 100'],
      index: true,
    },
    badges: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: {
        values: Object.values(TRUST_VERIFICATION_STATUS),
        message: '{VALUE} is not a valid trust verification status',
      },
      default: TRUST_VERIFICATION_STATUS.PENDING,
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewNotes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Review notes cannot exceed 1000 characters'],
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

trustVerificationSchema.index({ status: 1, trustScore: -1 });
trustVerificationSchema.index({ user: 1, status: 1 });

/**
 * Pre-save Hook: Auto-calculate trust score from components
 */
trustVerificationSchema.pre('save', function (next) {
  let score = 0;

  // Mobile verified: 15 points
  if (this.mobileVerified) score += 15;

  // Email verified: 10 points
  if (this.emailVerified) score += 10;

  // Profile completed: 15 points
  if (this.profileCompleted) score += 15;

  // Certificates verified: up to 15 points (5 per certificate, max 3)
  score += Math.min(this.certificatesVerified * 5, 15);

  // Completed jobs: up to 20 points (2 per job, max 10)
  score += Math.min(this.completedJobs * 2, 20);

  // Average rating: up to 15 points (rating * 3)
  score += Math.min(Math.round(this.averageRating * 3), 15);

  // Verified experience: 10 points
  if (this.verifiedExperience) score += 10;

  this.trustScore = Math.min(score, 100);

  // Auto-assign badges based on score
  const badges = [];
  if (this.mobileVerified && this.emailVerified) badges.push('Contact Verified');
  if (this.profileCompleted) badges.push('Profile Complete');
  if (this.certificatesVerified >= 1) badges.push('Certified');
  if (this.completedJobs >= 5) badges.push('Experienced');
  if (this.completedJobs >= 20) badges.push('Veteran');
  if (this.averageRating >= 4.5) badges.push('Top Rated');
  if (this.trustScore >= 80) badges.push('Highly Trusted');
  this.badges = badges;

  next();
});

export const TrustVerification = mongoose.model('TrustVerification', trustVerificationSchema);
export default TrustVerification;
