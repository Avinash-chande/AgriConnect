import mongoose from 'mongoose';
import { REFUND_STATUS } from '../constants/index.js';
import { softDeletePlugin } from './schemas/commonSchemas.js';

const refundSchema = new mongoose.Schema(
  {
    refundId: {
      type: String,
      required: [true, 'Refund ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    providerRefundId: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: [true, 'Payment reference is required for refund'],
      index: true,
    },
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      required: [true, 'Transaction reference is required for refund'],
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required for refund'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Refund amount is required'],
      min: [0, 'Refund amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true,
    },
    reason: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: Object.values(REFUND_STATUS),
        message: '{VALUE} is not a valid refund status',
      },
      default: REFUND_STATUS.PENDING,
      index: true,
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

// Apply Soft Delete Plugin
refundSchema.plugin(softDeletePlugin);

// Compound Indexes
refundSchema.index({ user: 1, createdAt: -1 });
refundSchema.index({ payment: 1, status: 1 });

export const Refund = mongoose.model('Refund', refundSchema);
