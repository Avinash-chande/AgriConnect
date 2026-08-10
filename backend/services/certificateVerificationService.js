import { CertificateVerification } from '../models/CertificateVerification.js';
import { TrustScoreService } from './TrustScoreService.js';
import { AdminReview } from '../models/AdminReview.js';
import { VerificationHistory } from '../models/VerificationHistory.js';
import { Notification, NOTIFICATION_TYPE } from '../models/Notification.js';
import { createNotificationService } from './notificationService.js';
import { AppError } from '../utils/appError.js';
import { logAuditEvent } from './auditLogger.js';
import {
  CERTIFICATE_STATUS,
  CERTIFICATE_TYPE,
  AUDIT_CATEGORY,
  AUDIT_SEVERITY,
} from '../constants/index.js';

/**
 * Worker: Submit a new Skill Certificate
 */
export const submitCertificate = async (userId, data) => {
  const { certificateType, title, issuer, certificateNumber, documentReference } = data;

  if (!certificateType || !title || !documentReference) {
    throw new AppError('Please provide certificate type, title, and document file reference.', 400);
  }

  if (!Object.values(CERTIFICATE_TYPE).includes(certificateType)) {
    throw new AppError(`Invalid certificate type. Allowed: ${Object.values(CERTIFICATE_TYPE).join(', ')}`, 400);
  }

  const certificate = await CertificateVerification.create({
    user: userId,
    certificateType,
    title,
    issuer: issuer || '',
    certificateNumber: certificateNumber || '',
    documentReference,
    status: CERTIFICATE_STATUS.PENDING,
    submittedAt: new Date(),
  });

  // Log submission audit
  await logAuditEvent({
    actor: userId,
    action: 'CERTIFICATE_SUBMITTED',
    status: 'SUCCESS',
    details: { certificateId: certificate._id, certificateType, title },
    resource: { kind: 'CertificateVerification', id: certificate._id },
    category: AUDIT_CATEGORY.VERIFICATION,
    severity: AUDIT_SEVERITY.INFO,
  });

  return certificate;
};

/**
 * Worker: Get own submitted certificates
 */
export const getWorkerCertificates = async (userId) => {
  return CertificateVerification.find({ user: userId })
    .sort({ createdAt: -1 })
    .lean();
};

/**
 * Admin: Get paginated certificate verification list
 */
export const getCertificatesForAdmin = async ({ page = 1, limit = 20, status = '', certificateType = '' } = {}) => {
  const filter = {};
  if (status) filter.status = status;
  if (certificateType) filter.certificateType = certificateType;

  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    CertificateVerification.find(filter)
      .populate('user', 'name email mobile role profileImage')
      .populate('reviewedBy', 'name email')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CertificateVerification.countDocuments(filter),
  ]);

  return {
    records,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
  };
};

/**
 * Secure Private Document Access (Worker owner or Authorized Admin)
 * Audits access in `accessLogs` and system audit trail
 */
export const getCertificateDocumentSecure = async (certificateId, requestingUser, ipAddress = '') => {
  const cert = await CertificateVerification.findById(certificateId).populate('user', 'name email');
  if (!cert) throw new AppError('Certificate record not found', 404);

  const isOwner = cert.user._id.toString() === requestingUser._id.toString();
  const isAdmin = requestingUser.role === 'admin' || requestingUser.adminRole;

  if (!isOwner && !isAdmin) {
    throw new AppError('Unauthorized: You do not have permission to view this private document.', 403);
  }

  // Audit document access in model
  cert.accessLogs.push({
    accessedBy: requestingUser._id,
    accessedAt: new Date(),
    ipAddress,
    purpose: isAdmin ? 'ADMIN_REVIEW' : 'WORKER_OWN_VIEW',
  });
  await cert.save();

  // System audit log
  await logAuditEvent({
    actor: requestingUser._id,
    action: 'PRIVATE_CERTIFICATE_DOCUMENT_ACCESSED',
    status: 'SUCCESS',
    details: { certificateId, isOwner, isAdmin, ipAddress },
    resource: { kind: 'CertificateVerification', id: certificateId },
    category: AUDIT_CATEGORY.SECURITY,
    severity: AUDIT_SEVERITY.INFO,
  });

  return {
    documentReference: cert.documentReference,
    title: cert.title,
    certificateType: cert.certificateType,
    user: cert.user,
    disclaimer: cert.identityDisclaimer,
  };
};

