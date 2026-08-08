import { Payment } from '../models/Payment.js';
import { Refund } from '../models/Refund.js';
import { User } from '../models/User.js';
import { Subscription } from '../models/Subscription.js';
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
