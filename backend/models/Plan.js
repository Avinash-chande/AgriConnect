import mongoose from 'mongoose';
import { softDeletePlugin } from './schemas/commonSchemas.js';

const planSchema = new mongoose.Schema(
  {
    planId: {
      type: String,
      required: [true, 'Plan ID is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    price: {
      type: Number,
      required: [true, 'Plan price is required'],
      min: [0, 'Price cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true,
    },
    billingPeriod: {
      type: String,
      enum: {
        values: ['monthly', 'yearly', 'lifetime', 'one_time'],
        message: '{VALUE} is not a valid billing period',
      },
      required: [true, 'Billing period is required'],
    },
    targetRole: {
      type: String,
      enum: {
        values: ['farmer', 'worker', 'all'],
        message: '{VALUE} is not a valid target role',
      },
      default: 'all',
      index: true,
    },
    features: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Apply Soft Delete Plugin
planSchema.plugin(softDeletePlugin);

// Compound Indexes for fast queries
planSchema.index({ targetRole: 1, isActive: 1, sortOrder: 1 });

export const Plan = mongoose.model('Plan', planSchema);
