import { Payment } from '../models/Payment.js';
import { Refund } from '../models/Refund.js';
import { getAdminPaymentAnalyticsService } from './analyticsService.js';
import { AppError } from '../utils/appError.js';
import { logAuditEvent } from './auditLogger.js';
import { PAYMENT_STATUS, REFUND_STATUS, AUDIT_CATEGORY, AUDIT_SEVERITY } from '../constants/index.js';

/**
 * Admin Payment Management Service
 */

export const getPayments = async ({
  page = 1,
  limit = 20,
  status = '',
  search = '',
  sortBy = 'createdAt',
  sortOrder = 'desc',
} = {}) => {
  const filter = {};

  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { orderId: { $regex: search, $options: 'i' } },
      { paymentId: { $regex: search, $options: 'i' } },
    ];
  }

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  const skip = (page - 1) * limit;

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate('user', 'name email role mobile profileImage')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Payment.countDocuments(filter),
  ]);

  return {
    payments,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
  };
};

export const getPaymentById = async (paymentId) => {
  const payment = await Payment.findById(paymentId)
    .populate('user', 'name email role mobile profileImage')
    .lean();

  if (!payment) throw new AppError('Payment transaction not found', 404);
  return payment;
};

export const processAdminRefund = async (paymentId, { reason = '' }, adminUser) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw new AppError('Payment transaction not found', 404);

  if (payment.status !== PAYMENT_STATUS.CAPTURED) {
    throw new AppError(`Cannot refund payment with status '${payment.status}'. Only captured payments can be refunded.`, 400);
  }

  const existingRefund = await Refund.findOne({ payment: payment._id, status: REFUND_STATUS.PROCESSED });
  if (existingRefund) {
    throw new AppError('This payment has already been refunded.', 400);
  }

  const refund = await Refund.create({
    payment: payment._id,
    user: payment.user,
    amount: payment.amount,
    currency: payment.currency,
    reason,
    status: REFUND_STATUS.PROCESSED,
    processedAt: new Date(),
  });

  payment.status = PAYMENT_STATUS.REFUNDED;
  await payment.save();

  await logAuditEvent({
    actor: adminUser._id,
    action: 'ADMIN_PAYMENT_REFUNDED',
    status: 'SUCCESS',
    details: { paymentId, refundId: refund._id, amount: payment.amount, reason },
    resource: { kind: 'Payment', id: paymentId },
    category: AUDIT_CATEGORY.PAYMENT,
    severity: AUDIT_SEVERITY.WARNING,
  });

  return { payment, refund };
};

export const getPaymentAnalytics = async (query) => {
  return getAdminPaymentAnalyticsService(query);
};

export const getAdminPaymentOverview = async () => {
  const { Job } = await import('../models/Job.js');
  const [revenueStats, refundsCount, failedPaymentsCount, featuredJobsCount, totalTransactions] = await Promise.all([
    Payment.aggregate([
      { $match: { status: PAYMENT_STATUS.CAPTURED } },
      { $group: { _id: null, totalRevenue: { $sum: '$amount' } } },
    ]),
    Refund.countDocuments({ status: REFUND_STATUS.PROCESSED }),
    Payment.countDocuments({ status: PAYMENT_STATUS.FAILED }),
    Job.countDocuments({ isFeatured: true, isDeleted: { $ne: true } }),
    Payment.countDocuments({}),
  ]);

  return {
    totalRevenue: revenueStats[0]?.totalRevenue || 0,
    refundsCount,
    failedPaymentsCount,
    featuredJobsCount,
    totalTransactions,
  };
};
