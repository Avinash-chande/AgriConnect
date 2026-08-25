import mongoose from 'mongoose';

const callSchema = new mongoose.Schema(
  {
    caller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Caller User ID is required'],
      index: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Receiver User ID is required'],
      index: true,
    },
    workerProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkerProfile',
      default: null,
      index: true,
    },
    provider: {
      type: String,
      default: 'twilio',
    },
    providerCallId: {
      type: String,
      index: true,
      default: '',
    },
    status: {
      type: String,
      enum: [
        'initiated',
        'ringing',
        'answered',
        'completed',
        'busy',
        'no-answer',
        'failed',
        'cancelled',
      ],
      default: 'initiated',
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number,
      default: 0, // Duration in seconds
    },
    metadata: {
      type: Map,
      of: String,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

callSchema.index({ caller: 1, createdAt: -1 });
callSchema.index({ receiver: 1, createdAt: -1 });

export const Call = mongoose.model('Call', callSchema);
