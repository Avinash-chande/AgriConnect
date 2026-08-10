/**
 * Application Constants & Enums
 */

export const USER_ROLES = Object.freeze({
  FARMER: 'Farmer',
  WORKER: 'Worker',
  ADMIN: 'Admin',
});

export const FARM_SIZE_UNITS = Object.freeze([
  'Acres',
  'Hectares',
  'Bigha',
  'Gunta',
  'Sq Ft',
]);

export const IRRIGATION_TYPES = Object.freeze([
  'Drip Irrigation',
  'Sprinkler',
  'Canal / Flood',
  'Borewell / Tube Well',
  'Rainfed',
  'Other',
]);

export const EDUCATION_LEVELS = Object.freeze([
  'Below 10th',
  '10th Pass',
  '12th Pass',
  'Diploma in Agriculture',
  'Graduate',
  'Other',
]);

export const AVAILABILITY_STATUS = Object.freeze([
  'Immediate',
  'Within 3 Days',
  'Seasonal',
  'Unavailable',
]);

export const PREFERRED_WORK_TYPES = Object.freeze([
  'Full-Time',
  'Part-Time',
  'Contractual / Seasonal',
  'Daily Basis',
]);

export const JOB_CATEGORIES = Object.freeze([
  'Harvesting',
  'Sowing / Planting',
  'Plowing / Tillage',
  'Irrigation',
  'Pesticide / Fertilizer',
  'Equipment Operation',
  'Animal Husbandry',
  'General Farm Labor',
  'Other',
]);

export const WAGE_TYPES = Object.freeze([
  'Daily',
  'Monthly',
  'Per Acre',
  'Per Quintal',
  'Contract',
]);

export const JOB_STATUS = Object.freeze({
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  FILLED: 'Filled',
  PAUSED: 'Paused',
  CLOSED: 'Closed',
  EXPIRED: 'Expired',
  FLAGGED: 'Flagged',
  HIDDEN: 'Hidden',
  REMOVED: 'Removed',
});

export const APPLICATION_STATUS = Object.freeze({
  PENDING: 'Pending',
  SHORTLISTED: 'Shortlisted',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
  CANCELLED: 'Cancelled',
  HIRED: 'Hired',
  COMPLETED: 'Completed',
});

export const GENDER_PREFERENCE = Object.freeze([
  'Male',
  'Female',
  'Any',
]);

export const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
});

export const PAYMENT_STATUS = Object.freeze({
  CREATED: 'created',
  PENDING: 'pending',
  AUTHORIZED: 'authorized',
  CAPTURED: 'captured',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
  CANCELLED: 'cancelled',
});

export const SUBSCRIPTION_STATUS = Object.freeze({
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
  PAUSED: 'paused',
  PENDING: 'pending',
});

export const TRANSACTION_TYPE = Object.freeze({
  PAYMENT: 'payment',
  REFUND: 'refund',
});

export const TRANSACTION_STATUS = Object.freeze({
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
  REFUNDED: 'refunded',
});

export const INVOICE_STATUS = Object.freeze({
  ISSUED: 'issued',
  PAID: 'paid',
  VOID: 'void',
});

export const REFUND_STATUS = Object.freeze({
  PENDING: 'pending',
  PROCESSED: 'processed',
  FAILED: 'failed',
  REJECTED: 'rejected',
});

// ============================================================
// Phase 10 — Admin Panel Constants
// ============================================================

/**
 * Granular Admin Permissions for RBAC
 */
