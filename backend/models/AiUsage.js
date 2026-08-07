import mongoose from 'mongoose';

/**
 * AiUsage Schema
 * Audit log and telemetry for Groq AI token usage, costs, and request latency
 */
const aiUsageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
      index: true,
    },
    model: {
      type: String,
      required: true,
    },
    promptTokens: {
      type: Number,
      default: 0,
    },
    completionTokens: {
      type: Number,
      default: 0,
    },
    totalTokens: {
      type: Number,
      default: 0,
    },
    estimatedCostUsd: {
      type: Number,
      default: 0,
    },
    latencyMs: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['success', 'error', 'rate_limited'],
      default: 'success',
    },
    errorMessage: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

aiUsageSchema.index({ user: 1, createdAt: -1 });

export const AiUsage = mongoose.models.AiUsage || mongoose.model('AiUsage', aiUsageSchema);
