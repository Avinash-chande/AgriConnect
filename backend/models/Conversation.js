import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    participants: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
      ],
      validate: [
        (val) => Array.isArray(val) && val.length >= 2,
        'Conversation must have at least 2 participants',
      ],
    },
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Farmer user reference is required'],
      index: true,
    },
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Worker user reference is required'],
      index: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: [true, 'Job vacancy reference is required'],
      index: true,
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: [true, 'Job application reference is required'],
      index: true,
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    lastMessageText: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Last message snippet cannot exceed 1000 characters'],
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    unreadCount: {
      farmer: { type: Number, default: 0, min: 0 },
      worker: { type: Number, default: 0, min: 0 },
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound Unique Index: Prevent duplicate threads for same farmer, worker, and job
conversationSchema.index({ farmer: 1, worker: 1, job: 1 }, { unique: true });

// Performance Lookup Indexes
conversationSchema.index({ participants: 1, lastMessageAt: -1 });

// Full-Text Search Index
conversationSchema.index({ lastMessageText: 'text' });

export const Conversation = mongoose.model('Conversation', conversationSchema);
