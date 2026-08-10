import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccessResponse } from '../utils/apiResponse.js';
import * as dashboardService from '../services/adminDashboardService.js';
import * as userService from '../services/adminUserService.js';
import * as jobService from '../services/adminJobService.js';
import * as appService from '../services/adminApplicationService.js';
import * as trustService from '../services/trustVerificationService.js';
import * as certService from '../services/certificateVerificationService.js';
import * as kycService from '../services/aadhaarKycService.js';
import * as reportService from '../services/reportService.js';
import * as paymentService from '../services/adminPaymentService.js';
import * as premiumService from '../services/adminPremiumService.js';
import * as roleService from '../services/adminRoleService.js';
import * as settingService from '../services/platformSettingService.js';
import * as auditService from '../services/adminAuditService.js';
import * as analyticsService from '../services/adminAnalyticsService.js';
import * as notificationService from '../services/adminNotificationService.js';

// ============================================================
// 1. Admin Dashboard
// ============================================================
export const getDashboard = asyncHandler(async (req, res) => {
  const data = await dashboardService.getDashboardData(req.query);
  return sendSuccessResponse(res, 200, 'Admin dashboard data fetched successfully', data);
});

// ============================================================
// 2. User Management
// ============================================================
export const getUsers = asyncHandler(async (req, res) => {
  const result = await userService.getUsers(req.query);
  return sendSuccessResponse(res, 200, 'Users fetched successfully', result);
});

export const getUserById = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  return sendSuccessResponse(res, 200, 'User details fetched successfully', user);
});

export const getUserOverview = asyncHandler(async (req, res) => {
  const overview = await userService.getUserOverview(req.params.id);
  return sendSuccessResponse(res, 200, 'User complete overview fetched successfully', overview);
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body, req.user);
  return sendSuccessResponse(res, 200, 'User updated successfully', user);
});

export const suspendUser = asyncHandler(async (req, res) => {
  const user = await userService.suspendUser(req.params.id, req.user);
  return sendSuccessResponse(res, 200, 'User suspended successfully', user);
});

export const activateUser = asyncHandler(async (req, res) => {
  const user = await userService.activateUser(req.params.id, req.user);
  return sendSuccessResponse(res, 200, 'User activated successfully', user);
});

export const deleteUser = asyncHandler(async (req, res) => {
  const result = await userService.deleteUser(req.params.id, req.user);
  return sendSuccessResponse(res, 200, result.message);
});

// ============================================================
// 3. Job Moderation
// ============================================================
export const getJobs = asyncHandler(async (req, res) => {
  const result = await jobService.getJobs(req.query);
  return sendSuccessResponse(res, 200, 'Jobs fetched successfully', result);
});

export const getJobById = asyncHandler(async (req, res) => {
  const job = await jobService.getJobById(req.params.id);
  return sendSuccessResponse(res, 200, 'Job details fetched successfully', job);
});

export const getJobModerationOverview = asyncHandler(async (req, res) => {
  const overview = await jobService.getJobModerationOverview(req.params.id);
  return sendSuccessResponse(res, 200, 'Job moderation overview fetched successfully', overview);
});

export const moderateJob = asyncHandler(async (req, res) => {
  const job = await jobService.moderateJobAction(req.params.id, req.body, req.user);
  return sendSuccessResponse(res, 200, `Job moderation action executed successfully`, job);
});

export const featureJob = asyncHandler(async (req, res) => {
  const job = await jobService.featureJob(req.params.id, req.body, req.user);
  return sendSuccessResponse(res, 200, 'Job feature status updated successfully', job);
});

// ============================================================
// 4. Application Monitoring
// ============================================================
export const getApplications = asyncHandler(async (req, res) => {
  const result = await appService.getApplications(req.query);
  return sendSuccessResponse(res, 200, 'Applications fetched successfully', result);
});

export const getApplicationById = asyncHandler(async (req, res) => {
  const app = await appService.getApplicationById(req.params.id);
  return sendSuccessResponse(res, 200, 'Application details fetched successfully', app);
});

export const moderateApplication = asyncHandler(async (req, res) => {
  const app = await appService.moderateApplication(req.params.id, req.body, req.user);
  return sendSuccessResponse(res, 200, 'Application status override executed successfully', app);
});

export const flagSuspiciousApplication = asyncHandler(async (req, res) => {
  const app = await appService.flagSuspiciousApplication(req.params.id, req.body, req.user);
  return sendSuccessResponse(res, 200, 'Application flag updated successfully', app);
});

