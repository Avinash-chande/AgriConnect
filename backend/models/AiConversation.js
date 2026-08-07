import mongoose from 'mongoose';

/**
 * AiConversation Schema
 * Maintains AI chat conversation metadata and memory session per user
 */
const aiConversationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    title: {
      type: String,
      trim: true,
      default: 'New AI Conversation',
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    systemPromptType: {
      type: String,
      default: 'AGRICULTURAL_ADVISOR',
      enum: ['AGRICULTURAL_ADVISOR', 'JOB_RECOMMENDATION', 'CROP_RECOMMENDATION', 'WORKER_RECOMMENDATION', 'PEST_DIAGNOSIS', 'CUSTOM'],
    },
    model: {
      type: String,
      default: 'llama-3.3-70b-versatile',
    },
    lastMessageText: {
      type: String,
      default: '',
    },
    messageCount: {
      type: Number,
      default: 0,
    },
    totalTokens: {
      type: Number,
      default: 0,
    },
    totalPromptTokens: {
      type: Number,
      default: 0,
    },
    totalCompletionTokens: {
      type: Number,
      default: 0,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

aiConversationSchema.index({ user: 1, updatedAt: -1 });

export const AiConversation = mongoose.models.AiConversation || mongoose.model('AiConversation', aiConversationSchema);
