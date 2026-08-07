import mongoose from 'mongoose';
import { FARM_SIZE_UNITS, IRRIGATION_TYPES } from '../constants/index.js';
import { addressSchema, geoPointSchema, createGeoPoint, softDeletePlugin } from './schemas/commonSchemas.js';
import { slugify } from '../utils/slugify.js';

const farmerProfileSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner User ID is required'],
      unique: true,
      index: true,
    },
    farmName: {
      type: String,
      required: [true, 'Farm name is required'],
      trim: true,
      minlength: [2, 'Farm name must be at least 2 characters long'],
      maxlength: [150, 'Farm name cannot exceed 150 characters'],
      index: true,
    },
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    farmDescription: {
      type: String,
      trim: true,
      maxlength: [2000, 'Farm description cannot exceed 2000 characters'],
      default: '',
    },
    farmSize: {
      type: Number,
      required: [true, 'Farm size is required'],
      min: [0, 'Farm size cannot be negative'],
    },
    farmSizeUnit: {
      type: String,
      enum: {
        values: FARM_SIZE_UNITS,
        message: '{VALUE} is not a valid farm size unit',
      },
      default: 'Acres',
    },
    cropTypes: {
      type: [String],
      default: [],
      index: true,
    },
    livestock: {
      type: [String],
      default: [],
    },
    equipment: {
      type: [String],
      default: [],
    },
    irrigationType: {
      type: String,
      enum: {
        values: IRRIGATION_TYPES,
        message: '{VALUE} is not a valid irrigation type',
      },
      default: 'Canal / Flood',
    },
    locationVisibility: {
      type: String,
      enum: {
        values: ['private', 'approximate', 'verified_users', 'public'],
        message: '{VALUE} is not a valid location visibility setting',
      },
      default: 'approximate',
      index: true,
    },
    farmAddress: {
      type: addressSchema,
      default: null,
    },
    location: {
      type: geoPointSchema,
      default: null,
    },
    farmImages: {
      type: [String],
      default: [],
    },
    workingDays: {
      type: [String],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Apply Soft Delete Plugin
farmerProfileSchema.plugin(softDeletePlugin);

// Geospatial 2dsphere index for location searches
farmerProfileSchema.index({ location: '2dsphere' }, { sparse: true });

// Compound indexes for fast location & crop filtering
farmerProfileSchema.index({ 'farmAddress.district': 1, 'farmAddress.state': 1, isDeleted: 1 });
farmerProfileSchema.index({ cropTypes: 1, 'farmAddress.state': 1, isDeleted: 1 });

// Full-text search index
farmerProfileSchema.index({ farmName: 'text', farmDescription: 'text', cropTypes: 'text' });

/**
 * Pre-save Hook: Generate unique slug & sync GeoJSON location
 */
farmerProfileSchema.pre('save', async function (next) {
  if (this.isModified('farmName') || !this.slug) {
    let baseSlug = slugify(this.farmName);
    let uniqueSlug = baseSlug;
    let count = 1;

    while (await mongoose.models.FarmerProfile.findOne({ slug: uniqueSlug, _id: { $ne: this._id } })) {
      uniqueSlug = `${baseSlug}-${count++}`;
    }

    this.slug = uniqueSlug;
  }

  // Synchronize GeoJSON location if latitude & longitude are present in farmAddress
  if (this.farmAddress) {
    if (!this.farmAddress.country) {
      this.farmAddress.country = 'India';
    }
    if (typeof this.farmAddress.longitude === 'number' && typeof this.farmAddress.latitude === 'number') {
      const geoPoint = createGeoPoint(this.farmAddress.longitude, this.farmAddress.latitude);
      if (geoPoint) {
        this.location = geoPoint;
      }
    }
  }

  next();
});

/**
 * Virtual: Formatted full address
 */
farmerProfileSchema.virtual('fullAddress').get(function () {
  if (!this.farmAddress) return '';
  const { addressLine, village, district, state, country, pincode } = this.farmAddress;
  return [addressLine, village, district, state, country, pincode].filter(Boolean).join(', ');
});

export const FarmerProfile = mongoose.model('FarmerProfile', farmerProfileSchema);

