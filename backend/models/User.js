import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { USER_ROLES } from '../constants/index.js';
import { softDeletePlugin } from './schemas/commonSchemas.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'User full name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email address',
      ],
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      unique: true,
      trim: true,
      index: true,
      match: [/^[0-9+\-\s]{8,15}$/, 'Please enter a valid mobile number'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: [USER_ROLES.FARMER, USER_ROLES.WORKER, USER_ROLES.ADMIN],
        message: '{VALUE} is not a valid user role',
      },
      default: USER_ROLES.FARMER,
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    profileCompleted: {
      type: Boolean,
      default: false,
    },
    profileImage: {
      type: String,
      default: '',
    },
    refreshToken: {
      type: String,
      select: false,
    },
    otpCode: {
      type: String,
      select: false,
    },
    otpExpiresAt: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Apply Soft Delete Plugin
userSchema.plugin(softDeletePlugin);

// Alias phone to mobile for backward compatibility
userSchema.virtual('phone')
  .get(function () {
    return this.mobile;
  })
  .set(function (v) {
    this.mobile = v;
  });

// Virtual Populate for Farmer Profile
userSchema.virtual('farmerProfile', {
  ref: 'FarmerProfile',
  localField: '_id',
  foreignField: 'owner',
  justOne: true,
});

// Virtual Populate for Worker Profile
userSchema.virtual('workerProfile', {
  ref: 'WorkerProfile',
  localField: '_id',
  foreignField: 'owner',
  justOne: true,
});

userSchema.index({ role: 1, isVerified: 1 });

/**
 * Pre-save Hook: Hash user password before saving if modified
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Instance Method: Compare candidate password with stored hash
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model('User', userSchema);
