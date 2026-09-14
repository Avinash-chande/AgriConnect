import mongoose from 'mongoose';
import { USER_ROLES } from '../constants/index.js';

export const MAX_OTP_ATTEMPTS = 5;
export const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

const pendingRegistrationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Pre-hashed password is required'],
    },
    role: {
      type: String,
      enum: [USER_ROLES.FARMER, USER_ROLES.WORKER],
      required: [true, 'Role is required'],
    },

    // Farmer-specific registration fields
    farmName: {
      type: String,
      trim: true,
    },
    farmType: {
      type: String,
      trim: true,
    },
    farmSize: {
      type: Number,
      default: 5,
    },
    farmAddress: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    farmDescription: {
      type: String,
      default: '',
    },

    // Worker-specific registration fields
    title: {
      type: String,
      trim: true,
    },
    skills: {
      type: [String],
      default: [],
    },
    expectedDailyWage: {
      type: Number,
    },
    experience: {
      type: Number,
      default: 0,
    },
    preferredDistrict: {
      type: String,
      trim: true,
    },
    preferredState: {
      type: String,
      trim: true,
    },
    bio: {
      type: String,
      default: '',
    },
    languages: {
      type: [String],
      default: ['English', 'Hindi'],
    },

    // OTP tracking
    otpCode: {
      type: String,
      required: [true, 'OTP code is required'],
    },
    otpExpiresAt: {
      type: Date,
      required: [true, 'OTP expiration date is required'],
    },
    otpAttempts: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index: automatically remove stale pending registrations after 15 minutes (900 seconds)
pendingRegistrationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 900 });

export const PendingRegistration = mongoose.model('PendingRegistration', pendingRegistrationSchema);
