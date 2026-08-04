import mongoose from 'mongoose';
import { EDUCATION_LEVELS, AVAILABILITY_STATUS, PREFERRED_WORK_TYPES } from '../constants/index.js';
import { softDeletePlugin } from './schemas/commonSchemas.js';
import { slugify } from '../utils/slugify.js';

const workerProfileSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner User ID is required'],
      unique: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      default: 'Agricultural Specialist',
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [1000, 'Bio cannot exceed 1000 characters'],
      default: '',
    },
    skills: {
      type: [String],
      required: [true, 'At least one skill is required'],
      validate: {
        validator: function (val) {
          return val && val.length > 0;
        },
        message: 'Worker profile must have at least one primary skill',
      },
      index: true,
    },
    experience: {
      type: Number,
      min: [0, 'Experience years cannot be negative'],
      default: 0,
    },
    languages: {
      type: [String],
      default: ['English', 'Hindi'],
    },
    education: {
      type: String,
      enum: {
        values: EDUCATION_LEVELS,
        message: '{VALUE} is not a valid education level',
      },
      default: '10th Pass',
    },
    expectedDailyWage: {
      type: Number,
      required: [true, 'Expected daily wage is required'],
      min: [0, 'Expected daily wage cannot be negative'],
    },
    expectedMonthlySalary: {
      type: Number,
      min: [0, 'Expected monthly salary cannot be negative'],
    },
    availability: {
      type: String,
      enum: {
        values: AVAILABILITY_STATUS,
        message: '{VALUE} is not a valid availability status',
      },
      default: 'Immediate',
      index: true,
    },
    preferredWorkType: {
      type: String,
      enum: {
        values: PREFERRED_WORK_TYPES,
        message: '{VALUE} is not a valid work type',
      },
      default: 'Full-Time',
    },
    preferredDistrict: {
      type: String,
      required: [true, 'Preferred district is required'],
      trim: true,
      index: true,
    },
    preferredState: {
      type: String,
      required: [true, 'Preferred state is required'],
      trim: true,
      index: true,
    },
    preferredVillage: {
      type: String,
      trim: true,
      default: '',
    },
    aadhaarVerified: {
      type: Boolean,
      default: false,
    },
    aadhaarNumber: {
      type: String,
      select: false,
    },
    certificateImages: {
      type: [String],
      default: [],
    },
    profileGallery: {
      type: [String],
      default: [],
    },
    rating: {
      type: Number,
      min: [0, 'Rating cannot be less than 0'],
      max: [5, 'Rating cannot exceed 5'],
      default: 5.0,
      index: true,
    },
    totalJobsCompleted: {
      type: Number,
      default: 0,
      min: [0, 'Jobs completed cannot be negative'],
    },
    slug: {
      type: String,
      unique: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Apply Soft Delete Plugin
workerProfileSchema.plugin(softDeletePlugin);

// Compound indexes for searching workers by skills & location
workerProfileSchema.index({ skills: 1, preferredDistrict: 1, availability: 1, isDeleted: 1 });
workerProfileSchema.index({ rating: -1, totalJobsCompleted: -1, isDeleted: 1 });

// Full-text search index
workerProfileSchema.index({ title: 'text', bio: 'text', skills: 'text' });

/**
 * Pre-save Hook: Generate unique slug from owner's name/skills
 */
workerProfileSchema.pre('save', async function (next) {
  if (!this.slug) {
    const primarySkill = this.skills && this.skills.length > 0 ? this.skills[0] : 'worker';
    let baseSlug = slugify(`worker-${primarySkill}-${this._id.toString().slice(-6)}`);
    this.slug = baseSlug;
  }
  next();
});

export const WorkerProfile = mongoose.model('WorkerProfile', workerProfileSchema);
