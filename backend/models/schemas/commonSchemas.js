import mongoose from 'mongoose';

/**
 * Reusable GeoJSON Point Schema for Geospatial Queries (2dsphere index)
 */
export const geoPointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      default: [75.8573, 31.634], // Default Punjab coordinates
    },
  },
  { _id: false }
);

/**
 * Reusable Indian Postal Address Schema
 */
export const addressSchema = new mongoose.Schema(
  {
    addressLine: {
      type: String,
      trim: true,
      maxlength: [250, 'Address line cannot exceed 250 characters'],
    },
    village: {
      type: String,
      trim: true,
      index: true,
    },
    district: {
      type: String,
      required: [true, 'District name is required'],
      trim: true,
      index: true,
    },
    state: {
      type: String,
      required: [true, 'State name is required'],
      trim: true,
      index: true,
    },
    pincode: {
      type: String,
      trim: true,
      match: [/^[1-9][0-9]{5}$/, 'Please enter a valid 6-digit Indian PIN code'],
      index: true,
    },
    latitude: {
      type: Number,
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90'],
    },
    longitude: {
      type: Number,
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180'],
    },
  },
  { _id: false }
);

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
