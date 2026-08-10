import { Job } from '../models/Job.js';
import { Report } from '../models/Report.js';
import { AdminReview } from '../models/AdminReview.js';
import * as adminRepo from '../repositories/adminRepository.js';
import { createNotificationService } from './notificationService.js';
import { NOTIFICATION_TYPE } from '../models/Notification.js';
import { AppError } from '../utils/appError.js';
import { logAuditEvent } from './auditLogger.js';
import { AUDIT_CATEGORY, AUDIT_SEVERITY, JOB_STATUS } from '../constants/index.js';

/**
 * Admin Job Moderation Service
 */

export const getJobs = async (query) => {
  return adminRepo.getJobsPaginated(query);
};

export const getJobById = async (jobId) => {
  const job = await Job.findOne({ _id: jobId })
    .populate('farmer', 'name email mobile profileImage role trustVerificationId identityVerified')
    .lean();

  if (!job) throw new AppError('Job not found', 404);
  return job;
};

/**
 * Fetch Full Job Moderation Overview (Job + Farmer + Reports attached)
 */
export const getJobModerationOverview = async (jobId) => {
  const job = await Job.findOne({ _id: jobId })
    .populate({
      path: 'farmer',
      select: 'name email mobile profileImage role trustVerificationId identityVerified',
      populate: {
        path: 'trustVerificationId',
        select: 'trustScore trustLevel completedJobs averageRating',
      },
    })
    .lean();

  if (!job) throw new AppError('Job not found', 404);

  // Fetch reports attached to this job
  const reports = await Report.find({ reportedJob: jobId, isDeleted: { $ne: true } })
    .populate('reporter', 'name email role')
    .select('+internalNotes')
    .sort({ createdAt: -1 })
    .lean();

  return {
    job,
    farmer: job.farmer,
    reports: reports || [],
  };
};

/**
 * Moderation Action Dispatcher: Flag, Hide, Restore, Close, Remove
 */
export const moderateJobAction = async (jobId, { action, reason = '' }, adminUser) => {
  const job = await Job.findOne({ _id: jobId });
  if (!job) throw new AppError('Job not found', 404);

  const previousStatus = job.status;
  let newStatus = previousStatus;

  if (action === 'flag') {
    newStatus = JOB_STATUS.FLAGGED;
    job.isFlagged = true;
    job.flaggedReason = reason;
  } else if (action === 'hide') {
    newStatus = JOB_STATUS.HIDDEN;
    job.isHidden = true;
    job.hiddenReason = reason;
  } else if (action === 'restore') {
    newStatus = JOB_STATUS.ACTIVE;
    job.isFlagged = false;
    job.isHidden = false;
    job.isDeleted = false;
  } else if (action === 'close') {
    newStatus = JOB_STATUS.CLOSED;
  } else if (action === 'remove') {
    newStatus = JOB_STATUS.REMOVED;
    await job.softDelete();
  } else {
    throw new AppError(`Invalid moderation action: ${action}`, 400);
  }

  job.status = newStatus;
  job.moderatedBy = adminUser._id;
  job.moderatedAt = new Date();
  await job.save();

  // Record AdminReview
  await AdminReview.create({
    reviewer: adminUser._id,
    targetUser: job.farmer,
    verificationType: 'JOB_MODERATION',
    targetEntity: { kind: 'Job', id: job._id },
    decision: action === 'restore' ? 'APPROVED' : action === 'remove' ? 'REJECTED' : 'FLAGGED',
    reviewNotes: reason || `Job set to ${action}`,
  });

  // Audit event
  await logAuditEvent({
    actor: adminUser._id,
    action: `JOB_MODERATION_${action.toUpperCase()}`,
    status: 'SUCCESS',
    details: { jobId, jobTitle: job.title, reason, previousStatus, newStatus },
    resource: { kind: 'Job', id: jobId },
    category: AUDIT_CATEGORY.MODERATION,
    severity: ['remove', 'flag', 'hide'].includes(action) ? AUDIT_SEVERITY.WARNING : AUDIT_SEVERITY.INFO,
  });

  // Notify Farmer via Socket.IO
  try {
    let notifTitle = 'Job Posting Updated by Moderation';
    let notifMessage = `Your job posting "${job.title}" status has been updated to: ${newStatus}.${reason ? ` Reason: "${reason}"` : ''}`;

    if (action === 'restore') {
      notifTitle = 'Job Posting Restored Live 🎉';
      notifMessage = `Your job posting "${job.title}" has been restored to Active status on AgriConnect.`;
    } else if (action === 'remove' || action === 'hide') {
      notifTitle = 'Job Posting Hidden / Moderated ⚠️';
      notifMessage = `Your job posting "${job.title}" was ${action === 'remove' ? 'removed' : 'hidden'} by admin moderation.${reason ? ` Reason: "${reason}"` : ''}`;
    }

    await createNotificationService({
      type: NOTIFICATION_TYPE.JOB_CLOSED,
      recipientId: job.farmer,
      senderId: adminUser._id,
      payload: {
        jobTitle: job.title,
        jobId: job._id,
        reason,
        status: newStatus,
      },
    });
  } catch (err) {
    // Non-blocking notification
  }

  return job;
};

export const featureJob = async (jobId, { featured, durationDays = 7 }, adminUser) => {
  const job = await Job.findOne({ _id: jobId });
  if (!job) throw new AppError('Job not found', 404);

  if (featured) {
    job.isFeatured = true;
    job.featuredStartDate = new Date();
    job.featuredEndDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
  } else {
    job.isFeatured = false;
    job.featuredStartDate = null;
    job.featuredEndDate = null;
  }

  await job.save();

  await logAuditEvent({
    actor: adminUser._id,
    action: featured ? 'JOB_FEATURED' : 'JOB_UNFEATURED',
    status: 'SUCCESS',
    details: { jobId, jobTitle: job.title, durationDays },
    resource: { kind: 'Job', id: jobId },
    category: AUDIT_CATEGORY.MODERATION,
    severity: AUDIT_SEVERITY.INFO,
  });

  return job;
};
