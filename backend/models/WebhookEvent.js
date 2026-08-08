import mongoose from 'mongoose';

const webhookEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: [true, 'Webhook event ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    event: {
      type: String,
      required: [true, 'Event name is required'],
      trim: true,
      index: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['processed', 'failed', 'ignored'],
      default: 'processed',
      index: true,
    },
    processedAt: {
      type: Date,
      default: Date.now,
    },
    errorDetails: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// TTL index to auto-clean old processed events after 90 days
webhookEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const WebhookEvent = mongoose.model('WebhookEvent', webhookEventSchema);
