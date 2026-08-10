import { Application } from '../models/Application.js';

/**
 * Application Repository Layer - Data Access Interface
 */

/**
 * Create a new Job Application record
 */
export const createApplicationRepo = async (applicationData) => {
  return await Application.create(applicationData);
};

/**
 * Find existing application by Job ID and Worker ID (to prevent duplicate applications)
 */
export const findApplicationByJobAndWorkerRepo = async (jobId, workerId) => {
  return await Application.findOne({
    job: jobId,
    worker: workerId,
    isDeleted: { $ne: true },
  }).exec();
};

/**
 * Find single Application by ID with populated references
 */
export const findApplicationByIdRepo = async (id, populateRefs = true) => {
  const query = Application.findById(id).select('-__v -isDeleted -deletedAt');
  if (populateRefs) {
    query
      .populate('worker', 'name email mobile role profileImage isVerified')
      .populate('farmer', 'name email mobile role profileImage isVerified')
      .populate('job', 'title status dailyWage wageType category location jobAddress');
  }
  return await query.exec();
};

/**
 * Find Applications submitted by a specific Worker with sorting, searching, and complete populations
 */
export const findApplicationsByWorkerRepo = async (
  workerId,
  filter = {},
  skip = 0,
  limit = 10,
  sort = { createdAt: -1 }
) => {
  const queryFilter = { ...filter, worker: workerId, isDeleted: { $ne: true } };

  return await Application.find(queryFilter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate('farmer', 'name email mobile profileImage isVerified role')
    .populate(
      'job',
      'title slug description category cropType workType numberOfWorkers dailyWage monthlySalary wageType jobAddress status startDate endDate'
    )
    .lean()
    .exec();
};

/**
 * Find Applications received for a specific Farmer with sorting & worker profile population
 */
export const findApplicationsByFarmerRepo = async (
  farmerId,
  filter = {},
  skip = 0,
  limit = 10,
  sort = { createdAt: -1 }
) => {
  const queryFilter = { ...filter, farmer: farmerId, isDeleted: { $ne: true } };

  return await Application.find(queryFilter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate({
      path: 'worker',
      select: 'name email mobile role profileImage isVerified identityVerified trustVerificationId createdAt',
      populate: [
        {
          path: 'workerProfile',
          select: 'title skills experience rating completedJobs bio',
        },
        {
          path: 'trustVerificationId',
          select: 'trustScore trustLevel completedJobs averageRating certificateVerified badges mobileVerified emailVerified',
          populate: {
            path: 'badges',
            select: 'type title description issuedAt',
          },
        },
      ],
    })
    .populate(
      'job',
      'title slug category cropType workType numberOfWorkers dailyWage monthlySalary wageType jobAddress status totalApplications'
    )
    .lean()
    .exec();
};

/**
 * Aggregate application summary statistics for a Farmer's posted jobs
 */
export const getApplicationStatsByFarmerRepo = async (farmerId) => {
  const farmerObjectId = typeof farmerId === 'string' ? new Application.base.Types.ObjectId(farmerId) : farmerId;

  const stats = await Application.aggregate([
    {
      $match: {
        farmer: farmerObjectId,
        isDeleted: { $ne: true },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: {
          $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] },
        },
        shortlisted: {
          $sum: { $cond: [{ $eq: ['$status', 'Shortlisted'] }, 1, 0] },
        },
        accepted: {
          $sum: { $cond: [{ $eq: ['$status', 'Accepted'] }, 1, 0] },
        },
        hired: {
          $sum: { $cond: [{ $eq: ['$status', 'Hired'] }, 1, 0] },
        },
        rejected: {
          $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] },
        },
        withdrawn: {
          $sum: { $cond: [{ $eq: ['$status', 'Withdrawn'] }, 1, 0] },
        },
        cancelled: {
          $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] },
        },
      },
    },
  ]);

  if (stats.length === 0) {
    return {
      total: 0,
      pending: 0,
      shortlisted: 0,
      accepted: 0,
      hired: 0,
      rejected: 0,
      withdrawn: 0,
      cancelled: 0,
    };
  }

  const { _id, ...cleanStats } = stats[0];
  return cleanStats;
};

/**
 * Find Applications received for a specific Job posting
 */
export const findApplicationsByJobRepo = async (jobId, filter = {}, skip = 0, limit = 10) => {
  const queryFilter = { ...filter, job: jobId, isDeleted: { $ne: true } };

  return await Application.find(queryFilter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('worker', 'name email mobile profileImage')
    .lean()
    .exec();
};

/**
 * Count total application documents matching filter
 */
export const countApplicationsRepo = async (filter = {}) => {
  return await Application.countDocuments({ ...filter, isDeleted: { $ne: true } });
};

/**
 * Update application status and details
 */
export const updateApplicationRepo = async (id, updateData) => {
  return await Application.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true })
    .populate('worker', 'name email mobile profileImage')
    .populate('job', 'title status')
    .exec();
};

