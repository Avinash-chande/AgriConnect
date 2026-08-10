import { User } from '../models/User.js';
import { Job } from '../models/Job.js';
import { Application } from '../models/Application.js';
import { Payment } from '../models/Payment.js';
import { Subscription } from '../models/Subscription.js';
import { Report } from '../models/Report.js';
import { AuditLog } from '../models/AuditLog.js';
import { PAYMENT_STATUS, APPLICATION_STATUS, JOB_STATUS } from '../constants/index.js';

/**
 * Admin Repository — Centralized data access for admin dashboard & management
 */

/**
 * Get dashboard KPI counts in a single aggregation pass
 */
export const getDashboardCounts = async () => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [userStats, jobStats, applicationStats, revenueStats, reportStats, recentSignups] =
    await Promise.all([
      // User counts
      User.aggregate([
        {
          $facet: {
            total: [{ $count: 'count' }],
            farmers: [{ $match: { role: 'Farmer' } }, { $count: 'count' }],
            workers: [{ $match: { role: 'Worker' } }, { $count: 'count' }],
            admins: [{ $match: { role: 'Admin' } }, { $count: 'count' }],
            active: [{ $match: { isActive: { $ne: false } } }, { $count: 'count' }],
            suspended: [{ $match: { isActive: false } }, { $count: 'count' }],
            newThisMonth: [
              { $match: { createdAt: { $gte: thirtyDaysAgo } } },
              { $count: 'count' },
            ],
            newThisWeek: [
              { $match: { createdAt: { $gte: sevenDaysAgo } } },
              { $count: 'count' },
            ],
          },
        },
      ]),

      // Job counts
      Job.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        {
          $facet: {
            total: [{ $count: 'count' }],
            active: [{ $match: { status: JOB_STATUS.ACTIVE } }, { $count: 'count' }],
            closed: [{ $match: { status: JOB_STATUS.CLOSED } }, { $count: 'count' }],
            filled: [{ $match: { status: JOB_STATUS.FILLED } }, { $count: 'count' }],
            expired: [{ $match: { status: JOB_STATUS.EXPIRED } }, { $count: 'count' }],
          },
        },
      ]),

      // Application counts
      Application.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        {
          $facet: {
            total: [{ $count: 'count' }],
            pending: [
              { $match: { status: APPLICATION_STATUS.PENDING } },
              { $count: 'count' },
            ],
            hired: [
              { $match: { status: APPLICATION_STATUS.HIRED } },
              { $count: 'count' },
            ],
            rejected: [
              { $match: { status: APPLICATION_STATUS.REJECTED } },
              { $count: 'count' },
            ],
          },
        },
      ]),

      // Revenue
      Payment.aggregate([
        {
          $facet: {
            totalRevenue: [
              { $match: { status: PAYMENT_STATUS.CAPTURED } },
              { $group: { _id: null, total: { $sum: '$amount' } } },
            ],
            monthlyRevenue: [
              {
                $match: {
                  status: PAYMENT_STATUS.CAPTURED,
                  createdAt: { $gte: thirtyDaysAgo },
                },
              },
              { $group: { _id: null, total: { $sum: '$amount' } } },
            ],
          },
        },
      ]),

      // Open reports
      Report.countDocuments({ status: { $in: ['open', 'in_review'] }, isDeleted: { $ne: true } }),

      // Recent signups trend (last 30 days, grouped by day)
      User.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

  const u = userStats[0] || {};
  const j = jobStats[0] || {};
  const a = applicationStats[0] || {};
  const r = revenueStats[0] || {};

  return {
    users: {
      total: u.total?.[0]?.count || 0,
      farmers: u.farmers?.[0]?.count || 0,
      workers: u.workers?.[0]?.count || 0,
      admins: u.admins?.[0]?.count || 0,
      active: u.active?.[0]?.count || 0,
      suspended: u.suspended?.[0]?.count || 0,
      newThisMonth: u.newThisMonth?.[0]?.count || 0,
      newThisWeek: u.newThisWeek?.[0]?.count || 0,
    },
    jobs: {
      total: j.total?.[0]?.count || 0,
      active: j.active?.[0]?.count || 0,
      closed: j.closed?.[0]?.count || 0,
      filled: j.filled?.[0]?.count || 0,
      expired: j.expired?.[0]?.count || 0,
    },
    applications: {
      total: a.total?.[0]?.count || 0,
      pending: a.pending?.[0]?.count || 0,
      hired: a.hired?.[0]?.count || 0,
      rejected: a.rejected?.[0]?.count || 0,
    },
    revenue: {
      total: r.totalRevenue?.[0]?.total || 0,
      monthly: r.monthlyRevenue?.[0]?.total || 0,
    },
    openReports: reportStats,
    recentSignups: recentSignups || [],
  };
};

/**
 * Get users with pagination, search, and filters
 */
export const getUsersPaginated = async ({
  page = 1,
  limit = 20,
  search = '',
  role = '',
  isActive = '',
  sortBy = 'createdAt',
  sortOrder = 'desc',
} = {}) => {
  const filter = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { mobile: { $regex: search, $options: 'i' } },
    ];
  }

  if (role) filter.role = role;
  if (isActive !== '') filter.isActive = isActive === 'true';

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find(filter)
    .select('-password -refreshToken -otpCode -otpExpiresAt -aadhaarNumber -shareCode')
    .populate('adminRole', 'name permissions')
    .populate('trustVerificationId', 'trustScore trustLevel completedJobs averageRating certificateVerified')
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean(),
    User.countDocuments(filter),
  ]);

  return {
    users,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get jobs with pagination and filters for moderation
 */
export const getJobsPaginated = async ({
  page = 1,
  limit = 20,
  search = '',
  status = '',
  category = '',
  sortBy = 'createdAt',
  sortOrder = 'desc',
} = {}) => {
  const filter = { isDeleted: { $ne: true } };

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  if (status) filter.status = status;
  if (category) filter.category = category;

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  const skip = (page - 1) * limit;

  const [jobs, total] = await Promise.all([
    Job.find(filter)
      .populate('farmer', 'name email mobile profileImage')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Job.countDocuments(filter),
  ]);

  return {
    jobs,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get applications with pagination and filters
 */
export const getApplicationsPaginated = async ({
  page = 1,
  limit = 20,
  search = '',
  status = '',
  farmer = '',
  worker = '',
  job = '',
  sortBy = 'createdAt',
  sortOrder = 'desc',
} = {}) => {
  const filter = { isDeleted: { $ne: true } };
  if (status) filter.status = status;
  if (farmer) filter.farmer = farmer;
  if (worker) filter.worker = worker;
  if (job) filter.job = job;

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  const skip = (page - 1) * limit;

  const [applications, total] = await Promise.all([
    Application.find(filter)
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
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Application.countDocuments(filter),
  ]);

  return {
    applications,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get application status distribution for monitoring
 */
export const getApplicationStats = async () => {
  return Application.aggregate([
    { $match: { isDeleted: { $ne: true } } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

/**
 * Get audit logs with pagination and filters
 */
export const getAuditLogsPaginated = async ({
  page = 1,
  limit = 50,
  actor = '',
  action = '',
  category = '',
  severity = '',
  startDate = '',
  endDate = '',
  sortOrder = 'desc',
} = {}) => {
  const filter = {};

  if (actor) filter.actor = actor;
  if (action) filter.action = { $regex: action, $options: 'i' };
  if (category) filter.category = category;
  if (severity) filter.severity = severity;

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const sort = { createdAt: sortOrder === 'asc' ? 1 : -1 };
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('actor', 'name email role')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return {
    logs,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
};
