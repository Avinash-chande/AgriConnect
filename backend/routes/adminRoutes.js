import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { requireAdmin, requirePermission } from '../middleware/rbacMiddleware.js';
import { auditAction } from '../middleware/auditMiddleware.js';
import { ADMIN_PERMISSIONS, AUDIT_CATEGORY, AUDIT_SEVERITY } from '../constants/index.js';
import * as adminController from '../controllers/adminController.js';
import * as v from '../validators/adminValidator.js';

const router = express.Router();

// Apply authentication & admin check to all admin routes
router.use(protect, requireAdmin());

// 1. Dashboard
router.get('/dashboard', adminController.getDashboard);

// 2. User Management
router.get('/users', requirePermission(ADMIN_PERMISSIONS.MANAGE_USERS), adminController.getUsers);
router.get('/users/:id', requirePermission(ADMIN_PERMISSIONS.MANAGE_USERS), adminController.getUserById);
router.get('/users/:id/overview', requirePermission(ADMIN_PERMISSIONS.MANAGE_USERS), adminController.getUserOverview);
router.put('/users/:id', requirePermission(ADMIN_PERMISSIONS.MANAGE_USERS), auditAction('USER_UPDATED'), adminController.updateUser);
router.patch('/users/:id/suspend', requirePermission(ADMIN_PERMISSIONS.MANAGE_USERS), auditAction('USER_SUSPENDED', AUDIT_CATEGORY.ADMIN, AUDIT_SEVERITY.WARNING), adminController.suspendUser);
router.patch('/users/:id/activate', requirePermission(ADMIN_PERMISSIONS.MANAGE_USERS), auditAction('USER_ACTIVATED'), adminController.activateUser);
router.delete('/users/:id', requirePermission(ADMIN_PERMISSIONS.MANAGE_USERS), auditAction('USER_DELETED', AUDIT_CATEGORY.ADMIN, AUDIT_SEVERITY.CRITICAL), adminController.deleteUser);

// 3. Job Moderation
router.get('/jobs', requirePermission(ADMIN_PERMISSIONS.MODERATE_JOBS), adminController.getJobs);
router.get('/jobs/:id', requirePermission(ADMIN_PERMISSIONS.MODERATE_JOBS), adminController.getJobById);
router.get('/jobs/:id/overview', requirePermission(ADMIN_PERMISSIONS.MODERATE_JOBS), adminController.getJobModerationOverview);
router.patch('/jobs/:id/moderate', requirePermission(ADMIN_PERMISSIONS.MODERATE_JOBS), v.validateModerateJob, auditAction('JOB_MODERATED', AUDIT_CATEGORY.MODERATION), adminController.moderateJob);
router.patch('/jobs/:id/feature', requirePermission(ADMIN_PERMISSIONS.MODERATE_JOBS), v.validateFeatureJob, auditAction('JOB_FEATURED', AUDIT_CATEGORY.MODERATION), adminController.featureJob);

// 4. Application Monitoring (Strict RBAC Scoped: applications.read, applications.moderate, applications.manage)
router.get('/applications', requirePermission(ADMIN_PERMISSIONS.APPLICATIONS_READ), adminController.getApplications);
router.get('/applications/:id', requirePermission(ADMIN_PERMISSIONS.APPLICATIONS_READ), adminController.getApplicationById);
router.patch('/applications/:id/flag', requirePermission(ADMIN_PERMISSIONS.APPLICATIONS_MODERATE), auditAction('APPLICATION_FLAGGED'), adminController.flagSuspiciousApplication);
router.patch('/applications/:id/override', requirePermission(ADMIN_PERMISSIONS.APPLICATIONS_MANAGE), auditAction('APPLICATION_STATUS_OVERRIDDEN'), adminController.moderateApplication);

// 5. System A — Trust Verification
router.get('/trust-verifications', requirePermission(ADMIN_PERMISSIONS.MANAGE_VERIFICATIONS), adminController.getTrustVerifications);
router.patch('/trust-verifications/:id/review', requirePermission(ADMIN_PERMISSIONS.MANAGE_VERIFICATIONS), v.validateReviewTrust, auditAction('TRUST_VERIFICATION_REVIEWED'), adminController.reviewTrustVerification);
router.patch('/trust-verifications/:id/flag', requirePermission(ADMIN_PERMISSIONS.MANAGE_VERIFICATIONS), auditAction('TRUST_PROFILE_FLAGGED'), adminController.flagTrustProfile);
router.post('/trust-verifications/:userId/recalculate', requirePermission(ADMIN_PERMISSIONS.MANAGE_VERIFICATIONS), auditAction('TRUST_SCORE_RECALCULATED'), adminController.recalculateTrustScore);

// 6. Certificate Verification
router.get('/certificates', requirePermission(ADMIN_PERMISSIONS.MANAGE_CERTIFICATES), adminController.getCertificates);
router.get('/certificates/:id', requirePermission(ADMIN_PERMISSIONS.MANAGE_CERTIFICATES), adminController.getCertificateById);
router.get('/certificates/:id/document', requirePermission(ADMIN_PERMISSIONS.MANAGE_CERTIFICATES), adminController.getCertificateDocument);
router.patch('/certificates/:id/review', requirePermission(ADMIN_PERMISSIONS.MANAGE_CERTIFICATES), v.validateReviewCert, auditAction('CERTIFICATE_REVIEWED'), adminController.reviewCertificate);

// 7. System B — Aadhaar Offline e-KYC Verification
router.get('/kyc', requirePermission(ADMIN_PERMISSIONS.MANAGE_KYC), adminController.getKycRequests);
router.patch('/kyc/:id/review', requirePermission(ADMIN_PERMISSIONS.MANAGE_KYC), v.validateReviewKyc, auditAction('KYC_REVIEWED', AUDIT_CATEGORY.KYC, AUDIT_SEVERITY.INFO), adminController.reviewKyc);