/**
 * Bulk reject all other pending/shortlisted applications for a job
 */
export const bulkRejectOtherApplicationsRepo = async (jobId, excludeApplicationId, feedback = 'Position filled by another candidate') => {
  return await Application.updateMany(
    {
      job: jobId,
      _id: { $ne: excludeApplicationId },
      status: { $in: ['Pending', 'Shortlisted'] },
      isDeleted: { $ne: true },
    },
    {
      $set: {
        status: 'Rejected',
        rejectedDate: new Date(),
        farmerFeedback: feedback,
      },
    }
  );
};

/**
 * Aggregate full dashboard analytics for a Farmer
 * Returns: overall stats, per-job breakdown, per-day trend (last 30 days), recent applicants
 */
export const getDashboardStatsByFarmerRepo = async (farmerId, daysBack = 30) => {
  const farmerObjectId =
    typeof farmerId === 'string'
      ? new Application.base.Types.ObjectId(farmerId)
      : farmerId;

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - daysBack);

  // 1. Overall status breakdown
  const overallStats = await Application.aggregate([
    { $match: { farmer: farmerObjectId, isDeleted: { $ne: true } } },
    {
      $group: {
        _id: null,
        total:       { $sum: 1 },
        pending:     { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
        shortlisted: { $sum: { $cond: [{ $eq: ['$status', 'Shortlisted'] }, 1, 0] } },
        accepted:    { $sum: { $cond: [{ $eq: ['$status', 'Accepted'] }, 1, 0] } },
        hired:       { $sum: { $cond: [{ $eq: ['$status', 'Hired'] }, 1, 0] } },
        rejected:    { $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] } },
        withdrawn:   { $sum: { $cond: [{ $eq: ['$status', 'Withdrawn'] }, 1, 0] } },
        cancelled:   { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] } },
      },
    },
  ]);

  // 2. Applications per Job posting
  const perJobStats = await Application.aggregate([
    { $match: { farmer: farmerObjectId, isDeleted: { $ne: true } } },
    {
      $group: {
        _id:         '$job',
        total:       { $sum: 1 },
        pending:     { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
        shortlisted: { $sum: { $cond: [{ $eq: ['$status', 'Shortlisted'] }, 1, 0] } },
        accepted:    { $sum: { $cond: [{ $eq: ['$status', 'Accepted'] }, 1, 0] } },
        hired:       { $sum: { $cond: [{ $eq: ['$status', 'Hired'] }, 1, 0] } },
        rejected:    { $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] } },
      },
    },
    {
      $lookup: {
        from: 'jobs',
        localField: '_id',
        foreignField: '_id',
        as: 'job',
      },
    },
    { $unwind: { path: '$job', preserveNullAndEmpty: true } },
    {
      $project: {
        jobId:    '$_id',
        jobTitle: '$job.title',
        category: '$job.category',
        status:   '$job.status',
        total:    1, pending: 1, shortlisted: 1, accepted: 1, hired: 1, rejected: 1,
      },
    },
    { $sort: { total: -1 } },
    { $limit: 10 },
  ]);

  // 3. Applications per day (last N days trend)
  const perDayStats = await Application.aggregate([
    {
      $match: {
        farmer: farmerObjectId,
        isDeleted: { $ne: true },
        createdAt: { $gte: sinceDate },
      },
    },
    {
      $group: {
        _id: {
          year:  { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day:   { $dayOfMonth: '$createdAt' },
        },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        date: {
          $dateFromParts: { year: '$_id.year', month: '$_id.month', day: '$_id.day' },
        },
        count: 1,
      },
    },
    { $sort: { date: 1 } },
  ]);

  // 4. Recent 8 applicants
  const recentApplicants = await Application.find({
    farmer: farmerObjectId,
    isDeleted: { $ne: true },
  })
    .sort({ createdAt: -1 })
    .limit(8)
    .populate('worker', 'name email mobile profileImage')
    .populate('job', 'title category')
    .lean()
    .exec();

  const stats = overallStats.length > 0 ? overallStats[0] : {
    total: 0, pending: 0, shortlisted: 0, accepted: 0,
    hired: 0, rejected: 0, withdrawn: 0, cancelled: 0,
  };
  const { _id, ...cleanStats } = stats;

  return {
    overview:         cleanStats,
    perJob:           perJobStats,
    perDay:           perDayStats,
    recentApplicants,
  };
};

