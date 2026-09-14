import { Payment } from '../models/Payment.js';
import { Refund } from '../models/Refund.js';
import { User } from '../models/User.js';
import { Subscription } from '../models/Subscription.js';
import { WorkerProfile } from '../models/WorkerProfile.js';
import { Job } from '../models/Job.js';
import { Application } from '../models/Application.js';
import { PAYMENT_STATUS, REFUND_STATUS, SUBSCRIPTION_STATUS } from '../constants/index.js';

/**
 * High-Performance Admin Payment & Financial Analytics Aggregation Service
 */
export const getAdminPaymentAnalyticsService = async (query = {}) => {
  const now = new Date();
  
  // Date Filtering (Default: Last 30 Days)
  const startDate = query.startDate
    ? new Date(query.startDate)
    : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const endDate = query.endDate ? new Date(query.endDate) : now;

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 1. Payment Aggregations Pipeline ($facet for single database pass)
  const paymentStatsFacet = await Payment.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $facet: {
        totalRevenue: [
          { $match: { status: PAYMENT_STATUS.CAPTURED } },
          { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
        ],
        monthlyRevenue: [
          { $match: { status: PAYMENT_STATUS.CAPTURED, createdAt: { $gte: startOfMonth } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ],
        dailyRevenue: [
          { $match: { status: PAYMENT_STATUS.CAPTURED, createdAt: { $gte: startOfToday } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ],
        successfulPayments: [
          { $match: { status: PAYMENT_STATUS.CAPTURED } },
          { $count: 'count' },
        ],
        failedPayments: [
          { $match: { status: PAYMENT_STATUS.FAILED } },
          { $count: 'count' },
        ],
        featuredJobRevenue: [
          {
            $match: {
              status: PAYMENT_STATUS.CAPTURED,
              purpose: { $regex: /job/i },
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ],
        statusBreakdown: [
          { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } },
        ],
        planDistribution: [
          { $match: { status: PAYMENT_STATUS.CAPTURED } },
          { $group: { _id: '$purpose', count: { $sum: 1 }, totalRevenue: { $sum: '$amount' } } },
        ],
        revenueOverTime: [
          { $match: { status: PAYMENT_STATUS.CAPTURED } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              revenue: { $sum: '$amount' },
              transactions: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
      },
    },
  ]);

  const stats = paymentStatsFacet[0] || {};

  const totalRevenue = stats.totalRevenue[0]?.total || 0;
  const successfulCount = stats.successfulPayments[0]?.count || 0;
  const failedCount = stats.failedPayments[0]?.count || 0;
  const monthlyRevenue = stats.monthlyRevenue[0]?.total || 0;
  const dailyRevenue = stats.dailyRevenue[0]?.total || 0;
  const featuredJobRevenue = stats.featuredJobRevenue[0]?.total || 0;
  const averageTransactionValue = successfulCount > 0 ? Math.round((totalRevenue / successfulCount) * 100) / 100 : 0;

  // 2. Refund Statistics Pipeline
  const refundStats = await Refund.aggregate([
    {
      $facet: {
        totalRefunds: [{ $count: 'count' }],
        processedRefunds: [
          { $match: { status: REFUND_STATUS.PROCESSED } },
          { $group: { _id: null, totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
        ],
        pendingRefunds: [
          { $match: { status: REFUND_STATUS.PENDING } },
          { $count: 'count' },
        ],
      },
    },
  ]);

  const refundData = refundStats[0] || {};
  const totalRefundsCount = refundData.totalRefunds[0]?.count || 0;
  const processedRefundAmount = refundData.processedRefunds[0]?.totalAmount || 0;
  const pendingRefundsCount = refundData.pendingRefunds[0]?.count || 0;

  // 3. User & Premium Conversion Rates
  const totalUsersCount = await User.countDocuments();
  const activePremiumUsersCount = await User.countDocuments({ isPremium: true });
  const expiredPremiumUsersCount = await User.countDocuments({
    subscriptionStatus: SUBSCRIPTION_STATUS.EXPIRED,
  });

  const premiumConversionRate =
    totalUsersCount > 0 ? Math.round((activePremiumUsersCount / totalUsersCount) * 10000) / 100 : 0;

  return {
    summary: {
      totalRevenue,
      monthlyRevenue,
      dailyRevenue,
      successfulPaymentsCount: successfulCount,
      failedPaymentsCount: failedCount,
      featuredJobRevenue,
      averageTransactionValue,
      totalRefundsCount,
      processedRefundAmount,
      pendingRefundsCount,
      activePremiumUsersCount,
      expiredPremiumUsersCount,
      totalUsersCount,
      premiumConversionRate,
    },
    charts: {
      revenueOverTime: stats.revenueOverTime || [],
      paymentStatusBreakdown: stats.statusBreakdown || [],
      planDistribution: stats.planDistribution || [],
    },
    filter: {
      startDate,
      endDate,
    },
  };
};

/**
 * Real MongoDB Public Aggregation Service for /home Landing Statistics
 * Only aggregate numbers from real existing database records.
 * No private user information or mock data.
 */
export const getHomeStatisticsService = async () => {
  const now = new Date();
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [
    verifiedWorkerFacet,
    totalWorkersCount,
    activeFarmersCount,
    totalFarmersCount,
    successfulMatchesCount,
    successfulJobsThisMonthCount,
    totalJobsCount,
    matchTimeAggregation,
  ] = await Promise.all([
    // 1. Verified Farm Workers
    WorkerProfile.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $lookup: {
          from: 'users',
          localField: 'owner',
          foreignField: '_id',
          as: 'owner',
        },
      },
      { $unwind: '$owner' },
      {
        $match: {
          'owner.isDeleted': { $ne: true },
          $or: [
            { aadhaarVerified: true },
            { 'owner.isVerified': true },
            { 'owner.identityVerified': true },
          ],
        },
      },
      { $count: 'count' },
    ]),

    // Total active workers (for verification ratio badge)
    WorkerProfile.countDocuments({ isDeleted: { $ne: true } }),

    // 2. Active Farm Owners
    User.countDocuments({
      role: { $regex: /^farmer$/i },
      isActive: { $ne: false },
      isDeleted: { $ne: true },
    }),

    // Total farm owners
    User.countDocuments({
      role: { $regex: /^farmer$/i },
      isDeleted: { $ne: true },
    }),

    // 3. Successful Job Matches (All-time)
    Application.countDocuments({
      status: { $in: ['Accepted', 'Hired', 'Completed'] },
      isDeleted: { $ne: true },
    }),

    // Successful Farm Job Matches this calendar month
    Application.countDocuments({
      status: { $in: ['Accepted', 'Hired', 'Completed'] },
      isDeleted: { $ne: true },
      $expr: {
        $and: [
          { $gte: [{ $ifNull: ['$hiredDate', '$updatedAt'] }, startOfCurrentMonth] },
          { $lt: [{ $ifNull: ['$hiredDate', '$updatedAt'] }, startOfNextMonth] },
        ],
      },
    }),

    // Total active jobs
    Job.countDocuments({ isDeleted: { $ne: true } }),

    // 4. Average Match Time
    Application.aggregate([
      {
        $match: {
          status: { $in: ['Accepted', 'Hired', 'Completed'] },
          isDeleted: { $ne: true },
        },
      },
      {
        $lookup: {
          from: 'jobs',
          localField: 'job',
          foreignField: '_id',
          as: 'job',
        },
      },
      { $unwind: '$job' },
      {
        $project: {
          matchDurationHours: {
            $divide: [
              {
                $subtract: [
                  { $ifNull: ['$hiredDate', '$updatedAt'] },
                  '$job.createdAt',
                ],
              },
              1000 * 60 * 60,
            ],
          },
        },
      },
      {
        $match: {
          matchDurationHours: { $gte: 0 },
        },
      },
      {
        $group: {
          _id: null,
          avgHours: { $avg: '$matchDurationHours' },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const verifiedFarmWorkers = verifiedWorkerFacet[0]?.count || 0;
  const activeFarmOwners = activeFarmersCount || 0;
  const successfulJobMatches = successfulMatchesCount || 0;
  const avgMatchTimeHours =
    matchTimeAggregation[0]?.avgHours != null
      ? Number(matchTimeAggregation[0].avgHours.toFixed(1))
      : null;

  // Real data badges
  const verifiedPct =
    totalWorkersCount > 0
      ? Math.round((verifiedFarmWorkers / totalWorkersCount) * 100)
      : 100;
  const activePct =
    totalFarmersCount > 0
      ? Math.round((activeFarmOwners / totalFarmersCount) * 100)
      : 100;
  const fulfillmentPct =
    totalJobsCount > 0
      ? Math.min(100, Math.round((successfulJobMatches / totalJobsCount) * 100))
      : 100;

  return {
    verifiedFarmWorkers,
    activeFarmOwners,
    successfulJobMatches,
    successfulFarmJobsThisMonth: successfulJobsThisMonthCount || 0,
    averageMatchTimeHours: avgMatchTimeHours,
    badges: {
      verifiedWorkersBadge: `${verifiedPct}% Verified`,
      activeFarmersBadge: `${activePct}% Active`,
      successfulMatchesBadge: `${fulfillmentPct}% fulfillment`,
      averageMatchTimeBadge: 'Direct Dispatch',
    },
  };
};