// ============================================================
// 5. System A — Trust Verification
// ============================================================
export const getTrustVerifications = asyncHandler(async (req, res) => {
  const result = await trustService.getTrustVerifications(req.query);
  return sendSuccessResponse(res, 200, 'Trust verifications fetched successfully', result);
});

export const reviewTrustVerification = asyncHandler(async (req, res) => {
  const record = await trustService.reviewTrustVerification(req.params.id, req.body, req.user);
  return sendSuccessResponse(res, 200, 'Trust verification reviewed successfully', record);
});

export const flagTrustProfile = asyncHandler(async (req, res) => {
  const record = await trustService.flagTrustProfile(req.params.id, req.body, req.user);
  return sendSuccessResponse(res, 200, 'Trust profile flag updated successfully', record);
});

export const recalculateTrustScore = asyncHandler(async (req, res) => {
  const record = await trustService.recalculateTrustScore(req.params.userId, req.user);
  return sendSuccessResponse(res, 200, 'Trust score recalculated successfully', record);
});

// ============================================================
// 6. Certificate Verification
// ============================================================
export const getCertificates = asyncHandler(async (req, res) => {
  const result = await certService.getCertificatesForAdmin(req.query);
  return sendSuccessResponse(res, 200, 'Certificates fetched successfully', result);
});

export const getCertificateById = asyncHandler(async (req, res) => {
  const cert = await certService.getCertificateDocumentSecure(req.params.id, req.user, req.ip);
  return sendSuccessResponse(res, 200, 'Certificate details fetched successfully', cert);
});

export const getCertificateDocument = asyncHandler(async (req, res) => {
  const result = await certService.getCertificateDocumentSecure(req.params.id, req.user, req.ip);
  return sendSuccessResponse(res, 200, 'Certificate document reference retrieved securely', result);
});

export const reviewCertificate = asyncHandler(async (req, res) => {
  const cert = await certService.reviewCertificate(req.params.id, req.body, req.user);
  return sendSuccessResponse(res, 200, 'Certificate reviewed successfully', cert);
});

// ============================================================
// 7. System B — Aadhaar Offline e-KYC Verification
// ============================================================
export const getKycRequests = asyncHandler(async (req, res) => {
  const result = await kycService.getKycRequests(req.query);
  return sendSuccessResponse(res, 200, 'Aadhaar KYC requests fetched successfully', result);
});

export const reviewKyc = asyncHandler(async (req, res) => {
  const record = await kycService.reviewKyc(req.params.id, req.body, req.user);
  return sendSuccessResponse(res, 200, 'Aadhaar KYC reviewed successfully', record);
});

// ============================================================
// 8. Reports & Complaints
// ============================================================
export const getReports = asyncHandler(async (req, res) => {
  const result = await reportService.getReports(req.query);
  return sendSuccessResponse(res, 200, 'Reports fetched successfully', result);
});

export const getReportById = asyncHandler(async (req, res) => {
  const report = await reportService.getReportById(req.params.id);
  return sendSuccessResponse(res, 200, 'Report details fetched successfully', report);
});

export const assignReport = asyncHandler(async (req, res) => {
  const report = await reportService.assignReport(req.params.id, req.body.assigneeId, req.user);
  return sendSuccessResponse(res, 200, 'Report assigned successfully', report);
});

export const resolveReport = asyncHandler(async (req, res) => {
  const report = await reportService.reviewReport(req.params.id, req.body, req.user);
  return sendSuccessResponse(res, 200, 'Report review updated successfully', report);
});

// ============================================================
// 9. Payment Management
// ============================================================
export const getPayments = asyncHandler(async (req, res) => {
  const result = await paymentService.getPayments(req.query);
  return sendSuccessResponse(res, 200, 'Payments fetched successfully', result);
});

export const getPaymentOverview = asyncHandler(async (req, res) => {
  const overview = await paymentService.getAdminPaymentOverview();
  return sendSuccessResponse(res, 200, 'Payment overview stats fetched successfully', overview);
});

export const getPaymentById = asyncHandler(async (req, res) => {
  const payment = await paymentService.getPaymentById(req.params.id);
  return sendSuccessResponse(res, 200, 'Payment transaction details fetched', payment);
});

export const processRefund = asyncHandler(async (req, res) => {
  const result = await paymentService.processAdminRefund(req.params.id, req.body, req.user);
  return sendSuccessResponse(res, 200, 'Refund processed successfully', result);
});

// ============================================================
// 10. Premium Management
// ============================================================
export const getSubscriptions = asyncHandler(async (req, res) => {
  const result = await premiumService.getSubscriptions(req.query);
  return sendSuccessResponse(res, 200, 'Subscriptions fetched successfully', result);
});

