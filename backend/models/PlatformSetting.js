import mongoose from 'mongoose';
import { PLATFORM_SETTING_CATEGORY } from '../constants/index.js';

const platformSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, 'Setting key is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
      match: [/^[a-z0-9_]+$/, 'Setting key must be lowercase alphanumeric with underscores'],
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Setting value is required'],
    },
    type: {
      type: String,
      enum: {
        values: ['boolean', 'number', 'string', 'json'],
        message: '{VALUE} is not a valid setting type',
      },
      required: [true, 'Setting type is required'],
    },
    category: {
      type: String,
      enum: {
        values: Object.values(PLATFORM_SETTING_CATEGORY),
        message: '{VALUE} is not a valid setting category',
      },
      required: [true, 'Setting category is required'],
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    updatedBy: {
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

// Compound index for category lookups
platformSettingSchema.index({ category: 1, key: 1 });

export const PlatformSetting = mongoose.model('PlatformSetting', platformSettingSchema);
export default PlatformSetting;
