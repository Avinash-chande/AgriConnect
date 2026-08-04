import mongoose from 'mongoose';
import {
  JOB_CATEGORIES,
  WAGE_TYPES,
  JOB_STATUS,
  GENDER_PREFERENCE,
  PREFERRED_WORK_TYPES,
} from '../constants/index.js';
import { addressSchema, geoPointSchema, softDeletePlugin } from './schemas/commonSchemas.js';
import { slugify } from '../utils/slugify.js';

const jobSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Farmer (User ID) is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      minlength: [3, 'Job title must be at least 3 characters long'],
      maxlength: [200, 'Job title cannot exceed 200 characters'],
      index: true,
    },
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Job description is required'],
      trim: true,
      maxlength: [3000, 'Job description cannot exceed 3000 characters'],
    },
    category: {
      type: String,
      enum: {
        values: JOB_CATEGORIES,
        message: '{VALUE} is not a valid job category',
      },
      required: [true, 'Job category is required'],
      index: true,
    },
    cropType: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    workType: {
      type: String,
      enum: {
        values: PREFERRED_WORK_TYPES,
        message: '{VALUE} is not a valid work type',
      },
      required: [true, 'Work type is required'],
    },
    numberOfWorkers: {
      type: Number,
      required: [true, 'Number of workers required is specified'],
      min: [1, 'Number of workers must be at least 1'],
    },
    genderPreference: {
      type: String,
      enum: {
        values: GENDER_PREFERENCE,
        message: '{VALUE} is not a valid gender preference',
      },
      default: 'Any',
    },
    minimumAge: {
      type: Number,
      min: [18, 'Minimum age cannot be under 18 years'],
      default: 18,
    },
    maximumAge: {
      type: Number,
      max: [70, 'Maximum age cannot exceed 70 years'],
      default: 60,
      validate: {
        validator: function (val) {
          return !this.minimumAge || val >= this.minimumAge;
        },
        message: 'Maximum age must be greater than or equal to minimum age',
      },
    },
    experienceRequired: {
      type: Number,
      min: [0, 'Experience years cannot be negative'],
      default: 0,
    },
    requiredSkills: {
      type: [String],
      required: [true, 'At least one required skill must be specified'],
      validate: {
        validator: function (val) {
          return val && val.length > 0;
        },
        message: 'Job posting must list at least one required skill',
      },
      index: true,
    },
    wageType: {
      type: String,
      enum: {
        values: WAGE_TYPES,
        message: '{VALUE} is not a valid wage type',
      },
      required: [true, 'Wage type is required'],
    },
    dailyWage: {
      type: Number,
      min: [0, 'Daily wage cannot be negative'],
      validate: {
        validator: function (val) {
          if (this.wageType === 'Daily' && (!val || val <= 0)) {
            return false;
          }
          return true;
        },
        message: 'Daily wage must be specified when wage type is Daily',
      },
    },
    monthlySalary: {
      type: Number,
      min: [0, 'Monthly salary cannot be negative'],
      validate: {
        validator: function (val) {
          if (this.wageType === 'Monthly' && (!val || val <= 0)) {
            return false;
          }
          return true;
        },
        message: 'Monthly salary must be specified when wage type is Monthly',
      },
    },
    startDate: {
      type: Date,
      required: [true, 'Job start date is required'],
    },
    endDate: {
      type: Date,
      validate: {
        validator: function (val) {
          return !val || !this.startDate || new Date(val) >= new Date(this.startDate);
        },
        message: 'End date must be on or after start date',
      },
    },
    workingHours: {
      type: Number,
      min: [1, 'Working hours must be at least 1 hour per day'],
      max: [24, 'Working hours cannot exceed 24 hours per day'],
      default: 8,
    },
    accommodationProvided: {
      type: Boolean,
      default: false,
    },
    foodProvided: {
      type: Boolean,
      default: false,
    },
    transportProvided: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(JOB_STATUS),
        message: '{VALUE} is not a valid job status',
      },
      default: JOB_STATUS.ACTIVE,
      index: true,
    },
    jobAddress: {
      type: addressSchema,
      required: [true, 'Job address is required'],
    },
    location: {
      type: geoPointSchema,
    },
    farmImages: {
      type: [String],
      default: [],
    },
    jobImages: {
      type: [String],
      default: [],
    },
    contactPerson: {
      type: String,
      trim: true,
      default: '',
    },
    contactMobile: {
      type: String,
      trim: true,
      default: '',
    },
    totalApplications: {
      type: Number,
      default: 0,
      min: [0, 'Total applications cannot be negative'],
    },
    totalViews: {
      type: Number,
      default: 0,
      min: [0, 'Total views cannot be negative'],
    },
    savedCount: {
      type: Number,
      default: 0,
      min: [0, 'Saved count cannot be negative'],
    },
    shareCount: {
      type: Number,
      default: 0,
      min: [0, 'Share count cannot be negative'],
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isUrgent: {
      type: Boolean,
      default: false,
      index: true,
    },
    expiresAt: {
      type: Date,
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
jobSchema.plugin(softDeletePlugin);

// 2dsphere index for location radius queries
jobSchema.index({ location: '2dsphere' });

// Compound indexes for high-throughput searches
jobSchema.index({ status: 1, 'jobAddress.state': 1, 'jobAddress.district': 1, isDeleted: 1 });
jobSchema.index({ category: 1, status: 1, isDeleted: 1 });
jobSchema.index({ farmer: 1, status: 1, isDeleted: 1 });
jobSchema.index({ isFeatured: -1, isUrgent: -1, createdAt: -1 });

// Full-text search index
jobSchema.index({
  title: 'text',
  description: 'text',
  cropType: 'text',
  requiredSkills: 'text',
  'jobAddress.district': 'text',
  'jobAddress.state': 'text',
});

/**
 * Pre-save Hook: Generate unique slug and handle location/expiry
 */
jobSchema.pre('save', async function (next) {
  if (this.isModified('title') || !this.slug) {
    let baseSlug = slugify(this.title);
    let uniqueSlug = `${baseSlug}-${this._id.toString().slice(-6)}`;
    let count = 1;

    while (await mongoose.models.Job.findOne({ slug: uniqueSlug, _id: { $ne: this._id } })) {
      uniqueSlug = `${baseSlug}-${this._id.toString().slice(-6)}-${count++}`;
    }

    this.slug = uniqueSlug;
  }

  // Set default expiration date (30 days from creation if not specified)
  if (!this.expiresAt) {
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    this.expiresAt = thirtyDays;
  }

  // Synchronize GeoJSON location if latitude/longitude are present in jobAddress
  if (this.jobAddress?.longitude && this.jobAddress?.latitude) {
    this.location = {
      type: 'Point',
      coordinates: [this.jobAddress.longitude, this.jobAddress.latitude],
    };
  }

  next();
});

/**
 * Virtual: Formatted address string
 */
jobSchema.virtual('fullAddress').get(function () {
  if (!this.jobAddress) return '';
  const { addressLine, village, district, state, pincode } = this.jobAddress;
  return [addressLine, village, district, state, pincode].filter(Boolean).join(', ');
});

/**
 * Virtual: Check if job is currently expired
 */
jobSchema.virtual('isExpired').get(function () {
  if (!this.expiresAt) return false;
  return new Date() > new Date(this.expiresAt);
});

/**
 * Virtual: Calculate days remaining until job expiration
 */
jobSchema.virtual('daysRemaining').get(function () {
  if (!this.expiresAt) return 0;
  const diffTime = new Date(this.expiresAt).getTime() - new Date().getTime();
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return days > 0 ? days : 0;
});

/**
 * Virtual: Formatted wage representation
 */
jobSchema.virtual('formattedWage').get(function () {
  if (this.wageType === 'Daily' && this.dailyWage) {
    return `₹${this.dailyWage.toLocaleString('en-IN')} / Daily`;
  }
  if (this.wageType === 'Monthly' && this.monthlySalary) {
    return `₹${this.monthlySalary.toLocaleString('en-IN')} / Monthly`;
  }
  if (this.dailyWage) {
    return `₹${this.dailyWage.toLocaleString('en-IN')} (${this.wageType})`;
  }
  return `${this.wageType}`;
});

export const Job = mongoose.model('Job', jobSchema);
