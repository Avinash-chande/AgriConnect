import mongoose from 'mongoose';

/**
 * Helper to build valid GeoJSON Point object [longitude, latitude]
 */
export const createGeoPoint = (longitude, latitude) => {
  if (
    typeof longitude === 'number' &&
    typeof latitude === 'number' &&
    !isNaN(longitude) &&
    !isNaN(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  ) {
    return {
      type: 'Point',
      coordinates: [longitude, latitude],
    };
  }
  return null;
};

/**
 * Reusable GeoJSON Point Schema for Geospatial Queries (2dsphere index)
 * Strictly enforces [longitude, latitude] order and boundary bounds.
 */
export const geoPointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      required: [true, 'GeoJSON type must be Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // Strictly [longitude, latitude]
      required: [true, 'GeoJSON coordinates array [longitude, latitude] is required'],
      validate: {
        validator: function (val) {
          if (!Array.isArray(val) || val.length !== 2) return false;
          const [longitude, latitude] = val;
          return (
            typeof longitude === 'number' &&
            typeof latitude === 'number' &&
            !isNaN(longitude) &&
            !isNaN(latitude) &&
            longitude >= -180 &&
            longitude <= 180 &&
            latitude >= -90 &&
            latitude <= 90
          );
        },
        message:
          'Coordinates must be an array of [longitude, latitude] where longitude is between -180 and 180 and latitude is between -90 and 90.',
      },
    },
  },
  { _id: false }
);

/**
 * Reusable Address Schema with Full Location Details
 */
export const addressSchema = new mongoose.Schema(
  {
    addressLine: {
      type: String,
      trim: true,
      maxlength: [250, 'Address line cannot exceed 250 characters'],
      default: '',
    },
    village: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    district: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    state: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    country: {
      type: String,
      trim: true,
      default: 'India',
      index: true,
    },
    pincode: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    latitude: {
      type: Number,
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90'],
      default: null,
    },
    longitude: {
      type: Number,
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180'],
      default: null,
    },
  },
  { _id: false, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Virtual alias: address -> addressLine for backward compatibility
addressSchema.virtual('address')
  .get(function () {
    return this.addressLine;
  })
  .set(function (v) {
    this.addressLine = v;
  });

/**
 * Soft Delete Mongoose Schema Plugin
 */
export const softDeletePlugin = (schema) => {
  schema.add({
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  });

  schema.methods.softDelete = async function () {
    this.isDeleted = true;
    this.deletedAt = new Date();
    return await this.save();
  };

  schema.methods.restore = async function () {
    this.isDeleted = false;
    this.deletedAt = null;
    return await this.save();
  };

  // Exclude soft-deleted records from standard queries automatically
  const excludeDeleted = function (next) {
    if (!this.getFilter().includeDeleted) {
      this.where({ isDeleted: { $ne: true } });
    }
    next();
  };

  schema.pre('find', excludeDeleted);
  schema.pre('findOne', excludeDeleted);
  schema.pre('findOneAndUpdate', excludeDeleted);
  schema.pre('countDocuments', excludeDeleted);
};

