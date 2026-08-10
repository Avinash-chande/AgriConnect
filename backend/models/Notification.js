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
  CHAT_MESSAGE:            'chat.message',
  JOB_CLOSED:              'job.closed',
  USER_VERIFIED:           'user.verified',
  SYSTEM:                  'system',
  PAYMENT_SUCCESSFUL:     'payment.successful',
  PAYMENT_FAILED:         'payment.failed',
  PREMIUM_ACTIVATED:      'premium.activated',
  PREMIUM_EXPIRING:       'premium.expiring',
  PREMIUM_EXPIRED:        'premium.expired',
  REFUND_REQUESTED:       'refund.requested',
  REFUND_PROCESSED:       'refund.processed',
  FEATURED_JOB_ACTIVATED: 'featured_job.activated',
  // Verification Event Notification Types
  MOBILE_VERIFIED:                    'verification.mobile_verified',
  EMAIL_VERIFIED:                     'verification.email_verified',
  CERTIFICATE_SUBMITTED:              'verification.certificate_submitted',
  CERTIFICATE_APPROVED:               'verification.certificate_approved',
  CERTIFICATE_REJECTED:               'verification.certificate_rejected',
  CERTIFICATE_RESUBMISSION_REQUIRED:  'verification.certificate_resubmission_required',
  IDENTITY_VERIFICATION_SUBMITTED:    'verification.identity_submitted',
  IDENTITY_VERIFICATION_PASSED:       'verification.identity_passed',
  IDENTITY_VERIFICATION_FAILED:       'verification.identity_failed',
  TRUST_BADGE_EARNED:                 'verification.trust_badge_earned',
  TRUST_SCORE_CHANGED:                'verification.trust_score_changed',
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
        enum: ['Application', 'Job', 'User', 'Payment', 'Transaction', 'Refund', null],
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
