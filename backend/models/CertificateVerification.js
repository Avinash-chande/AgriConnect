import mongoose from 'mongoose';
import { CERTIFICATE_STATUS, CERTIFICATE_TYPE } from '../constants/index.js';

/**
 * CertificateVerification Model — System A Skill Verification
 *
 * Handles skill certificate submissions for workers.
 *
 * PRIVACY & COMPLIANCE:
 * - Certificate verification does NOT equal identity verification.
 * - Does NOT claim government identity verification.
 * - Private documents require authentication; access is audited in `accessLogs`.
 */
const accessLogSchema = new mongoose.Schema(
  {
    accessedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    accessedAt: {
      type: Date,
      default: Date.now,
    },
    ipAddress: {
      type: String,
      default: '',
    },
    purpose: {
      type: String,
      default: 'DOCUMENT_VIEW',
    },
  },
  { _id: false }
);

const certificateVerificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    certificateType: {
      type: String,
      enum: {
        values: Object.values(CERTIFICATE_TYPE),
        message: '{VALUE} is not a valid certificate type',
      },
      required: [true, 'Certificate type is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Certificate title is required'],
      trim: true,
      maxlength: [200, 'Certificate title cannot exceed 200 characters'],
    },
    issuer: {
      type: String,
      trim: true,
      maxlength: [200, 'Issuer name cannot exceed 200 characters'],
      default: '',
    },
    certificateNumber: {
      type: String,
      trim: true,
      default: '',
    },
    documentReference: {
      type: String,
      required: [true, 'Document reference is required'],
      trim: true,
    },
    isPrivate: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(CERTIFICATE_STATUS),
        message: '{VALUE} is not a valid certificate status',
      },
      default: CERTIFICATE_STATUS.PENDING,
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
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    accessLogs: [accessLogSchema],
    identityDisclaimer: {
      type: String,
      default: 'Skill certificate verification evaluates technical qualifications and does NOT constitute government identity verification.',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

certificateVerificationSchema.index({ user: 1, status: 1 });
certificateVerificationSchema.index({ status: 1, submittedAt: -1 });

export const CertificateVerification = mongoose.model('CertificateVerification', certificateVerificationSchema);
export default CertificateVerification;
