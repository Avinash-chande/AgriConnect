import mongoose from 'mongoose';
import { PAYMENT_STATUS } from '../constants/index.js';
import { softDeletePlugin } from './schemas/commonSchemas.js';

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required for payment'],
      index: true,
    },
    orderId: {
      type: String,
      required: [true, 'Order ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    paymentId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    provider: {
      type: String,
      required: [true, 'Payment provider is required'],
      default: 'razorpay',
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
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
        values: Object.values(PAYMENT_STATUS),
        message: '{VALUE} is not a valid payment status',
      },
      default: PAYMENT_STATUS.CREATED,
      index: true,
    },
    paymentMethod: {
      type: String,
      trim: true,
      default: '',
    },
    purpose: {
      type: String,
      trim: true,
      default: 'subscription',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    failureReason: {
      type: String,
      trim: true,
      default: '',
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Apply Soft Delete Plugin
paymentSchema.plugin(softDeletePlugin);

// Compound Indexes for fast queries & analytics aggregation
paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ provider: 1, status: 1 });
paymentSchema.index({ orderId: 1, status: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ purpose: 1, status: 1, createdAt: -1 });

/**
 * Pre-save sanitation to ensure sensitive PCI data is never stored
 */
paymentSchema.pre('save', function (next) {
  if (this.metadata) {
    delete this.metadata.cardNumber;
    delete this.metadata.card_number;
    delete this.metadata.cvv;
    delete this.metadata.cvc;
    delete this.metadata.password;
    delete this.metadata.pin;
  }
  next();
});

export const Payment = mongoose.model('Payment', paymentSchema);