export const grantPremium = asyncHandler(async (req, res) => {
  const result = await premiumService.grantPremium(req.body, req.user);
  return sendSuccessResponse(res, 200, 'Premium membership granted successfully', result);
});

export const revokePremium = asyncHandler(async (req, res) => {
  const result = await premiumService.revokePremium(req.params.id, req.user);
  return sendSuccessResponse(res, 200, 'Premium membership revoked successfully', result);
});

export const extendSubscription = asyncHandler(async (req, res) => {
  const result = await premiumService.extendSubscription(req.params.id, req.body, req.user);
  return sendSuccessResponse(res, 200, 'Subscription extended successfully', result);
});

// ============================================================
// 11. Role & Permission Management
// ============================================================
export const getRoles = asyncHandler(async (req, res) => {
  const roles = await roleService.getRoles();
  return sendSuccessResponse(res, 200, 'Admin roles fetched successfully', roles);
});

export const createRole = asyncHandler(async (req, res) => {
  const role = await roleService.createRole(req.body, req.user);
  return sendSuccessResponse(res, 201, 'Admin role created successfully', role);
});

export const updateRole = asyncHandler(async (req, res) => {
  const role = await roleService.updateRole(req.params.id, req.body, req.user);
  return sendSuccessResponse(res, 200, 'Admin role updated successfully', role);
});

export const deleteRole = asyncHandler(async (req, res) => {
  const result = await roleService.deleteRole(req.params.id, req.user);
  return sendSuccessResponse(res, 200, result.message);
});

export const assignRole = asyncHandler(async (req, res) => {
  const user = await roleService.assignRoleToUser(req.body.userId, req.body.roleId, req.user);
  return sendSuccessResponse(res, 200, 'Admin role assigned successfully', user);
});

// ============================================================
// 12. Platform Settings
// ============================================================
export const getSettings = asyncHandler(async (req, res) => {
  const settings = await settingService.getSettings(req.query.category);
  return sendSuccessResponse(res, 200, 'Platform settings fetched successfully', settings);
});

export const updateSetting = asyncHandler(async (req, res) => {
  const setting = await settingService.updateSetting(req.params.key, req.body.value, req.user);
  return sendSuccessResponse(res, 200, 'Platform setting updated successfully', setting);
});

export const bulkUpdateSettings = asyncHandler(async (req, res) => {
  const results = await settingService.bulkUpdateSettings(req.body.settings, req.user);
  return sendSuccessResponse(res, 200, 'Platform settings updated successfully', results);
});

// ============================================================
// 13. Audit Logs
// ============================================================
export const getAuditLogs = asyncHandler(async (req, res) => {
  const result = await auditService.getAuditLogs(req.query);
  return sendSuccessResponse(res, 200, 'Audit logs fetched successfully', result);
});

// ============================================================
// 14. Analytics
// ============================================================
export const getUserGrowthTrends = asyncHandler(async (req, res) => {
  const trends = await analyticsService.getUserGrowthTrends(req.query.days ? Number(req.query.days) : 30);
  return sendSuccessResponse(res, 200, 'User growth trends fetched successfully', trends);
});

export const getJobPostingTrends = asyncHandler(async (req, res) => {
  const trends = await analyticsService.getJobPostingTrends(req.query.days ? Number(req.query.days) : 30);
  return sendSuccessResponse(res, 200, 'Job posting trends fetched successfully', trends);
});

export const getCategoryBreakdown = asyncHandler(async (req, res) => {
  const breakdown = await analyticsService.getCategoryBreakdown();
  return sendSuccessResponse(res, 200, 'Category breakdown fetched successfully', breakdown);
});

export const getGeographicDistribution = asyncHandler(async (req, res) => {
  const geo = await analyticsService.getGeographicDistribution();
  return sendSuccessResponse(res, 200, 'Geographic distribution fetched successfully', geo);
});

// ============================================================
// 15. Admin Notifications
// ============================================================
export const broadcastNotification = asyncHandler(async (req, res) => {
  const result = await notificationService.broadcastNotification(req.body, req.user);
  return sendSuccessResponse(res, 200, `Broadcast sent to ${result.recipientCount} user(s)`, result);
});

export const sendTargetedNotification = asyncHandler(async (req, res) => {
  const result = await notificationService.sendTargetedNotification(req.body, req.user);
  return sendSuccessResponse(res, 200, `Targeted notification sent to ${result.recipientCount} user(s)`, result);
});
