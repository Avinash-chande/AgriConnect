import mongoose from 'mongoose';

/**
 * AiMessage Schema
 * Stores individual user & assistant messages with token metadata
 */
const aiMessageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AiConversation',
      required: [true, 'AiConversation ID is required'],
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    role: {
      type: String,
      enum: ['system', 'user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Message content cannot be empty'],
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
    model: {
      type: String,
      default: '',
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

aiMessageSchema.index({ conversation: 1, createdAt: 1 });

export const AiMessage = mongoose.models.AiMessage || mongoose.model('AiMessage', aiMessageSchema);
