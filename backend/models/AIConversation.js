import mongoose from 'mongoose';
import { AI_CATEGORIES, AI_ROLES } from '../constants/aiConstants.js';

const AIMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: Object.values(AI_ROLES),
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    tokens: {
      type: Number,
      default: 0,
    },
    model: {
      type: String,
      default: null,
    },
    isFallback: {
      type: Boolean,
      default: false,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const AIConversationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    systemPromptType: {
      type: String,
      default: 'AGRICONNECT_ASSISTANT',
    },

    model: {
      type: String,
      default: 'llama-3.3-70b-versatile',
    },

    isArchived: {
      type: Boolean,
      default: false,
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

    lastMessageText: {
      type: String,
      default: '',
    },
    title: {
      type: String,
      default: 'Agricultural Advisory Chat',
      trim: true,
    },
    category: {
      type: String,
      enum: Object.values(AI_CATEGORIES),
      default: AI_CATEGORIES.GENERAL_ASSISTANT,
    },
    messages: [AIMessageSchema],
    systemPrompt: {
      type: String,
      default: null,
    },
    summary: {
      type: String,
      default: null,
    },
    totalTokensUsed: {
      type: Number,
      default: 0,
    },
    metadata: {
      cropType: { type: String, default: null },
      location: { type: String, default: null },
      language: { type: String, default: 'English' },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound Indexes for fast session lookup
AIConversationSchema.index({
  user: 1,
  category: 1,
  updatedAt: -1
});
export const AIConversation = mongoose.model('AIConversation', AIConversationSchema);