export const ADMIN_PERMISSIONS = Object.freeze({
  USERS_READ: 'users.read',
  USERS_UPDATE: 'users.update',
  USERS_SUSPEND: 'users.suspend',
  JOBS_READ: 'jobs.read',
  JOBS_MODERATE: 'jobs.moderate',
  APPLICATIONS_READ: 'applications.read',
  APPLICATIONS_MODERATE: 'applications.moderate',
  VERIFICATION_READ: 'verification.read',
  VERIFICATION_REVIEW: 'verification.review',
  IDENTITY_READ: 'identity.read',
  IDENTITY_REVIEW: 'identity.review',
  REPORTS_READ: 'reports.read',
  REPORTS_RESOLVE: 'reports.resolve',
  PAYMENTS_READ: 'payments.read',
  REFUNDS_MANAGE: 'refunds.manage',
  ANALYTICS_READ: 'analytics.read',
  SETTINGS_MANAGE: 'settings.manage',
  ROLES_MANAGE: 'roles.manage',
  AUDIT_READ: 'audit.read',

  // Legacy mappings for backwards compatibility
  MANAGE_USERS: 'users.update',
  MODERATE_JOBS: 'jobs.moderate',
  VIEW_AUDIT_LOGS: 'audit.read',
  MANAGE_KYC: 'identity.review',
  MANAGE_PAYMENTS: 'refunds.manage',
  MANAGE_SETTINGS: 'settings.manage',
  MANAGE_ROLES: 'roles.manage',
  VIEW_ANALYTICS: 'analytics.read',
  MANAGE_REPORTS: 'reports.resolve',
  MANAGE_CERTIFICATES: 'verification.review',
  MANAGE_PREMIUM: 'refunds.manage',
  MANAGE_NOTIFICATIONS: 'settings.manage',
  MANAGE_VERIFICATIONS: 'verification.review',
  APPLICATIONS_MANAGE: 'applications.moderate',
});

/**
 * Predefined RBAC Admin Roles
 */
export const ADMIN_ROLES = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MODERATOR: 'MODERATOR',
  VERIFICATION_OFFICER: 'VERIFICATION_OFFICER',
  SUPPORT_AGENT: 'SUPPORT_AGENT',
  FINANCE_ADMIN: 'FINANCE_ADMIN',
  ANALYTICS_ADMIN: 'ANALYTICS_ADMIN',
});

/**
 * Default Least Privilege Permission Mappings per Role
 */
export const DEFAULT_ROLE_PERMISSIONS = Object.freeze({
  SUPER_ADMIN: Object.values(ADMIN_PERMISSIONS),
  ADMIN: [
    'users.read', 'users.update', 'users.suspend',
    'jobs.read', 'jobs.moderate',
    'applications.read', 'applications.moderate',
    'verification.read', 'verification.review',
    'identity.read', 'identity.review',
    'reports.read', 'reports.resolve',
    'payments.read', 'refunds.manage',
    'analytics.read', 'settings.manage', 'audit.read'
  ],
  MODERATOR: [
    'jobs.read', 'jobs.moderate',
    'applications.read', 'applications.moderate',
    'reports.read', 'reports.resolve',
    'users.read'
  ],
  VERIFICATION_OFFICER: [
    'verification.read', 'verification.review',
    'identity.read', 'identity.review',
    'users.read'
  ],
  SUPPORT_AGENT: [
    'users.read', 'reports.read', 'reports.resolve',
    'jobs.read', 'applications.read'
  ],
  FINANCE_ADMIN: [
    'payments.read', 'refunds.manage', 'analytics.read'
  ],
  ANALYTICS_ADMIN: [
    'analytics.read', 'audit.read', 'jobs.read', 'users.read'
  ],
});

/**
 * System A — AgriConnect Trust Verification Status
 */
export const TRUST_VERIFICATION_STATUS = Object.freeze({
  PENDING: 'pending',
  IN_REVIEW: 'in_review',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
});

/**
 * System B — Aadhaar Paperless Offline e-KYC Status
 */
export const KYC_STATUS = Object.freeze({
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  MANUAL_REVIEW: 'MANUAL_REVIEW',
  RESUBMISSION_REQUIRED: 'RESUBMISSION_REQUIRED',
});

/**
 * Reports & Complaints Status
 */
