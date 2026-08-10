import * as reportRepo from '../repositories/reportRepository.js';
import { AdminReview } from '../models/AdminReview.js';
import { AppError } from '../utils/appError.js';
import { logAuditEvent } from './auditLogger.js';
import { REPORT_STATUS, REPORT_PRIORITY, AUDIT_CATEGORY, AUDIT_SEVERITY } from '../constants/index.js';

/**
 * Report & Complaints Service
 */

export const createReport = async (reporterId, reportData) => {
  const {
    reportedUser,
    reportedJob,
    reportedApplication,
    reportedCertificate,
    category,
    title,
    description,
    evidence,
    priority,
  } = reportData;

  // Priority Auto-detection
  let determinedPriority = priority || REPORT_PRIORITY.MEDIUM;
  if (['FRAUD', 'HARASSMENT', 'VERIFICATION_ABUSE'].includes(category)) {
    determinedPriority = REPORT_PRIORITY.HIGH;
  }

  const report = await reportRepo.create({
    reporter: reporterId,
    reportedUser: reportedUser || null,
    reportedJob: reportedJob || null,
    reportedApplication: reportedApplication || null,
    reportedCertificate: reportedCertificate || null,
    category,
    title,
    description,
    evidence: evidence || [],
    status: REPORT_STATUS.PENDING,
    priority: determinedPriority,
  });

  await logAuditEvent({
    actor: reporterId,
    action: 'REPORT_SUBMITTED',
    status: 'SUCCESS',
    details: { reportId: report._id, title, category, priority: determinedPriority },
    resource: { kind: 'Report', id: report._id },
    category: AUDIT_CATEGORY.ADMIN,
    severity: AUDIT_SEVERITY.INFO,
  });

  return report;
};

export const getReports = async (query) => {
  return reportRepo.getPaginated(query);
};

export const getReportById = async (reportId, isAdmin = false) => {
  const report = await reportRepo.findById(reportId, isAdmin);
  if (!report) throw new AppError('Report not found', 404);
  return report;
};

export const getMyReports = async (reporterId, query) => {
  return reportRepo.getByReporter(reporterId, query);
};

export const assignReport = async (reportId, assigneeId, adminUser) => {
  const report = await reportRepo.updateById(reportId, {
    assignedTo: assigneeId,
    status: REPORT_STATUS.INVESTIGATING,
  });

  if (!report) throw new AppError('Report not found', 404);

  await logAuditEvent({
    actor: adminUser._id,
    action: 'REPORT_ASSIGNED',
    status: 'SUCCESS',
    details: { reportId, assignedTo: assigneeId },
    resource: { kind: 'Report', id: reportId },
    category: AUDIT_CATEGORY.ADMIN,
    severity: AUDIT_SEVERITY.INFO,
  });

  return report;
};

/**
 * Admin: Update Report Status (RESOLVED, REJECTED, ESCALATED, INVESTIGATING) + Add Internal Notes
 */
export const reviewReport = async (reportId, { status, resolution = '', internalNotes = '', priority }, adminUser) => {
  const allowedStatuses = [
    REPORT_STATUS.PENDING,
    REPORT_STATUS.INVESTIGATING,
    REPORT_STATUS.RESOLVED,
    REPORT_STATUS.REJECTED,
    REPORT_STATUS.ESCALATED,
  ];

  if (status && !allowedStatuses.includes(status)) {
    throw new AppError(`Invalid status. Allowed: ${allowedStatuses.join(', ')}`, 400);
  }

  const updateData = {};
  if (status) updateData.status = status;
  if (resolution !== undefined) updateData.resolution = resolution;
  if (internalNotes !== undefined) updateData.internalNotes = internalNotes;
  if (priority && Object.values(REPORT_PRIORITY).includes(priority)) updateData.priority = priority;

  if (status === REPORT_STATUS.RESOLVED || status === REPORT_STATUS.REJECTED) {
    updateData.resolvedBy = adminUser._id;
    updateData.resolvedAt = new Date();
  }

  const report = await reportRepo.updateById(reportId, updateData);
  if (!report) throw new AppError('Report not found', 404);

  // Record AdminReview
  await AdminReview.create({
    reviewer: adminUser._id,
    targetUser: report.reporter,
    verificationType: 'REPORT_RESOLUTION',
    targetEntity: { kind: 'Report', id: report._id },
    decision: status === REPORT_STATUS.RESOLVED ? 'APPROVED' : status === REPORT_STATUS.REJECTED ? 'REJECTED' : 'FLAGGED',
    reviewNotes: resolution || internalNotes || `Report set to ${status}`,
  });

  await logAuditEvent({
    actor: adminUser._id,
    action: `REPORT_${status || 'UPDATED'}`,
    status: 'SUCCESS',
    details: { reportId, status, priority, resolution, internalNotes },
    resource: { kind: 'Report', id: reportId },
    category: AUDIT_CATEGORY.ADMIN,
    severity: status === REPORT_STATUS.ESCALATED ? AUDIT_SEVERITY.WARNING : AUDIT_SEVERITY.INFO,
  });

  return report;
};
