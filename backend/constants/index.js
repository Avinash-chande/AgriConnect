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
});

export const APPLICATION_STATUS = Object.freeze({
  PENDING: 'Pending',
  SHORTLISTED: 'Shortlisted',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
  CANCELLED: 'Cancelled',
  HIRED: 'Hired',
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
