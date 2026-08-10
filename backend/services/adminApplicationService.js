import { Application } from '../models/Application.js';
import { AdminReview } from '../models/AdminReview.js';
import * as adminRepo from '../repositories/adminRepository.js';
import { AppError } from '../utils/appError.js';
import { logAuditEvent } from './auditLogger.js';
import { AUDIT_CATEGORY, AUDIT_SEVERITY, ADMIN_PERMISSIONS } from '../constants/index.js';

/**
 * Admin Application Monitoring Service
 */

export const getApplications = async (query) => {
  return adminRepo.getApplicationsPaginated(query);
};

export const getApplicationStats = async () => {
  return adminRepo.getApplicationStats();
};

export const getApplicationById = async (applicationId) => {
  const app = await Application.findOne({ _id: applicationId, isDeleted: { $ne: true } })
    .populate({
      path: 'worker',
      select: 'name email mobile role profileImage isVerified identityVerified trustVerificationId',
      populate: {
        path: 'trustVerificationId',
        select: 'trustScore trustLevel averageRating completedJobs',
      },
    })
    .populate('farmer', 'name email mobile role profileImage')
    .populate('job', 'title category dailyWage status location')
    .lean();

  if (!app) throw new AppError('Application record not found', 404);
  return app;
};

/**
 * Moderate Application Status — Strictly Guarded by explicit permission `applications.manage`
 */
export const moderateApplication = async (applicationId, { status, adminNotes = '' }, adminUser) => {
  // Guard check: Require explicit applications.manage permission
  const hasManagePermission =
    adminUser.role === 'admin' ||
    (adminUser.adminRole && adminUser.adminRole.permissions?.includes(ADMIN_PERMISSIONS.APPLICATIONS_MANAGE));

  if (!hasManagePermission) {
    throw new AppError('Permission Denied: Explicit "applications.manage" permission is required to override candidate hiring decisions.', 403);
  }

  const app = await Application.findOne({ _id: applicationId, isDeleted: { $ne: true } });
  if (!app) throw new AppError('Application record not found', 404);

  const previousStatus = app.status;
  app.status = status;
  app.notes = adminNotes || app.notes;

  if (status === 'Hired' || status === 'Accepted') {
    app.hiredDate = new Date();
  } else if (status === 'Rejected') {
    app.rejectedDate = new Date();
  } else if (status === 'Cancelled') {
    app.cancelledDate = new Date();
  }

  await app.save();

  // Record AdminReview
  await AdminReview.create({
    reviewer: adminUser._id,
    targetUser: app.worker,
    verificationType: 'APPLICATION_MODERATION',
    targetEntity: { kind: 'Application', id: app._id },
    decision: status === 'Hired' || status === 'Accepted' ? 'APPROVED' : 'REJECTED',
    reviewNotes: adminNotes || `Admin override status to ${status}`,
  });

  await logAuditEvent({
    actor: adminUser._id,
    action: `APPLICATION_MODERATED_${status.toUpperCase()}`,
    status: 'SUCCESS',
    details: { applicationId, previousStatus, newStatus: status, adminNotes },
    resource: { kind: 'Application', id: applicationId },
    category: AUDIT_CATEGORY.ADMIN,
    severity: AUDIT_SEVERITY.WARNING,
  });

  return app;
};

/**
 * Flag Suspicious Application Activity
 */
export const flagSuspiciousApplication = async (applicationId, { isFlagged = true, reason = '' }, adminUser) => {
  const app = await Application.findOne({ _id: applicationId });
  if (!app) throw new AppError('Application record not found', 404);

  app.isFlagged = isFlagged;
  app.flaggedReason = reason;
  await app.save();

  await logAuditEvent({
    actor: adminUser._id,
    action: isFlagged ? 'APPLICATION_FLAGGED_SUSPICIOUS' : 'APPLICATION_UNFLAGGED',
    status: 'SUCCESS',
    details: { applicationId, reason },
    resource: { kind: 'Application', id: applicationId },
    category: AUDIT_CATEGORY.ADMIN,
    severity: AUDIT_SEVERITY.WARNING,
  });

  return app;
};
