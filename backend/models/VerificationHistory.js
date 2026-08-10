import mongoose from 'mongoose';

const verificationHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    verificationSystem: {
      type: String,
      enum: {
        values: ['SYSTEM_A_TRUST', 'SYSTEM_B_IDENTITY', 'CERTIFICATE'],
        message: '{VALUE} is not a valid verification system identifier',
      },
      required: [true, 'Verification system identifier is required'],
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Entity ID is required'],
      index: true,
    },
    previousState: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    newState: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    changeReason: {
      type: String,
      trim: true,
      maxlength: [1000, 'Change reason cannot exceed 1000 characters'],
      default: '',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

verificationHistorySchema.index({ user: 1, verificationSystem: 1, createdAt: -1 });
verificationHistorySchema.index({ entityId: 1, createdAt: -1 });

export const VerificationHistory = mongoose.model('VerificationHistory', verificationHistorySchema);
export default VerificationHistory;
