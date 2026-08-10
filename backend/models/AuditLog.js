import mongoose from 'mongoose';
import { AUDIT_CATEGORY, AUDIT_SEVERITY } from '../constants/index.js';

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    ipAddress: {
      type: String,
      default: '',
    },
    IP: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILURE', 'WARNING'],
      default: 'SUCCESS',
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    resource: {
      kind: {
        type: String,
        enum: [
          'User',
          'Job',
          'Application',
          'Payment',
          'Report',
          'AadhaarKyc',
          'TrustVerification',
          'CertificateVerification',
          'AdminRole',
          'PlatformSetting',
          null,
        ],
        default: null,
      },
      id: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
      },
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    category: {
      type: String,
      enum: {
        values: Object.values(AUDIT_CATEGORY),
        message: '{VALUE} is not a valid audit category',
      },
      default: AUDIT_CATEGORY.ADMIN,
      index: true,
    },
    severity: {
      type: String,
      enum: {
        values: Object.values(AUDIT_SEVERITY),
        message: '{VALUE} is not a valid audit severity',
      },
      default: AUDIT_SEVERITY.INFO,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * STRICT PRIVACY SANITIZATION:
 * Prevents logging Aadhaar numbers, Share Codes, OTPs, Biometrics, Raw XML, Passwords, or Payment secrets
 */
function sanitizeAuditPayload(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const PROHIBITED_KEYS = [
    'aadhaar',
    'aadhaarnumber',
    'sharecode',
    'otp',
    'otpcode',
    'biometric',
    'rawxml',
    'password',
    'razorpaysecret',
    'cvv',
    'secret',
    'refreshtoken',
  ];

  for (const key of Object.keys(obj)) {
    const lower = key.toLowerCase();
    if (PROHIBITED_KEYS.some((p) => lower.includes(p))) {
      delete obj[key];
    } else if (typeof obj[key] === 'object') {
      sanitizeAuditPayload(obj[key]);
    }
  }
  return obj;
}

auditLogSchema.pre('save', function (next) {
  // Sync admin & actor aliases
  if (this.admin && !this.actor) this.actor = this.admin;
  if (this.actor && !this.admin) this.admin = this.actor;
  if (this.ipAddress && !this.IP) this.IP = this.ipAddress;
  if (this.IP && !this.ipAddress) this.ipAddress = this.IP;
  if (this.resource?.id && !this.resourceId) this.resourceId = this.resource.id;

  // Sanitize details & metadata
  if (this.details) this.details = sanitizeAuditPayload(this.details);
  if (this.metadata) this.metadata = sanitizeAuditPayload(this.metadata);

  next();
});

/**
 * IMMUTABILITY PROTECTION:
 * Throws an error to prevent deleting audit logs
 */
auditLogSchema.pre(
  ['deleteOne', 'deleteMany', 'findOneAndDelete', 'findOneAndRemove'],
  function (next) {
    const err = new Error(
      'IMMUTABILITY SECURITY GUARD: Audit logs are immutable permanent records and cannot be deleted.'
    );
    next(err);
  }
);

auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ category: 1, createdAt: -1 });
auditLogSchema.index({ actor: 1, category: 1, createdAt: -1 });
auditLogSchema.index({ severity: 1, createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
