import mongoose from 'mongoose';
import { TRANSACTION_TYPE, TRANSACTION_STATUS } from '../constants/index.js';
import { softDeletePlugin } from './schemas/commonSchemas.js';

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: [true, 'Transaction ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required for transaction'],
      index: true,
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: [true, 'Payment reference is required for transaction'],
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: Object.values(TRANSACTION_TYPE),
        message: '{VALUE} is not a valid transaction type',
      },
      default: TRANSACTION_TYPE.PAYMENT,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Transaction amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(TRANSACTION_STATUS),
        message: '{VALUE} is not a valid transaction status',
      },
      default: TRANSACTION_STATUS.PENDING,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    razorpayOrderId: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    razorpaySignature: {
      type: String,
      trim: true,
      default: '',
    },
    gatewayResponse: {
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
transactionSchema.plugin(softDeletePlugin);

// Compound Indexes for query performance
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ payment: 1, type: 1 });
// Accelerate user-scoped Razorpay ID searches (used in history search)
transactionSchema.index({ user: 1, razorpayOrderId: 1 });
transactionSchema.index({ user: 1, razorpayPaymentId: 1 });

/**
 * Pre-save sanitation to ensure PCI sensitive fields are excluded
 */
transactionSchema.pre('save', function (next) {
  if (this.gatewayResponse) {
    delete this.gatewayResponse.cardNumber;
    delete this.gatewayResponse.card_number;
    delete this.gatewayResponse.cvv;
    delete this.gatewayResponse.cvc;
  }
  next();
});

export const Transaction = mongoose.model('Transaction', transactionSchema);
