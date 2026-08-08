import { Payment } from '../models/Payment.js';
import { Transaction } from '../models/Transaction.js';
import { Subscription } from '../models/Subscription.js';
import { Invoice } from '../models/Invoice.js';
import { Refund } from '../models/Refund.js';
import { User } from '../models/User.js';
import { PAYMENT_STATUS } from '../constants/index.js';

/**
 * Create a new local Payment Order document
 */
export const createPaymentOrderRepo = async (paymentData) => {
  return await Payment.create(paymentData);
};

/**
 * Find Payment by Razorpay orderId
 */
export const findPaymentByOrderIdRepo = async (orderId) => {
  return await Payment.findOne({ orderId }).populate('user', 'name email mobile role');
};

/**
 * Find Payment by Idempotency Key or active pending order for user & planId
 */
export const findPaymentByIdempotencyKeyRepo = async (userId, idempotencyKey) => {
  if (!idempotencyKey) return null;
  return await Payment.findOne({
    user: userId,
    'metadata.idempotencyKey': idempotencyKey,
  });
};

/**
 * Find existing created/pending Payment order created within the last 15 minutes for user and planId
 */
export const findActivePendingPaymentOrderRepo = async (userId, planId) => {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  return await Payment.findOne({
    user: userId,
    'metadata.planId': planId,
    status: PAYMENT_STATUS.CREATED,
    createdAt: { $gte: fifteenMinutesAgo },
  });
};

/**
 * Update Payment status and metadata
 */
export const updatePaymentStatusRepo = async (paymentId, status, updateFields = {}) => {
  return await Payment.findByIdAndUpdate(
    paymentId,
    { status, ...updateFields },
    { new: true, runValidators: true }
  );
};

/**
 * Create immutable Transaction record
 */
export const createTransactionRepo = async (transactionData) => {
  return await Transaction.create(transactionData);
};

/**
 * Find Transaction by Razorpay paymentId
 */
export const findTransactionByRazorpayPaymentIdRepo = async (razorpayPaymentId) => {
  return await Transaction.findOne({ razorpayPaymentId }).populate('payment user');
};

/**
 * Fetch Transactions with Pagination, Search, Date Range, Status & Role Filters
 */
export const getTransactionsWithFiltersRepo = async ({
  userId,
  isAdmin = false,
  targetUserId = null,
  page = 1,
  limit = 10,
  status,
  type,
  startDate,
  endDate,
  search,
  sortBy = 'createdAt',
  sortOrder = 'desc',
}) => {
  const query = {};

  // Access Control: Regular users can ONLY view their own transactions
  if (!isAdmin) {
    query.user = userId;
  } else if (targetUserId) {
    query.user = targetUserId;
  }

  // Status Filter
  if (status) {
    query.status = status.toLowerCase();
  }

  // Transaction Type Filter
  if (type) {
    query.type = type.toLowerCase();
  }

  // Date Range Filter
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  // Search Filter (transactionId, razorpayOrderId, razorpayPaymentId)
  if (search && search.trim() !== '') {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [
      { transactionId: searchRegex },
      { razorpayOrderId: searchRegex },
      { razorpayPaymentId: searchRegex },
    ];
  }

  const skip = (page - 1) * limit;
  const sortDirection = sortOrder === 'asc' ? 1 : -1;
  const sortOptions = { [sortBy]: sortDirection };

  const transactions = await Transaction.find(query)
    .sort(sortOptions)
    .skip(skip)
    .limit(limit)
    .populate('payment')
    .populate('user', 'name email role mobile');

  const total = await Transaction.countDocuments(query);

  // Fetch associated Invoices for these transactions
  const transactionIds = transactions.map((t) => t._id);
  const invoices = await Invoice.find({ transaction: { $in: transactionIds } });

  const invoiceMap = new Map();
  invoices.forEach((inv) => {
    invoiceMap.set(inv.transaction.toString(), inv);
  });

  const enrichedTransactions = transactions.map((t) => {
    const obj = t.toObject();
    obj.invoice = invoiceMap.get(t._id.toString()) || null;
    return obj;
  });

  return {
    transactions: enrichedTransactions,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Create or update user Subscription
 */
export const upsertSubscriptionRepo = async (subscriptionData) => {
  return await Subscription.create(subscriptionData);
};

/**
 * Create Invoice document
 */
export const createInvoiceRepo = async (invoiceData) => {
  return await Invoice.create(invoiceData);
};

/**
 * Create Refund document
 */
export const createRefundRepo = async (refundData) => {
  return await Refund.create(refundData);
};

/**
 * Find all refunds for a payment
 */
export const findRefundsByPaymentRepo = async (paymentId) => {
  return await Refund.find({ payment: paymentId });
};

/**
 * Find Refund document by refundId
 */
export const findRefundByRefundIdRepo = async (refundId) => {
  return await Refund.findOne({ refundId }).populate('payment transaction user');
};

/**
 * Update Refund status
 */
export const updateRefundStatusRepo = async (refundId, status, updateFields = {}) => {
  return await Refund.findOneAndUpdate(
    { refundId },
    { status, ...updateFields },
    { new: true, runValidators: true }
  );
};

/**
 * Get User Refund Requests with Pagination
 */
export const getUserRefundsRepo = async (userId, { page = 1, limit = 10 } = {}) => {
  const skip = (page - 1) * limit;
  const refunds = await Refund.find({ user: userId })
    .populate('payment transaction')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Refund.countDocuments({ user: userId });
  return {
    refunds,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Get All Refund Requests for Admin with Status Filter & Pagination
 */
export const getAllRefundsRepo = async ({ status, page = 1, limit = 10 } = {}) => {
  const query = {};
  if (status) query.status = status;

  const skip = (page - 1) * limit;
  const refunds = await Refund.find(query)
    .populate('payment transaction user')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Refund.countDocuments(query);
  return {
    refunds,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Update User subscription status in database
 */
export const updateUserSubscriptionStateRepo = async (userId, subscriptionFields) => {
  return await User.findByIdAndUpdate(
    userId,
    {
      isPremium: subscriptionFields.isPremium,
      subscriptionPlan: subscriptionFields.subscriptionPlan,
      subscriptionExpiresAt: subscriptionFields.subscriptionExpiresAt,
      subscriptionStatus: subscriptionFields.subscriptionStatus,
    },
    { new: true }
  );
};
