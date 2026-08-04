import mongoose from 'mongoose';

/**
 * Notification Event Types
 */
export const NOTIFICATION_TYPE = Object.freeze({
  APPLICATION_APPLIED:     'application.applied',
  APPLICATION_ACCEPTED:    'application.accepted',
  APPLICATION_REJECTED:    'application.rejected',
  APPLICATION_SHORTLISTED: 'application.shortlisted',
  APPLICATION_WITHDRAWN:   'application.withdrawn',
  APPLICATION_CANCELLED:   'application.cancelled',
  APPLICATION_HIRED:       'application.hired',
  SYSTEM:                  'system',
});

/**
 * Notification Schema
 */
const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient (User ID) is required'],
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    type: {
      type: String,
      enum: {
        values: Object.values(NOTIFICATION_TYPE),
        message: '{VALUE} is not a valid notification type',
      },
      required: [true, 'Notification type is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    resource: {
      kind: {
        type: String,
        enum: ['Application', 'Job', 'User', null],
        default: null,
      },
      id: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
        refPath: 'resource.kind',
      },
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });

notificationSchema.pre('save', function (next) {
  if (this.isModified('isRead') && this.isRead && !this.readAt) {
    this.readAt = new Date();
  }
  next();
});

export const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
