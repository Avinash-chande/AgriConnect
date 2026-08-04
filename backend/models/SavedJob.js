import mongoose from 'mongoose';

const savedJobSchema = new mongoose.Schema(
  {
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Worker ID is required'],
      index: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: [true, 'Job ID is required'],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent Duplicate Save per Worker
savedJobSchema.index({ worker: 1, job: 1 }, { unique: true });

export const SavedJob = mongoose.model('SavedJob', savedJobSchema);
