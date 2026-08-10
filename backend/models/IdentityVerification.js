import mongoose from 'mongoose';
import { KYC_STATUS, IDENTITY_VERIFICATION_TYPE } from '../constants/index.js';

/**
 * System B — IdentityVerification (Aadhaar Paperless Offline e-KYC)
 *
 * PRIVACY & COMPLIANCE RULES:
 * - NO full Aadhaar number stored
 * - NO Share Code stored
 * - NO biometric information stored
 * - NO raw XML exposed or stored permanently
 * - Completely isolated from System A (Trust Verification)
 */
const identityVerificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
      index: true,
    },
    verificationType: {
      type: String,
      enum: {
        values: Object.values(IDENTITY_VERIFICATION_TYPE),
        message: '{VALUE} is not a valid identity verification type',
      },
      default: IDENTITY_VERIFICATION_TYPE.AADHAAR_OFFLINE_EKYC,
      required: true,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(KYC_STATUS),
        message: '{VALUE} is not a valid identity verification status',
      },
      default: KYC_STATUS.PENDING,
      index: true,
    },
    referenceId: {
      type: String,
      trim: true,
      default: '',
      // Masked reference only (e.g., "XXXX-XXXX-1234")
    },
    signatureVerified: {
      type: Boolean,
      default: false,
    },
    nameMatch: {
      type: Boolean,
      default: false,
    },
    dobMatch: {
      type: Boolean,
      default: false,
    },
    verifiedAt: {
      type: Date,
      default: null,
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

// Compound indexes & duplicate prevention
identityVerificationSchema.index({ user: 1, status: 1 });

/**
 * Pre-save Sanitation & Verification Enforcement:
 * Strips any forbidden fields automatically before saving.
 */
identityVerificationSchema.pre('save', function (next) {
  // Enforce zero storage of prohibited fields
  if (this._doc) {
    delete this._doc.aadhaarNumber;
    delete this._doc.shareCode;
    delete this._doc.otp;
    delete this._doc.biometric;
    delete this._doc.rawXml;
  }
  next();
});

export const IdentityVerification = mongoose.model('IdentityVerification', identityVerificationSchema);
export default IdentityVerification;
