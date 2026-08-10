import { User } from '../models/User.js';
import { Job } from '../models/Job.js';
import { Application } from '../models/Application.js';
import { Payment } from '../models/Payment.js';
import { Subscription } from '../models/Subscription.js';
import { Report } from '../models/Report.js';
import { CertificateVerification } from '../models/CertificateVerification.js';
import { IdentityVerification } from '../models/IdentityVerification.js';
import { TrustVerification } from '../models/TrustVerification.js';
import { AuditLog } from '../models/AuditLog.js';
import { PAYMENT_STATUS, APPLICATION_STATUS, JOB_STATUS, REPORT_STATUS } from '../constants/index.js';

/**
 * Single-Pass Optimized MongoDB Dashboard Aggregations
 */
export const getFullDashboardMetrics = async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    userFacet,
    jobFacet,
    applicationFacet,
    revenueFacet,
    reportFacet,
    pendingCertificatesCount,
    pendingIdentityCount,
    activeSubscriptionsCount,
    trustScoreDistribution,
    userGrowthTrend,
    jobGrowthTrend,
    applicationGrowthTrend,
    revenueTrend,
  ] = await Promise.all([
    // 1. User Metrics
    User.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          farmers: [{ $match: { role: 'Farmer' } }, { $count: 'count' }],
          workers: [{ $match: { role: 'Worker' } }, { $count: 'count' }],
          identityVerified: [{ $match: { identityVerified: true } }, { $count: 'count' }],
        },
      },
    ]),

    // 2. Job Metrics
    Job.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $facet: {
          total: [{ $count: 'count' }],
          active: [{ $match: { status: JOB_STATUS.ACTIVE } }, { $count: 'count' }],
          closed: [{ $match: { status: JOB_STATUS.CLOSED } }, { $count: 'count' }],
          filled: [{ $match: { status: JOB_STATUS.FILLED } }, { $count: 'count' }],
        },
      },
    ]),

    // 3. Application Metrics
    Application.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $facet: {
          total: [{ $count: 'count' }],
          pending: [{ $match: { status: APPLICATION_STATUS.PENDING } }, { $count: 'count' }],
          hired: [{ $match: { status: { $in: [APPLICATION_STATUS.HIRED, APPLICATION_STATUS.ACCEPTED, APPLICATION_STATUS.COMPLETED] } } }, { $count: 'count' }],
          rejected: [{ $match: { status: APPLICATION_STATUS.REJECTED } }, { $count: 'count' }],
        },
      },
    ]),

    // 4. Revenue Metrics
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

    // 5. Reports Metrics
    Report.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $facet: {
          total: [{ $count: 'count' }],
          pending: [{ $match: { status: REPORT_STATUS.PENDING } }, { $count: 'count' }],
          investigating: [{ $match: { status: REPORT_STATUS.INVESTIGATING } }, { $count: 'count' }],
          resolved: [{ $match: { status: REPORT_STATUS.RESOLVED } }, { $count: 'count' }],
        },
      },
    ]),

    // 6. Pending Certificates Count
    CertificateVerification.countDocuments({ status: { $in: ['pending', 'under_review'] } }),

    // 7. Pending Identity Verifications Count
    IdentityVerification.countDocuments({ status: { $in: ['pending', 'processing'] } }),

    // 8. Premium Active Subscriptions Count
    Subscription.countDocuments({ status: 'active' }),

    // 9. Trust Score Distribution Histogram
    TrustVerification.aggregate([
      {
        $bucket: {
          groupBy: '$trustScore',
          boundaries: [0, 21, 41, 61, 81, 101],
          default: 'Other',
          output: { count: { $sum: 1 } },
        },
      },
    ]),

    // 10. User Growth Trend (Last 30 days)
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

    // 11. Job Growth Trend
    Job.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, isDeleted: { $ne: true } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // 12. Application Growth Trend
    Application.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, isDeleted: { $ne: true } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // 13. Daily Revenue Trend
    Payment.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, status: PAYMENT_STATUS.CAPTURED } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const u = userFacet[0] || {};
  const j = jobFacet[0] || {};
  const a = applicationFacet[0] || {};
  const r = revenueFacet[0] || {};
  const rep = reportFacet[0] || {};

  // Count Trusted & Verified Workers
  const verifiedWorkersCount = await TrustVerification.countDocuments({
    certificateVerified: true,
  });
  const trustedWorkersCount = await TrustVerification.countDocuments({
    trustScore: { $gte: 80 },
  });

  return {
    metrics: {
      totalUsers: u.total?.[0]?.count || 0,
      farmers: u.farmers?.[0]?.count || 0,
      workers: u.workers?.[0]?.count || 0,
      verifiedWorkers: verifiedWorkersCount,
      identityVerifiedWorkers: u.identityVerified?.[0]?.count || 0,
      trustedWorkers: trustedWorkersCount,
      totalJobs: j.total?.[0]?.count || 0,
      applications: a.total?.[0]?.count || 0,
      hires: a.hired?.[0]?.count || 0,
      reports: rep.total?.[0]?.count || 0,
      pendingReports: rep.pending?.[0]?.count || 0,
      pendingCertificates: pendingCertificatesCount,
      pendingIdentityVerifications: pendingIdentityCount,
      premiumUsers: activeSubscriptionsCount,
      revenue: r.totalRevenue?.[0]?.total || 0,
      monthlyRevenue: r.monthlyRevenue?.[0]?.total || 0,
    },
    charts: {
      userGrowth: userGrowthTrend || [],
      jobGrowth: jobGrowthTrend || [],
      applicationGrowth: applicationGrowthTrend || [],
      revenueTrend: revenueTrend || [],
      trustDistribution: trustScoreDistribution || [],
      reportsStatus: [
        { label: 'Pending', count: rep.pending?.[0]?.count || 0 },
        { label: 'Investigating', count: rep.investigating?.[0]?.count || 0 },
        { label: 'Resolved', count: rep.resolved?.[0]?.count || 0 },
      ],
      hiringRatio: [
        { label: 'Hired', count: a.hired?.[0]?.count || 0 },
        { label: 'Pending', count: a.pending?.[0]?.count || 0 },
        { label: 'Rejected', count: a.rejected?.[0]?.count || 0 },
      ],
    },
  };
};

/**
 * Server-Side Paginated Recent Audit Logs Stream
 */
export const getRecentAdminAuditLogs = async ({ page = 1, limit = 10 } = {}) => {
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    AuditLog.find({})
      .populate('actor', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments({}),
  ]);

  return {
    logs,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
  };
};
