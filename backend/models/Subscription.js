import mongoose from 'mongoose';
import { SUBSCRIPTION_STATUS } from '../constants/index.js';
import { softDeletePlugin } from './schemas/commonSchemas.js';

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required for subscription'],
      index: true,
    },
    plan: {
      type: String,
      required: [true, 'Subscription plan identifier is required'],
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(SUBSCRIPTION_STATUS),
        message: '{VALUE} is not a valid subscription status',
      },
      default: SUBSCRIPTION_STATUS.PENDING,
      index: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Subscription start date is required'],
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: [true, 'Subscription end date is required'],
      validate: {
        validator: function (val) {
          return !val || !this.startDate || new Date(val) > new Date(this.startDate);
        },
        message: 'Subscription end date must be after the start date',
      },
    },
    providerSubscriptionId: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    autoRenew: {
      type: Boolean,
      default: false,
    },
    cancelledAt: {
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
subscriptionSchema.plugin(softDeletePlugin);

// Compound Indexes for fast subscription validation & cron cleanup queries
subscriptionSchema.index({ user: 1, status: 1 });
subscriptionSchema.index({ status: 1, endDate: 1 });

/**
 * Virtual to check if subscription is currently active
 */
subscriptionSchema.virtual('isActive').get(function () {
  return this.status === SUBSCRIPTION_STATUS.ACTIVE && this.endDate && new Date(this.endDate) > new Date();
});

export const Subscription = mongoose.model('Subscription', subscriptionSchema);
