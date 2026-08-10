import mongoose from 'mongoose';

const adminReviewSchema = new mongoose.Schema(
  {
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reviewer (Admin User ID) is required'],
      index: true,
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Target User ID is required'],
      index: true,
    },
    verificationType: {
      type: String,
      enum: {
        values: ['SYSTEM_A_TRUST', 'SYSTEM_B_IDENTITY', 'CERTIFICATE', 'JOB_MODERATION', 'REPORT_RESOLUTION'],
        message: '{VALUE} is not a valid verification review type',
      },
      required: [true, 'Verification type is required'],
      index: true,
    },
    targetEntity: {
      kind: {
        type: String,
        required: true,
        enum: ['TrustProfile', 'IdentityVerification', 'CertificateVerification', 'Job', 'Report'],
      },
      id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
    },
    decision: {
      type: String,
      enum: {
        values: ['APPROVED', 'REJECTED', 'REQUEST_MORE_INFO', 'ESCALATED', 'FLAGGED'],
        message: '{VALUE} is not a valid review decision',
      },
      required: [true, 'Review decision is required'],
      index: true,
    },
    reviewNotes: {
      type: String,
      required: [true, 'Review notes are required'],
      trim: true,
      maxlength: [3000, 'Review notes cannot exceed 3000 characters'],
    },
    ipAddress: {
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

adminReviewSchema.index({ reviewer: 1, createdAt: -1 });
adminReviewSchema.index({ targetUser: 1, verificationType: 1, createdAt: -1 });
adminReviewSchema.index({ 'targetEntity.kind': 1, 'targetEntity.id': 1 });

export const AdminReview = mongoose.model('AdminReview', adminReviewSchema);
export default AdminReview;
