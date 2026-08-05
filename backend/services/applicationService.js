import { Job } from '../models/Job.js';
import { User } from '../models/User.js';
import { findJobByIdRepo } from '../repositories/jobRepository.js';
import {
  createApplicationRepo,
  findApplicationByJobAndWorkerRepo,
  findApplicationByIdRepo,
  findApplicationsByWorkerRepo,
  findApplicationsByFarmerRepo,
  findApplicationsByJobRepo,
  countApplicationsRepo,
  getApplicationStatsByFarmerRepo,
  bulkRejectOtherApplicationsRepo,
  getDashboardStatsByFarmerRepo,
} from '../repositories/applicationRepository.js';
import {
  sendJobApplicationNotificationEmail,
  sendApplicationWithdrawalNotificationEmail,
  sendApplicationAcceptanceNotificationEmail,
  sendApplicationRejectionNotificationEmail,
  sendApplicationShortlistNotificationEmail,
  sendCancelHiringNotificationEmail,
} from './emailService.js';
import {
  notifyApplicationApplied,
  notifyApplicationAccepted,
  notifyApplicationRejected,
  notifyApplicationShortlisted,
  notifyApplicationWithdrawn,
  notifyApplicationCancelled,
  notifyApplicationHired,
} from './notificationService.js';
import { emitToUser } from '../socket/socketService.js';
import { SOCKET_EVENTS } from '../socket/socketEvents.js';
import { AppError } from '../utils/appError.js';
import { HTTP_STATUS, JOB_STATUS, APPLICATION_STATUS } from '../constants/index.js';
import { logger } from '../utils/logger.js';
import { cacheService } from './cacheService.js';

/**
 * Service: Apply for a Job Posting (Worker Action)
 */
export const applyForJobService = async (worker, jobId, payload) => {
  const workerId = worker._id || worker;
  const workerName = worker.name || 'A worker';

  // 1. Verify Job existence and populate farmer details
  const job = await findJobByIdRepo(jobId, true);
  if (!job) {
    throw new AppError('Job posting not found', HTTP_STATUS.NOT_FOUND);
  }

  // 2. Validate Job Status (Must be Open / Active & non-expired)
  if (job.status !== JOB_STATUS.ACTIVE || job.isExpired) {
    throw new AppError('This job posting is closed or no longer accepting applications', HTTP_STATUS.BAD_REQUEST);
  }

  // 3. Validate Ownership (Worker cannot apply to own job)
  const farmerId = job.farmer._id ? job.farmer._id.toString() : job.farmer.toString();
  if (farmerId === workerId.toString()) {
    throw new AppError('You cannot apply to your own job posting', HTTP_STATUS.BAD_REQUEST);
  }

  // 4. Validate Duplicate Application (Worker cannot apply twice to the same job)
  const existingApp = await findApplicationByJobAndWorkerRepo(jobId, workerId);
  if (existingApp) {
    throw new AppError('You have already submitted an application for this job posting', HTTP_STATUS.CONFLICT);
  }

  // 5. Store Application
  const applicationData = {
    worker: workerId,
    farmer: farmerId,
    job: jobId,
    coverLetter: payload.coverLetter || '',
    expectedJoiningDate: payload.expectedJoiningDate || null,
    expectedDailyWage: payload.expectedDailyWage || null,
    notes: payload.notes || '',
  };

  let application;
  try {
    application = await createApplicationRepo(applicationData);
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError('You have already submitted an application for this job posting', HTTP_STATUS.CONFLICT);
    }
    throw error;
  }

  // 6. Increment Job Application Count
  await Job.findByIdAndUpdate(jobId, { $inc: { totalApplications: 1 } });

  // 7. Send Notification Email & Database Notification to Farmer (Non-blocking)
  if (job.farmer && job.farmer.email) {
    sendJobApplicationNotificationEmail({
      farmerEmail: job.farmer.email,
      farmerName: job.farmer.name,
      workerName: workerName,
      jobTitle: job.title,
      applicationId: application._id,
    }).catch((emailError) => {
      logger.warn(`Failed to send job application notification email to farmer (${job.farmer.email}): ${emailError.message}`);
    });
  }

  // Database Notification to Farmer
  notifyApplicationApplied({
    recipientId: farmerId,
    senderId: workerId,
    resourceId: application._id,
    resourceKind: 'Application',
    payload: {
      workerName,
      jobTitle: job.title,
      applicationId: application._id,
      jobId: job._id,
    },
  });

  // Real-time socket event to farmer
  emitToUser(farmerId, SOCKET_EVENTS.APPLICATION_NEW, {
    applicationId: application._id,
    jobId: job._id,
    jobTitle: job.title,
    workerName,
    status: application.status,
  });

  // Return full populated application document
  return await findApplicationByIdRepo(application._id, true);
};