export const REPORT_STATUS = Object.freeze({
  PENDING: 'PENDING',
  INVESTIGATING: 'INVESTIGATING',
  RESOLVED: 'RESOLVED',
  REJECTED: 'REJECTED',
  ESCALATED: 'ESCALATED',
});

/**
 * Report Categories
 */
export const REPORT_CATEGORY = Object.freeze({
  USER: 'USER',
  JOB: 'JOB',
  APPLICATION: 'APPLICATION',
  CERTIFICATE: 'CERTIFICATE',
  VERIFICATION_ABUSE: 'VERIFICATION_ABUSE',
  FRAUD: 'FRAUD',
  SPAM: 'SPAM',
  HARASSMENT: 'HARASSMENT',
  SUSPICIOUS_PROFILE: 'SUSPICIOUS_PROFILE',
  OTHER: 'OTHER',
});

/**
 * Report Priority Levels
 */
export const REPORT_PRIORITY = Object.freeze({
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
});

/**
 * Skill Certificate Verification Status
 */
export const CERTIFICATE_STATUS = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  RESUBMISSION_REQUESTED: 'RESUBMISSION_REQUESTED',
});

export const CERTIFICATE_TYPE = Object.freeze({
  AGRICULTURAL: 'AGRICULTURAL',
  TRAINING: 'TRAINING',
  TRACTOR_OPERATOR: 'TRACTOR_OPERATOR',
  EQUIPMENT_TRAINING: 'EQUIPMENT_TRAINING',
  ITI_CERTIFICATE: 'ITI_CERTIFICATE',
  GOVERNMENT_SKILL: 'GOVERNMENT_SKILL',
  OTHER: 'OTHER',
});

/**
 * Platform Setting Categories
 */
export const PLATFORM_SETTING_CATEGORY = Object.freeze({
  GENERAL: 'general',
  TRUST_SCORE: 'trust_score',
  BADGES: 'badges',
  CERTIFICATES: 'certificates',
  IDENTITY: 'identity',
  JOBS: 'jobs',
  APPLICATIONS: 'applications',
  AI_LIMITS: 'ai_limits',
  NOTIFICATIONS: 'notifications',
  PAYMENTS: 'payments',
  PREMIUM: 'premium',
  MAINTENANCE: 'maintenance',
  VERIFICATION: 'verification',
});

/**
 * Verification Badge Types
 */
export const VERIFICATION_BADGES = Object.freeze({
  MOBILE_VERIFIED: 'MOBILE_VERIFIED',
  EMAIL_VERIFIED: 'EMAIL_VERIFIED',
  PROFILE_COMPLETE: 'PROFILE_COMPLETE',
  SKILL_VERIFIED: 'SKILL_VERIFIED',
  EXPERIENCED_WORKER: 'EXPERIENCED_WORKER',
  TRUSTED_WORKER: 'TRUSTED_WORKER',
  TOP_RATED_WORKER: 'TOP_RATED_WORKER',
  IDENTITY_VERIFIED: 'IDENTITY_VERIFIED',
});

/**
 * Trust Levels (System A)
 */
export const TRUST_LEVELS = Object.freeze({
  BASIC: 'BASIC',
  VERIFIED: 'VERIFIED',
  SKILLED: 'SKILLED',
  TRUSTED: 'TRUSTED',
  TOP_RATED: 'TOP_RATED',
});

/**
 * Identity Verification Types
 */
export const IDENTITY_VERIFICATION_TYPE = Object.freeze({
  AADHAAR_OFFLINE_EKYC: 'AADHAAR_OFFLINE_EKYC',
});

/**
 * Audit Log Categories
 */
export const AUDIT_CATEGORY = Object.freeze({
  AUTH: 'auth',
  ADMIN: 'admin',
  PAYMENT: 'payment',
  KYC: 'kyc',
  MODERATION: 'moderation',
  SETTINGS: 'settings',
});

/**
 * Audit Log Severity Levels
 */
export const AUDIT_SEVERITY = Object.freeze({
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
});
