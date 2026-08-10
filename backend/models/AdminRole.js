import mongoose from 'mongoose';
import { ADMIN_PERMISSIONS } from '../constants/index.js';
import { softDeletePlugin } from './schemas/commonSchemas.js';

const adminRoleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
      unique: true,
      trim: true,
      maxlength: [50, 'Role name cannot exceed 50 characters'],
      index: true,
    },
    permissions: {
      type: [String],
      required: [true, 'At least one permission is required'],
      enum: {
        values: Object.values(ADMIN_PERMISSIONS),
        message: '{VALUE} is not a valid admin permission',
      },
      validate: {
        validator: function (val) {
          return val && val.length > 0;
        },
        message: 'Role must have at least one permission',
      },
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    isSystem: {
      type: Boolean,
      default: false,
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
adminRoleSchema.plugin(softDeletePlugin);

// Prevent deletion of system roles
adminRoleSchema.pre('save', function (next) {
  if (this.isModified('isSystem') && !this.isNew && this.isSystem) {
    return next(new Error('Cannot modify system flag on existing roles'));
  }
  next();
});

export const AdminRole = mongoose.model('AdminRole', adminRoleSchema);
export default AdminRole;