/**
 * Service: Fetch applications submitted by logged-in Worker with Pagination, Sorting, Status Filter & Search
 */
export const getMyApplicationsService = async (workerId, queryParams = {}) => {
  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const filter = {};

  // 1. Status Filter
  if (queryParams.status && queryParams.status !== 'ALL') {
    filter.status = queryParams.status;
  }

  // 2. Search Query (Matches coverLetter, notes, or Job title/category/cropType)
  if (queryParams.search && queryParams.search.trim()) {
    const searchTerm = queryParams.search.trim();
    const searchRegex = new RegExp(searchTerm, 'i');

    const matchingJobs = await Job.find({
      $or: [
        { title: searchRegex },
        { category: searchRegex },
        { cropType: searchRegex },
      ],
      isDeleted: { $ne: true },
    }).select('_id');

    const matchingJobIds = matchingJobs.map((j) => j._id);

    filter.$or = [
      { coverLetter: searchRegex },
      { notes: searchRegex },
      { job: { $in: matchingJobIds } },
    ];
  }

  // 3. Sorting Options (Newest vs Oldest)
  let sortOption = { createdAt: -1 };
  if (queryParams.sort === 'oldest' || queryParams.sort === 'createdAt_asc') {
    sortOption = { createdAt: 1 };
  } else if (queryParams.sort === 'newest' || queryParams.sort === 'createdAt_desc') {
    sortOption = { createdAt: -1 };
  }

  // 4. Fetch Applications & Total Count
  const applications = await findApplicationsByWorkerRepo(
    workerId,
    filter,
    skip,
    limit,
    sortOption
  );

  const total = await countApplicationsRepo({ ...filter, worker: workerId });
  const totalPages = Math.ceil(total / limit) || 1;

  return {
    applications,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Service: Fetch applications received by logged-in Farmer with Pagination, Filters, Search, Worker Population & Statistics
 */
export const getFarmerReceivedApplicationsService = async (farmerId, queryParams = {}) => {
  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const filter = {};

  // 1. Status Filter
  if (queryParams.status && queryParams.status !== 'ALL') {
    filter.status = queryParams.status;
  }

  // 2. Specific Job ID Filter
  if (queryParams.jobId) {
    filter.job = queryParams.jobId;
  }

  // 3. Search Filter (Worker name/email/mobile, Cover Letter, or Job title)
  if (queryParams.search && queryParams.search.trim()) {
    const searchTerm = queryParams.search.trim();
    const searchRegex = new RegExp(searchTerm, 'i');

    const [matchingWorkers, matchingJobs] = await Promise.all([
      User.find({
        $or: [{ name: searchRegex }, { email: searchRegex }, { mobile: searchRegex }],
      }).select('_id'),
      Job.find({
        farmer: farmerId,
        $or: [{ title: searchRegex }, { category: searchRegex }, { cropType: searchRegex }],
      }).select('_id'),
    ]);

    const workerIds = matchingWorkers.map((w) => w._id);
    const jobIds = matchingJobs.map((j) => j._id);

    filter.$or = [
      { coverLetter: searchRegex },
      { notes: searchRegex },
      { worker: { $in: workerIds } },
      { job: { $in: jobIds } },
    ];
  }

  // 4. Sorting Options
  let sortOption = { createdAt: -1 };
  if (queryParams.sort === 'oldest' || queryParams.sort === 'createdAt_asc') {
    sortOption = { createdAt: 1 };
  } else if (queryParams.sort === 'newest' || queryParams.sort === 'createdAt_desc') {
    sortOption = { createdAt: -1 };
  }

  // 5. Fetch Applications, Count, and Aggregated Statistics concurrently
  const [applications, total, stats] = await Promise.all([
    findApplicationsByFarmerRepo(farmerId, filter, skip, limit, sortOption),
    countApplicationsRepo({ ...filter, farmer: farmerId }),
    getApplicationStatsByFarmerRepo(farmerId),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    applications,
    statistics: stats,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Service: Withdraw Application (Worker Action)
 */
export const withdrawApplicationService = async (worker, applicationId) => {
  const workerId = worker._id || worker;
  const workerName = worker.name || 'Applicant';

  // 1. Fetch application record with populated job and farmer refs
  const application = await findApplicationByIdRepo(applicationId, true);
  if (!application) {
    throw new AppError('Application not found', HTTP_STATUS.NOT_FOUND);
  }

  // 2. Requirement: Only applicant can withdraw
  const applicantId = application.worker
    ? (application.worker._id || application.worker).toString()
    : '';

  if (applicantId !== workerId.toString()) {
    throw new AppError(
      'Forbidden: Only the original applicant can withdraw this application',
      HTTP_STATUS.FORBIDDEN
    );
  }

  // 3. Requirement: Cannot withdraw after hiring
  if (application.status === APPLICATION_STATUS.HIRED) {
    throw new AppError(
      'Cannot withdraw application after being hired',
      HTTP_STATUS.BAD_REQUEST
    );
  }

  // 4. Validate current status
  if (application.status === APPLICATION_STATUS.WITHDRAWN) {
    throw new AppError(
      'Application has already been withdrawn',
      HTTP_STATUS.BAD_REQUEST
    );
  }

  // 5. Update Application status & timestamp
  application.status = APPLICATION_STATUS.WITHDRAWN;
  application.withdrawnDate = new Date();
  await application.save();

  // 6. Decrease Application Count on Job (Ensuring non-negative count)
  if (application.job && application.job._id) {
    await Job.updateOne(
      { _id: application.job._id, totalApplications: { $gt: 0 } },
      { $inc: { totalApplications: -1 } }
    );
  }

  // 7. Notify Farmer via Email & Database Notification
  if (application.farmer && application.farmer.email) {
    sendApplicationWithdrawalNotificationEmail({
      farmerEmail: application.farmer.email,
      farmerName: application.farmer.name,
      workerName: workerName,
      jobTitle: application.job?.title || 'Job Posting',
      applicationId: application._id,
    }).catch((emailError) => {
      logger.warn(
        `Failed to send application withdrawal notification email to farmer (${application.farmer.email}): ${emailError.message}`
      );
    });
  }

  // Database Notification to Farmer
  const farmerRecipientId = application.farmer?._id || application.farmer;
  if (farmerRecipientId) {
    notifyApplicationWithdrawn({
      recipientId: farmerRecipientId,
      senderId: workerId,
      resourceId: application._id,
      resourceKind: 'Application',
      payload: {
        workerName,
        jobTitle: application.job?.title || 'Job Posting',
        applicationId: application._id,
        jobId: application.job?._id || application.job,
      },
    });
  }

  return application;
};

/**
 * Service: Accept Job Application (Farmer Action)
 */
export const acceptApplicationService = async (farmer, applicationId, options = {}) => {
  const farmerId = farmer._id || farmer;
  const farmerName = farmer.name || 'Farmer';

  // 1. Fetch application record with populated worker, farmer, and job refs
  const application = await findApplicationByIdRepo(applicationId, true);
  if (!application) {
    throw new AppError('Application not found', HTTP_STATUS.NOT_FOUND);
  }

  // 2. Validate Ownership (Farmer must own the job)
  const jobFarmerId = application.farmer
    ? (application.farmer._id || application.farmer).toString()
    : '';

  if (jobFarmerId !== farmerId.toString()) {
    throw new AppError(
      'Forbidden: You can only accept applications for your own job postings',
      HTTP_STATUS.FORBIDDEN
    );
  }

  // 3. Validate Current Status (Cannot accept withdrawn or cancelled applications)
  if (application.status === APPLICATION_STATUS.WITHDRAWN) {
    throw new AppError(
      'Cannot accept an application that has been withdrawn by the applicant',
      HTTP_STATUS.BAD_REQUEST
    );
  }

  if (application.status === APPLICATION_STATUS.CANCELLED) {
    throw new AppError('Cannot accept a cancelled application', HTTP_STATUS.BAD_REQUEST);
  }

  // 4. Update Application Status & Feedback
  const targetStatus = options.status === 'Hired' ? APPLICATION_STATUS.HIRED : APPLICATION_STATUS.ACCEPTED;
  application.status = targetStatus;
  if (options.farmerFeedback) {
    application.farmerFeedback = options.farmerFeedback;
  }
  await application.save();

  // 5. Increase Hired Workers Count & Auto-Update Job Status if Capacity Reached
  const jobId = application.job._id || application.job;
  const updatedJob = await Job.findByIdAndUpdate(
    jobId,
    { $inc: { hiredWorkersCount: 1 } },
    { new: true }
  );

  if (
    updatedJob &&
    updatedJob.numberOfWorkers &&
    updatedJob.hiredWorkersCount >= updatedJob.numberOfWorkers
  ) {
    updatedJob.status = JOB_STATUS.FILLED;
    await updatedJob.save();
  }

  // 6. Reject Remaining Applicants Optionally
  if (options.rejectOthers) {
    await bulkRejectOtherApplicationsRepo(
      jobId,
      application._id,
      options.rejectionFeedback || 'Position filled by another candidate'
    );
  }

  // 7. Send Notification Email & Database Notification to Worker
  if (application.worker && application.worker.email) {
    sendApplicationAcceptanceNotificationEmail({
      workerEmail: application.worker.email,
      workerName: application.worker.name,
      farmerName: farmerName,
      jobTitle: application.job?.title || 'Job Posting',
      applicationId: application._id,
      feedback: options.farmerFeedback,
    }).catch((emailError) => {
      logger.warn(
        `Failed to send application acceptance notification email to worker (${application.worker.email}): ${emailError.message}`
      );
    });
  }

  // Database Notification to Worker
  const workerRecipientId = application.worker?._id || application.worker;
  if (workerRecipientId) {
    const notifyFn = targetStatus === APPLICATION_STATUS.HIRED ? notifyApplicationHired : notifyApplicationAccepted;
    notifyFn({
      recipientId: workerRecipientId,
      senderId: farmerId,
      resourceId: application._id,
      resourceKind: 'Application',
      payload: {
        farmerName,
        jobTitle: application.job?.title || 'Job Posting',
        applicationId: application._id,
        jobId: application.job?._id || application.job,
      },
    });

    emitToUser(workerRecipientId, SOCKET_EVENTS.APPLICATION_STATUS_UPDATED, {
      applicationId: application._id,
      status: targetStatus,
      jobTitle: application.job?.title || 'Job Posting',
      jobId: application.job?._id || application.job,
      farmerName,
    });
  }

  // 8. Retrieve updated real-time farmer dashboard statistics
  const updatedStats = await getApplicationStatsByFarmerRepo(farmerId);

  return {
    application,
    job: updatedJob,
    statistics: updatedStats,
  };
};

/**
 * Service: Reject Job Application (Farmer Action)
 */
export const rejectApplicationService = async (farmer, applicationId, payload = {}) => {
  const farmerId = farmer._id || farmer;
  const farmerName = farmer.name || 'Farmer';

  // 1. Fetch application record with populated worker, farmer, and job refs
  const application = await findApplicationByIdRepo(applicationId, true);
  if (!application) {
    throw new AppError('Application not found', HTTP_STATUS.NOT_FOUND);
  }

  // 2. Validate Ownership (Farmer must own the job)
  const jobFarmerId = application.farmer
    ? (application.farmer._id || application.farmer).toString()
    : '';

  if (jobFarmerId !== farmerId.toString()) {
    throw new AppError(
      'Forbidden: You can only reject applications for your own job postings',
      HTTP_STATUS.FORBIDDEN
    );
  }

  // 3. Validate Current Status (Cannot reject already rejected, withdrawn, or cancelled applications)
  if (application.status === APPLICATION_STATUS.REJECTED) {
    throw new AppError('Application has already been rejected', HTTP_STATUS.BAD_REQUEST);
  }

  if (application.status === APPLICATION_STATUS.WITHDRAWN) {
    throw new AppError(
      'Cannot reject an application that has been withdrawn by the applicant',
      HTTP_STATUS.BAD_REQUEST
    );
  }

  // 4. Update Application Status & Store Rejection Reason
  application.status = APPLICATION_STATUS.REJECTED;
  application.rejectedDate = new Date();
  const reasonText = payload.reason || payload.farmerFeedback || payload.rejectionReason || '';
  if (reasonText) {
    application.farmerFeedback = reasonText;
  }
  await application.save();

  // 5. Send Notification Email & Database Notification to Worker
  if (application.worker && application.worker.email) {
    sendApplicationRejectionNotificationEmail({
      workerEmail: application.worker.email,
      workerName: application.worker.name,
      farmerName: farmerName,
      jobTitle: application.job?.title || 'Job Posting',
      applicationId: application._id,
      reason: reasonText,
    }).catch((emailError) => {
      logger.warn(
        `Failed to send application rejection notification email to worker (${application.worker.email}): ${emailError.message}`
      );
    });
  }

  // Database Notification to Worker
  const workerRecipientId = application.worker?._id || application.worker;
  if (workerRecipientId) {
    notifyApplicationRejected({
      recipientId: workerRecipientId,
      senderId: farmerId,
      resourceId: application._id,
      resourceKind: 'Application',
      payload: {
        farmerName,
        jobTitle: application.job?.title || 'Job Posting',
        applicationId: application._id,
        jobId: application.job?._id || application.job,
        reason: reasonText,
      },
    });

    emitToUser(workerRecipientId, SOCKET_EVENTS.APPLICATION_STATUS_UPDATED, {
      applicationId: application._id,
      status: APPLICATION_STATUS.REJECTED,
      jobTitle: application.job?.title || 'Job Posting',
      jobId: application.job?._id || application.job,
      farmerName,
    });
  }

  // 6. Retrieve updated real-time farmer dashboard statistics
  const updatedStats = await getApplicationStatsByFarmerRepo(farmerId);

  return {
    application,
    statistics: updatedStats,
  };
};

/**
 * Service: Toggle Shortlist Status of Job Application (Farmer Action)
 */
export const toggleShortlistApplicationService = async (farmer, applicationId) => {
  const farmerId = farmer._id || farmer;
  const farmerName = farmer.name || 'Farmer';

  // 1. Fetch application record with populated worker, farmer, and job refs
  const application = await findApplicationByIdRepo(applicationId, true);
  if (!application) {
    throw new AppError('Application not found', HTTP_STATUS.NOT_FOUND);
  }

  // 2. Validate Ownership (Farmer must own the job)
  const jobFarmerId = application.farmer
    ? (application.farmer._id || application.farmer).toString()
    : '';

  if (jobFarmerId !== farmerId.toString()) {
    throw new AppError(
      'Forbidden: You can only shortlist candidates for your own job postings',
      HTTP_STATUS.FORBIDDEN
    );
  }

  // 3. Validate Current Status (Cannot shortlist withdrawn, cancelled, or rejected applications)
  if (
    [
      APPLICATION_STATUS.WITHDRAWN,
      APPLICATION_STATUS.CANCELLED,
      APPLICATION_STATUS.REJECTED,
    ].includes(application.status)
  ) {
    throw new AppError(
      `Cannot shortlist an application that is currently ${application.status.toLowerCase()}`,
      HTTP_STATUS.BAD_REQUEST
    );
  }

  // 4. Toggle Shortlist Flag & Update Status
  const willBeShortlisted = !application.shortlisted;
  application.shortlisted = willBeShortlisted;

  if (willBeShortlisted) {
    application.status = APPLICATION_STATUS.SHORTLISTED;
  } else {
    if (application.status === APPLICATION_STATUS.SHORTLISTED) {
      application.status = APPLICATION_STATUS.PENDING;
    }
  }

  await application.save();

  // 5. Send Notification Email & Database Notification to Worker if newly shortlisted
  if (willBeShortlisted && application.worker) {
    if (application.worker.email) {
      sendApplicationShortlistNotificationEmail({
        workerEmail: application.worker.email,
        workerName: application.worker.name,
        farmerName: farmerName,
        jobTitle: application.job?.title || 'Job Posting',
        applicationId: application._id,
      }).catch((emailError) => {
        logger.warn(
          `Failed to send application shortlist notification email to worker (${application.worker.email}): ${emailError.message}`
        );
      });
    }

    const workerRecipientId = application.worker?._id || application.worker;
    notifyApplicationShortlisted({
      recipientId: workerRecipientId,
      senderId: farmerId,
      resourceId: application._id,
      resourceKind: 'Application',
      payload: {
        farmerName,
        jobTitle: application.job?.title || 'Job Posting',
        applicationId: application._id,
        jobId: application.job?._id || application.job,
      },
    });

    emitToUser(workerRecipientId, SOCKET_EVENTS.APPLICATION_STATUS_UPDATED, {
      applicationId: application._id,
      status: application.status,
      jobTitle: application.job?.title || 'Job Posting',
      jobId: application.job?._id || application.job,
      farmerName,
    });
  }

  // 6. Retrieve updated real-time farmer dashboard statistics
  const updatedStats = await getApplicationStatsByFarmerRepo(farmerId);

  return {
    application,
    shortlisted: application.shortlisted,
    statistics: updatedStats,
  };
};

/**
 * Service: Cancel Hiring (Farmer Action — allowed only before worker joins)
 */
export const cancelHiringService = async (farmer, applicationId, payload = {}) => {
  const farmerId = farmer._id || farmer;
  const farmerName = farmer.name || 'Farmer';

  // 1. Fetch full application with populated refs
  const application = await findApplicationByIdRepo(applicationId, true);
  if (!application) {
    throw new AppError('Application not found', HTTP_STATUS.NOT_FOUND);
  }

  // 2. Validate Ownership (Farmer must own the job posting)
  const jobFarmerId = application.farmer
    ? (application.farmer._id || application.farmer).toString()
    : '';

  if (jobFarmerId !== farmerId.toString()) {
    throw new AppError(
      'Forbidden: You can only cancel hiring for your own job postings',
      HTTP_STATUS.FORBIDDEN
    );
  }

  // 3. Guard: Can only cancel Accepted or Hired applications (pre-joining states)
  const cancellableStatuses = [APPLICATION_STATUS.ACCEPTED, APPLICATION_STATUS.HIRED];
  if (!cancellableStatuses.includes(application.status)) {
    throw new AppError(
      `Cannot cancel hiring for an application with status: '${application.status}'. Only Accepted or Hired applications can be cancelled.`,
      HTTP_STATUS.BAD_REQUEST
    );
  }

  // 4. Capture previous status for audit log & job restoration logic
  const previousStatus = application.status;
  const cancellationReason = payload.reason || payload.cancellationReason || '';

  // 5. Update Application — Cancel status, timestamp, & record audit trail
  application.status = APPLICATION_STATUS.CANCELLED;
  application.cancelledDate = new Date();
  application.shortlisted = false;
  if (cancellationReason) {
    application.farmerFeedback = cancellationReason;
  }
  // Embed structured audit log into notes field
  const auditEntry = `[CANCELLED ${new Date().toISOString()}] Previous status: ${previousStatus}. Reason: ${cancellationReason || 'Not provided'}. Cancelled by Farmer.`;
  application.notes = application.notes
    ? `${application.notes}\n${auditEntry}`
    : auditEntry;
  await application.save();

  // 6. Restore Job: Decrement hiredWorkersCount & restore status to Active if was Filled
  const jobId = application.job?._id || application.job;
  if (jobId && previousStatus === APPLICATION_STATUS.HIRED) {
    const updatedJob = await Job.findOneAndUpdate(
      { _id: jobId, hiredWorkersCount: { $gt: 0 } },
      { $inc: { hiredWorkersCount: -1 } },
      { new: true }
    );
    // If job was Filled and now has capacity again, reopen to Active
    if (updatedJob && updatedJob.status === JOB_STATUS.FILLED) {
      updatedJob.status = JOB_STATUS.ACTIVE;
      await updatedJob.save();
      logger.info(`Job [${jobId}] restored from Filled → Active after hiring cancellation.`);
    }
  }

  // 7. Notify Worker via Email & Database Notification
  if (application.worker && application.worker.email) {
    sendCancelHiringNotificationEmail({
      workerEmail: application.worker.email,
      workerName: application.worker.name,
      farmerName: farmerName,
      jobTitle: application.job?.title || 'Job Posting',
      applicationId: application._id,
      reason: cancellationReason,
    }).catch((emailError) => {
      logger.warn(
        `Failed to send cancel hiring notification email to worker (${application.worker.email}): ${emailError.message}`
      );
    });
  }

  // Database Notification to Worker
  const workerRecipientId = application.worker?._id || application.worker;
  if (workerRecipientId) {
    notifyApplicationCancelled({
      recipientId: workerRecipientId,
      senderId: farmerId,
      resourceId: application._id,
      resourceKind: 'Application',
      payload: {
        farmerName,
        jobTitle: application.job?.title || 'Job Posting',
        applicationId: application._id,
        jobId: application.job?._id || application.job,
        reason: cancellationReason,
      },
    });
  }

  // 8. Retrieve updated real-time farmer dashboard statistics
  const updatedStats = await getApplicationStatsByFarmerRepo(farmerId);

  return {
    application,
    previousStatus,
    statistics: updatedStats,
  };
};

/**
 * Service: Get Farmer Application Dashboard Analytics (Cached 60s TTL)
 */
export const getDashboardStatsService = async (farmerId, daysBack = 30) => {
  const cacheKey = `farmer_dash_stats:${farmerId}:${daysBack}`;
  const cached = cacheService.get(cacheKey);
  if (cached) {
    logger.info(`[Cache HIT] ${cacheKey}`);
    return cached;
  }

  const result = await getDashboardStatsByFarmerRepo(farmerId, daysBack);
  cacheService.set(cacheKey, result, 60);
  return result;
};

