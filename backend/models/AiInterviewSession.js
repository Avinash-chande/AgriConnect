import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    question: { type: String, required: true },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard', 'Advanced'],
      default: 'Medium',
    },
    suggestedAnswer: { type: String, required: true },
    userAnswer: { type: String, default: '' },
    feedback: { type: String, default: '' },
    score: { type: Number, min: 0, max: 100, default: 0 },
  },
  { _id: false }
);

const aiInterviewSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    jobTitle: {
      type: String,
      required: true,
      trim: true,
    },
    crop: {
      type: String,
      required: true,
      trim: true,
    },
    experience: {
      type: Number,
      default: 0,
    },
    skills: [
      {
        type: String,
        trim: true,
      },
    ],
    questions: [questionSchema],
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    readinessLevel: {
      type: String,
      enum: ['Needs Practice', 'Fair', 'Job Ready', 'Highly Competent'],
      default: 'Needs Practice',
    },
    tips: [
      {
        type: String,
      },
    ],
    improvementSuggestions: [
      {
        type: String,
      },
    ],
    status: {
      type: String,
      enum: ['Generated', 'Completed'],
      default: 'Generated',
    },
  },
  {
    timestamps: true,
  }
);

aiInterviewSessionSchema.index({ user: 1, createdAt: -1 });

export const AiInterviewSession = mongoose.model('AiInterviewSession', aiInterviewSessionSchema);