// 8. Reports & Complaints
router.get('/reports', requirePermission(ADMIN_PERMISSIONS.MANAGE_REPORTS), adminController.getReports);
router.get('/reports/:id', requirePermission(ADMIN_PERMISSIONS.MANAGE_REPORTS), adminController.getReportById);
router.patch('/reports/:id/assign', requirePermission(ADMIN_PERMISSIONS.MANAGE_REPORTS), auditAction('REPORT_ASSIGNED'), adminController.assignReport);
router.patch('/reports/:id/resolve', requirePermission(ADMIN_PERMISSIONS.MANAGE_REPORTS), v.validateResolveReport, auditAction('REPORT_RESOLVED'), adminController.resolveReport);

// 9. Payment Management (Strictly Restricted to Authorized Finance Admins)
router.get('/payments', requirePermission(ADMIN_PERMISSIONS.MANAGE_PAYMENTS), adminController.getPayments);
router.get('/payments/overview', requirePermission(ADMIN_PERMISSIONS.MANAGE_PAYMENTS), adminController.getPaymentOverview);
router.get('/payments/:id', requirePermission(ADMIN_PERMISSIONS.MANAGE_PAYMENTS), adminController.getPaymentById);
router.post('/payments/:id/refund', requirePermission(ADMIN_PERMISSIONS.MANAGE_PAYMENTS), auditAction('PAYMENT_REFUNDED', AUDIT_CATEGORY.PAYMENT, AUDIT_SEVERITY.WARNING), adminController.processRefund);

// 10. Premium Management
router.get('/subscriptions', requirePermission(ADMIN_PERMISSIONS.MANAGE_PREMIUM), adminController.getSubscriptions);
router.post('/subscriptions/grant', requirePermission(ADMIN_PERMISSIONS.MANAGE_PREMIUM), v.validateGrantPremium, auditAction('PREMIUM_GRANTED'), adminController.grantPremium);
router.patch('/subscriptions/:id/revoke', requirePermission(ADMIN_PERMISSIONS.MANAGE_PREMIUM), auditAction('PREMIUM_REVOKED', AUDIT_CATEGORY.ADMIN, AUDIT_SEVERITY.WARNING), adminController.revokePremium);
router.patch('/subscriptions/:id/extend', requirePermission(ADMIN_PERMISSIONS.MANAGE_PREMIUM), auditAction('PREMIUM_EXTENDED'), adminController.extendSubscription);

// 11. Role & Permission Management
router.get('/roles', requirePermission(ADMIN_PERMISSIONS.MANAGE_ROLES), adminController.getRoles);
router.post('/roles', requirePermission(ADMIN_PERMISSIONS.MANAGE_ROLES), v.validateCreateRole, auditAction('ROLE_CREATED'), adminController.createRole);
router.put('/roles/:id', requirePermission(ADMIN_PERMISSIONS.MANAGE_ROLES), auditAction('ROLE_UPDATED'), adminController.updateRole);
router.delete('/roles/:id', requirePermission(ADMIN_PERMISSIONS.MANAGE_ROLES), auditAction('ROLE_DELETED', AUDIT_CATEGORY.ADMIN, AUDIT_SEVERITY.WARNING), adminController.deleteRole);
router.post('/roles/assign', requirePermission(ADMIN_PERMISSIONS.MANAGE_ROLES), auditAction('ROLE_ASSIGNED'), adminController.assignRole);

// 12. Platform Settings (Strictly Restricted to Authorized Admins with settings.manage)
router.get('/settings', requirePermission(ADMIN_PERMISSIONS.MANAGE_SETTINGS), adminController.getSettings);
router.put('/settings/bulk', requirePermission(ADMIN_PERMISSIONS.MANAGE_SETTINGS), auditAction('SETTINGS_BULK_UPDATED', AUDIT_CATEGORY.SETTINGS, AUDIT_SEVERITY.WARNING), adminController.bulkUpdateSettings);
router.put('/settings/:key', requirePermission(ADMIN_PERMISSIONS.MANAGE_SETTINGS), auditAction('SETTING_UPDATED', AUDIT_CATEGORY.SETTINGS, AUDIT_SEVERITY.WARNING), adminController.updateSetting);

// 13. Audit Logs
router.get('/audit-logs', requirePermission(ADMIN_PERMISSIONS.VIEW_AUDIT_LOGS), adminController.getAuditLogs);

// 14. Analytics
router.get('/analytics/user-growth', requirePermission(ADMIN_PERMISSIONS.VIEW_ANALYTICS), adminController.getUserGrowthTrends);
router.get('/analytics/job-trends', requirePermission(ADMIN_PERMISSIONS.VIEW_ANALYTICS), adminController.getJobPostingTrends);
router.get('/analytics/category-breakdown', requirePermission(ADMIN_PERMISSIONS.VIEW_ANALYTICS), adminController.getCategoryBreakdown);
router.get('/analytics/geographic', requirePermission(ADMIN_PERMISSIONS.VIEW_ANALYTICS), adminController.getGeographicDistribution);

// 15. Admin Notifications
router.post('/notifications/broadcast', requirePermission(ADMIN_PERMISSIONS.MANAGE_NOTIFICATIONS), v.validateBroadcastNotification, auditAction('NOTIFICATION_BROADCAST'), adminController.broadcastNotification);
router.post('/notifications/targeted', requirePermission(ADMIN_PERMISSIONS.MANAGE_NOTIFICATIONS), auditAction('NOTIFICATION_TARGETED'), adminController.sendTargetedNotification);

export default router;