/**
 * Admin: Review Certificate (Approve, Reject, Request Resubmission)
 */
export const reviewCertificate = async (certificateId, { status, reviewNotes = '' }, adminUser) => {
  const allowedStatuses = [
    CERTIFICATE_STATUS.APPROVED,
    CERTIFICATE_STATUS.REJECTED,
    CERTIFICATE_STATUS.RESUBMISSION_REQUESTED,
  ];

  if (!allowedStatuses.includes(status)) {
    throw new AppError(`Invalid status. Must be one of: ${allowedStatuses.join(', ')}`, 400);
  }

  const certificate = await CertificateVerification.findById(certificateId);
  if (!certificate) throw new AppError('Certificate not found', 404);

  const previousState = certificate.toObject();

  certificate.status = status;
  certificate.reviewedBy = adminUser._id;
  certificate.reviewedAt = new Date();
  certificate.reviewNotes = reviewNotes;

  await certificate.save();

  // Create AdminReview record
  await AdminReview.create({
    reviewer: adminUser._id,
    targetUser: certificate.user,
    verificationType: 'CERTIFICATE_VERIFICATION',
    targetEntity: { kind: 'CertificateVerification', id: certificate._id },
    decision: status === CERTIFICATE_STATUS.APPROVED ? 'APPROVED' : status === CERTIFICATE_STATUS.REJECTED ? 'REJECTED' : 'FLAGGED',
    reviewNotes,
  });

  // Record VerificationHistory
  await VerificationHistory.create({
    user: certificate.user,
    verificationSystem: 'SYSTEM_A_TRUST',
    entityId: certificate._id,
    previousState,
    newState: certificate.toObject(),
    changedBy: adminUser._id,
    changeReason: `Admin skill certificate review updated status to ${status}`,
  });

  // Recalculate Trust Score & Badges via TrustScoreService
  const updatedTrustProfile = await TrustScoreService.updateTrustScore(
    certificate.user,
    `CERTIFICATE_${status}`,
    { kind: 'CertificateVerification', id: certificate._id }
  );

  // Send Notification to Worker via Notification Service & Socket.IO
  try {
    let notifType = NOTIFICATION_TYPE.CERTIFICATE_SUBMITTED;
    if (status === CERTIFICATE_STATUS.APPROVED) {
      notifType = NOTIFICATION_TYPE.CERTIFICATE_APPROVED;
    } else if (status === CERTIFICATE_STATUS.REJECTED) {
      notifType = NOTIFICATION_TYPE.CERTIFICATE_REJECTED;
    } else if (status === CERTIFICATE_STATUS.RESUBMISSION_REQUESTED) {
      notifType = NOTIFICATION_TYPE.CERTIFICATE_RESUBMISSION_REQUIRED;
    }

    await createNotificationService({
      type: notifType,
      recipientId: certificate.user,
      senderId: adminUser._id,
      payload: {
        title: certificate.title,
        reason: reviewNotes,
        certificateId: certificate._id,
        trustScore: updatedTrustProfile.trustScore,
      },
    });
  } catch (err) {
    // Non-blocking notification
  }

  await logAuditEvent({
    actor: adminUser._id,
    action: `CERTIFICATE_${status}`,
    status: 'SUCCESS',
    details: { certificateId, userId: certificate.user, status, reviewNotes },
    resource: { kind: 'CertificateVerification', id: certificateId },
    category: AUDIT_CATEGORY.ADMIN,
    severity: AUDIT_SEVERITY.INFO,
  });

  return certificate;
};
