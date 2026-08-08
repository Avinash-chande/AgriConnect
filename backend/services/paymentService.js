import mongoose from 'mongoose';
import { getResolvedPlanPriceService } from './planService.js';
import {
  getRazorpayInstance,
  razorpayKeyId,
  verifyRazorpaySignature,
  verifyWebhookSignature,
} from '../config/razorpay.js';
import {
  createPaymentOrderRepo,
  findPaymentByOrderIdRepo,
  findPaymentByIdempotencyKeyRepo,
  findActivePendingPaymentOrderRepo,
  updatePaymentStatusRepo,
  createTransactionRepo,
  findTransactionByRazorpayPaymentIdRepo,
  getTransactionsWithFiltersRepo,
  upsertSubscriptionRepo,
  createInvoiceRepo,
  createRefundRepo,
  findRefundsByPaymentRepo,
  findRefundByRefundIdRepo,
  updateRefundStatusRepo,
  getUserRefundsRepo,
  getAllRefundsRepo,
  updateUserSubscriptionStateRepo,
} from '../repositories/paymentRepository.js';
import { generateInvoiceService } from './invoiceService.js';
import { createNotificationService } from './notificationService.js';
import { createNotificationRepo } from '../repositories/notificationRepository.js';
import { User } from '../models/User.js';
import { Job } from '../models/Job.js';
import { Payment } from '../models/Payment.js';
import { Transaction } from '../models/Transaction.js';
import { Subscription } from '../models/Subscription.js';
import { Invoice } from '../models/Invoice.js';
import { Refund } from '../models/Refund.js';
import { NOTIFICATION_TYPE } from '../models/Notification.js';
import { AppError } from '../utils/appError.js';
import { logger } from '../utils/logger.js';
import {
  PAYMENT_STATUS,
  SUBSCRIPTION_STATUS,
  TRANSACTION_TYPE,
  TRANSACTION_STATUS,
  INVOICE_STATUS,
  REFUND_STATUS,
  JOB_STATUS,
} from '../constants/index.js';

/**
 * @desc Create Payment Order API Service
 * Calculates price server-side, creates Razorpay order, stores local Payment document, enforces idempotency.
 */
export const createPaymentOrderService = async ({
  userId,
  planId,
  purpose = 'subscription',
  idempotencyKey = null,
  notes = {},
}) => {
  if (!userId) {
    throw new AppError('User ID is required to create a payment order.', 401);
  }

  if (!planId) {
    throw new AppError('A valid membership plan ID is required.', 400);
  }

  // 1. Enforce Idempotency: Check if order with idempotencyKey or active pending order already exists
  if (idempotencyKey) {
    const existingKeyPayment = await findPaymentByIdempotencyKeyRepo(userId, idempotencyKey);
    if (existingKeyPayment) {
      logger.info(`[PaymentService] Returning idempotent payment order: ${existingKeyPayment.orderId} for key: ${idempotencyKey}`);
      return {
        orderId: existingKeyPayment.orderId,
        amount: Math.round(existingKeyPayment.amount * 100),
        currency: existingKeyPayment.currency,
        keyId: razorpayKeyId,
        paymentId: existingKeyPayment._id,
        planId: existingKeyPayment.metadata?.planId,
      };
    }
  }

  const existingPendingPayment = await findActivePendingPaymentOrderRepo(userId, planId);
  if (existingPendingPayment) {
    logger.info(`[PaymentService] Reusing active pending payment order: ${existingPendingPayment.orderId} for plan: ${planId}`);
    return {
      orderId: existingPendingPayment.orderId,
      amount: Math.round(existingPendingPayment.amount * 100),
      currency: existingPendingPayment.currency,
      keyId: razorpayKeyId,
      paymentId: existingPendingPayment._id,
      planId: planId,
    };
  }

  // 2. Server-side price resolution (NEVER TRUST CLIENT AMOUNT)
  const resolvedPlan = await getResolvedPlanPriceService(planId);
  const amountInPaise = resolvedPlan.amountInPaise;
  const currency = resolvedPlan.currency || 'INR';

  if (amountInPaise <= 0) {
    throw new AppError('Free tier plans do not require payment orders.', 400);
  }

  // 3. Initialize Razorpay Client & Create Order on Razorpay Server
  const razorpay = getRazorpayInstance();
  const receiptId = `rcpt_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

  let razorpayOrder;
  try {
    razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: currency,
      receipt: receiptId,
      notes: {
        userId: userId.toString(),
        planId: resolvedPlan.planId,
        purpose: purpose,
        ...notes,
      },
    });
  } catch (error) {
    logger.error(`[PaymentService] Razorpay order creation failed: ${error.message}`);
    throw new AppError(`Failed to initialize payment gateway order: ${error.message}`, 502);
  }

  // 4. Save local Payment transaction record in MongoDB
  const localPayment = await createPaymentOrderRepo({
    user: userId,
    orderId: razorpayOrder.id,
    provider: 'razorpay',
    amount: resolvedPlan.price,
    currency: currency,
    status: PAYMENT_STATUS.CREATED,
    purpose: purpose,
    metadata: {
      planId: resolvedPlan.planId,
      planName: resolvedPlan.name,
      amountInPaise: amountInPaise,
      idempotencyKey: idempotencyKey,
      notes: notes,
    },
  });

  logger.info(`[PaymentService] Created Payment Order ${razorpayOrder.id} for user ${userId} with plan ${planId}`);

  // 5. Return strictly SAFE payload to client (No Secrets)
  return {
    orderId: razorpayOrder.id,
    amount: amountInPaise,
    currency: currency,
    keyId: razorpayKeyId,
    paymentId: localPayment._id,
    plan: {
      planId: resolvedPlan.planId,
      name: resolvedPlan.name,
      price: resolvedPlan.price,
      billingPeriod: resolvedPlan.billingPeriod,
    },
  };
};

/**
 * @desc Cryptographic Razorpay Payment Verification & Membership Activation
 */
export const verifyPaymentService = async ({
  userId,
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
}) => {
  if (!userId) {
    throw new AppError('User ID is required to verify payment.', 401);
  }

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new AppError('Missing required payment verification identifiers.', 400);
  }

  // 1. Retrieve local Payment record
  const payment = await findPaymentByOrderIdRepo(razorpay_order_id);
  if (!payment) {
    throw new AppError('Payment order not found or invalid.', 404);
  }

  // 2. Verify order belongs to the authenticated user
  const paymentUserId = payment.user._id ? payment.user._id.toString() : payment.user.toString();
  if (paymentUserId !== userId.toString()) {
    throw new AppError('Unauthorized payment verification request. Order belongs to another user.', 403);
  }

  // 3. Idempotency Check: Prevent duplicate payment verification
  if (payment.status === PAYMENT_STATUS.CAPTURED || payment.status === 'paid') {
    logger.info(`[PaymentService] Payment order ${razorpay_order_id} already verified & paid.`);
    const existingTransaction = await Transaction.findOne({ razorpayPaymentId: razorpay_payment_id });
    const existingSubscription = await Subscription.findOne({ user: userId, status: SUBSCRIPTION_STATUS.ACTIVE });

    return {
      verified: true,
      message: 'Payment already verified and subscription active.',
      transaction: existingTransaction,
      subscription: existingSubscription,
    };
  }

  // 4. Verify Cryptographic HMAC Signature
  const isValidSignature = verifyRazorpaySignature({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  });

  if (!isValidSignature) {
    await updatePaymentStatusRepo(payment._id, PAYMENT_STATUS.FAILED, {
      failureReason: 'Cryptographic HMAC signature verification failed',
    });
    logger.error(`[PaymentService] Invalid signature for order ${razorpay_order_id}`);
    throw new AppError('Invalid payment signature verification failed.', 400);
  }

  // 5. Verify Server Plan Price & Details
  const planId = payment.metadata?.planId;
  const resolvedPlan = await getResolvedPlanPriceService(planId);

  // 6. Update Payment Document Status
  payment.status = PAYMENT_STATUS.CAPTURED;
  payment.paymentId = razorpay_payment_id;
  payment.paidAt = new Date();
  await payment.save();

  // 7. Create Immutable Transaction Record
  const transactionId = `txn_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  const transaction = await createTransactionRepo({
    transactionId,
    user: userId,
    payment: payment._id,
    type: TRANSACTION_TYPE.PAYMENT,
    amount: payment.amount,
    currency: payment.currency,
    status: TRANSACTION_STATUS.SUCCESS,
    razorpayPaymentId: razorpay_payment_id,
    razorpayOrderId: razorpay_order_id,
    razorpaySignature: razorpay_signature,
    gatewayResponse: {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      verifiedAt: new Date(),
    },
  });

  // 8. Calculate Subscription Duration & Dates
  const startDate = new Date();
  const durationDays = resolvedPlan.durationDays || 30;
  const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

  // 9. Save Active Subscription
  const subscription = await upsertSubscriptionRepo({
    user: userId,
    plan: resolvedPlan.planId,
    status: SUBSCRIPTION_STATUS.ACTIVE,
    startDate,
    endDate,
    providerSubscriptionId: razorpay_payment_id,
    autoRenew: false,
  });

  // 10. Update User Model with Premium Status
  const updatedUser = await updateUserSubscriptionStateRepo(userId, {
    isPremium: true,
    subscriptionPlan: resolvedPlan.planId,
    subscriptionExpiresAt: endDate,
    subscriptionStatus: SUBSCRIPTION_STATUS.ACTIVE,
  });

  // 11. Generate Invoice Record
  const invoice = await generateInvoiceService({
    user: updatedUser,
    transaction,
    payment,
    planDetails: resolvedPlan,
  });

  // 12. Create Real-Time & Persisted System Notifications
  try {
    await createNotificationService({
      type: NOTIFICATION_TYPE.PREMIUM_ACTIVATED,
      recipientId: userId,
      resourceKind: 'Payment',
      resourceId: payment._id,
      payload: {
        planName: resolvedPlan.name,
        expiryDate: endDate.toLocaleDateString('en-IN'),
      },
    });

    await createNotificationService({
      type: NOTIFICATION_TYPE.PAYMENT_SUCCESSFUL,
      recipientId: userId,
      resourceKind: 'Transaction',
      resourceId: transaction._id,
      payload: {
        amount: payment.amount,
        planName: resolvedPlan.name,
        transactionId: transaction.transactionId,
      },
    });
  } catch (notifErr) {
    logger.warn(`[PaymentService] Notification dispatch failed: ${notifErr.message}`);
  }

  logger.info(`[PaymentService] Successfully verified payment ${razorpay_payment_id} and activated premium for user ${userId}`);

  return {
    verified: true,
    transaction: {
      transactionId: transaction.transactionId,
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.status,
    },
    subscription: {
      planId: subscription.plan,
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
    },
    invoice: {
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount,
    },
    user: {
      _id: updatedUser._id,
      isPremium: updatedUser.isPremium,
      subscriptionPlan: updatedUser.subscriptionPlan,
      subscriptionExpiresAt: updatedUser.subscriptionExpiresAt,
    },
  };
};

/**
 * Get current user subscription status
 */
export const getSubscriptionStatusService = async (userId) => {
  const user = await Subscription.findOne({ user: userId, status: SUBSCRIPTION_STATUS.ACTIVE });
  return {
    isPremium: !!(user && new Date(user.endDate) > new Date()),
    subscription: user || null,
  };
};

/**
 * Get user payment transaction history with pagination, search, status, and date range filters
 */
export const getPaymentHistoryService = async (userId, userRole, queryParams = {}) => {
  const isAdmin = userRole && userRole.toLowerCase() === 'admin';

  return await getTransactionsWithFiltersRepo({
    userId,
    isAdmin,
    targetUserId: queryParams.targetUserId,
    page: parseInt(queryParams.page, 10) || 1,
    limit: parseInt(queryParams.limit, 10) || 10,
    status: queryParams.status,
    type: queryParams.type,
    startDate: queryParams.startDate,
    endDate: queryParams.endDate,
    search: queryParams.search,
    sortBy: queryParams.sortBy || 'createdAt',
    sortOrder: queryParams.sortOrder || 'desc',
  });
};

/**
 * Get detailed transaction record by transactionId with invoice & refund details
 */
export const getTransactionDetailsService = async (transactionId, userId, userRole) => {
  if (!transactionId) {
    throw new AppError('Transaction ID parameter is required.', 400);
  }

  const transaction = await Transaction.findOne({
    $or: [{ transactionId }, { _id: mongoose.isValidObjectId(transactionId) ? transactionId : null }],
  })
    .populate('payment')
    .populate('user', 'name email mobile role');

  if (!transaction) {
    throw new AppError(`Transaction '${transactionId}' was not found.`, 404);
  }

  // Access Control: Regular users can ONLY view their own transactions
  const isAdmin = userRole && userRole.toLowerCase() === 'admin';
  const ownerId = transaction.user?._id ? transaction.user._id.toString() : transaction.user.toString();

  if (!isAdmin && ownerId !== userId.toString()) {
    throw new AppError('Access denied. You are not authorized to view this transaction.', 403);
  }

  // Fetch Invoice and Refund if present
  const invoice = await Invoice.findOne({ transaction: transaction._id });
  const refund = await Refund.findOne({ transaction: transaction._id });

  const txObj = transaction.toObject();

  // PCI Security: Strip any potential sensitive credential fields
  if (txObj.gatewayResponse) {
    delete txObj.gatewayResponse.cardNumber;
    delete txObj.gatewayResponse.cvv;
    delete txObj.gatewayResponse.card_number;
  }

  return {
    transaction: txObj,
    invoice: invoice || null,
    refund: refund || null,
  };
};

/**
 * Cancel user active subscription
 */
export const cancelSubscriptionService = async (userId) => {
  const subscription = await Subscription.findOne({
    user: userId,
    status: SUBSCRIPTION_STATUS.ACTIVE,
  });

  if (!subscription) {
    throw new AppError('No active subscription found to cancel.', 404);
  }

  subscription.status = SUBSCRIPTION_STATUS.CANCELLED;
  subscription.cancelledAt = new Date();
  await subscription.save();

  await User.findByIdAndUpdate(userId, {
    subscriptionStatus: SUBSCRIPTION_STATUS.CANCELLED,
  });

  logger.info(`[PaymentService] Subscription ${subscription._id} cancelled for user ${userId}`);

  return {
    cancelled: true,
    message: 'Your subscription cancellation has been requested. Pro features remain active until end of billing cycle.',
    expiresAt: subscription.endDate,
  };
};

/**
 * Toggle auto-renew for user subscription
 */
export const toggleAutoRenewService = async (userId, autoRenew) => {
  const subscription = await Subscription.findOne({
    user: userId,
    status: SUBSCRIPTION_STATUS.ACTIVE,
  });

  if (!subscription) {
    throw new AppError('No active subscription found.', 404);
  }

  subscription.autoRenew = !!autoRenew;
  await subscription.save();

  return {
    autoRenew: subscription.autoRenew,
    message: `Auto-renewal has been ${subscription.autoRenew ? 'enabled' : 'disabled'}.`,
  };
};

/**
 * Fetch full subscription details including plan features & billing history summary
 */
export const getSubscriptionDetailsFullService = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found.', 404);
  }

  // Check if subscription has expired
  const now = new Date();
  const isExpired = user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) < now;

  if (isExpired && user.isPremium) {
    user.isPremium = false;
    user.subscriptionStatus = SUBSCRIPTION_STATUS.EXPIRED;
    await user.save();
    await Subscription.findOneAndUpdate(
      { user: userId, status: SUBSCRIPTION_STATUS.ACTIVE },
      { status: SUBSCRIPTION_STATUS.EXPIRED }
    );
  }

  const activeSub = await Subscription.findOne({ user: userId }).sort({ createdAt: -1 });

  let planInfo = null;
  if (user.subscriptionPlan) {
    try {
      planInfo = await getResolvedPlanPriceService(user.subscriptionPlan);
    } catch {
      // Fallback
    }
  }

  return {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isPremium: user.isPremium,
      subscriptionPlan: user.subscriptionPlan,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      subscriptionStatus: user.subscriptionStatus,
    },
    subscription: activeSub || null,
    plan: planInfo || null,
    stats: {
      transactionCount,
      invoiceCount,
    },
  };
};

/**
 * Job Promotion Duration Pricing Map (in INR Rupees and Days)
 */
const JOB_PROMOTION_PLANS = {
  job_promote_7d: { durationDays: 7, priceRupees: 199, name: '7 Days Featured Promotion' },
  job_promote_14d: { durationDays: 14, priceRupees: 349, name: '14 Days Featured Promotion' },
  job_promote_30d: { durationDays: 30, priceRupees: 599, name: '30 Days Featured Promotion' },
};

/**
 * Create Razorpay Order for Job Promotion
 */
export const createJobPromotionOrderService = async (userId, { jobId, planId = 'job_promote_7d' }) => {
  if (!jobId) {
    throw new AppError('Job ID is required to promote a job vacancy.', 400);
  }

  const promoPlan = JOB_PROMOTION_PLANS[planId] || JOB_PROMOTION_PLANS.job_promote_7d;

  // 1. Fetch and Validate Job Ownership & Eligibility
  const job = await Job.findById(jobId);
  if (!job || job.isDeleted) {
    throw new AppError('The requested job vacancy was not found.', 404);
  }

  if (job.farmer.toString() !== userId.toString()) {
    throw new AppError('Only the job owner can promote this job vacancy.', 403);
  }

  if (job.status !== JOB_STATUS.ACTIVE && job.status?.toLowerCase() !== 'active') {
    throw new AppError('Only active job postings can be promoted.', 400);
  }

  // 2. Create Razorpay Gateway Order (Amount in Paise)
  const amountPaise = promoPlan.priceRupees * 100;
  const razorpay = getRazorpayInstance();

  const options = {
    amount: amountPaise,
    currency: 'INR',
    receipt: `rcpt_promo_${Date.now().toString().slice(-8)}`,
    notes: {
      userId: userId.toString(),
      jobId: jobId.toString(),
      planId,
      purpose: 'job_promotion',
    },
  };

  const order = await razorpay.orders.create(options);

  // 3. Create Local Payment Record
  const paymentData = {
    user: userId,
    orderId: order.id,
    provider: 'razorpay',
    amount: promoPlan.priceRupees,
    currency: 'INR',
    status: PAYMENT_STATUS.CREATED,
    purpose: 'job_promotion',
    metadata: {
      jobId,
      planId,
      durationDays: promoPlan.durationDays,
      planName: promoPlan.name,
    },
  };

  const localPayment = await createPaymentOrderRepo(paymentData);

  return {
    orderId: order.id,
    amount: promoPlan.priceRupees,
    amountPaise,
    currency: 'INR',
    keyId: razorpayKeyId,
    paymentId: localPayment._id,
    jobTitle: job.title,
    planName: promoPlan.name,
  };
};

/**
 * Verify Cryptographic Signature & Activate Job Promotion
 */
export const verifyJobPromotionPaymentService = async (
  userId,
  { razorpay_order_id, razorpay_payment_id, razorpay_signature }
) => {
  // 1. Verify Cryptographic HMAC Signature
  const isValid = verifyRazorpaySignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature });
  if (!isValid) {
    logger.error(`[PaymentService] Invalid Razorpay HMAC signature for order ${razorpay_order_id}`);
    throw new AppError('Cryptographic payment signature verification failed.', 400);
  }

  // 2. Retrieve Local Payment Record
  const payment = await findPaymentByOrderIdRepo(razorpay_order_id);
  if (!payment) {
    throw new AppError('Matching payment order record not found.', 404);
  }

  if (payment.user._id.toString() !== userId.toString()) {
    throw new AppError('Payment order ownership verification failed.', 403);
  }

  if (payment.status === PAYMENT_STATUS.CAPTURED) {
    return {
      verified: true,
      message: 'Job promotion is already active.',
      jobId: payment.metadata?.jobId,
    };
  }

  // 3. Update Payment Status to Captured
  await updatePaymentStatusRepo(payment._id, PAYMENT_STATUS.CAPTURED, {
    paymentId: razorpay_payment_id,
    paidAt: new Date(),
  });

  // 4. Update Target Job: Set isFeatured = true and Expiry Dates
  const jobId = payment.metadata?.jobId;
  const durationDays = payment.metadata?.durationDays || 7;

  const job = await Job.findById(jobId);
  if (!job) {
    throw new AppError('Target job vacancy not found.', 404);
  }

  const now = new Date();
  const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  job.isFeatured = true;
  job.featuredStartDate = now;
  job.featuredEndDate = endDate;
  await job.save();

  // 5. Create Immutable Transaction Record
  const transactionId = `txn_promo_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  const transaction = await createTransactionRepo({
    transactionId,
    user: userId,
    payment: payment._id,
    type: TRANSACTION_TYPE.PAYMENT,
    amount: payment.amount,
    currency: payment.currency || 'INR',
    status: TRANSACTION_STATUS.SUCCESS,
    razorpayPaymentId: razorpay_payment_id,
    razorpayOrderId: razorpay_order_id,
    razorpaySignature: razorpay_signature,
  });

  // 6. Generate Tax Invoice
  const invoice = await generateInvoiceService({
    user: payment.user,
    transaction,
    payment,
    planDetails: { name: payment.metadata?.planName || 'Job Promotion' },
  });

  // 7. Dispatch Real-Time & Persisted System Notification
  await createNotificationService({
    type: NOTIFICATION_TYPE.FEATURED_JOB_ACTIVATED,
    recipientId: userId,
    resourceKind: 'Job',
    resourceId: job._id,
    payload: {
      jobTitle: job.title,
      durationDays,
      jobId: job._id,
    },
  });

  logger.info(`[PaymentService] Activated ${durationDays}-day featured promotion for job ${job._id}`);

  return {
    verified: true,
    message: `Featured promotion activated successfully for ${durationDays} days!`,
    job: {
      _id: job._id,
      title: job.title,
      isFeatured: job.isFeatured,
      featuredEndDate: job.featuredEndDate,
    },
    transactionId: transaction.transactionId,
    invoiceNumber: invoice.invoiceNumber,
  };
};

/**
 * Request a Refund for a Transaction (User Authorization Guarded)
 */
export const requestRefundService = async (userId, { transactionId, amount, reason }) => {
  if (!transactionId) {
    throw new AppError('Transaction ID is required to request a refund.', 400);
  }

  // 1. Fetch & Validate Transaction
  const transaction = await Transaction.findOne({ transactionId }).populate('payment');
  if (!transaction) {
    throw new AppError('Transaction record not found.', 404);
  }

  if (transaction.user.toString() !== userId.toString()) {
    throw new AppError('You are not authorized to request a refund for this transaction.', 403);
  }

  const payment = transaction.payment;
  if (!payment) {
    throw new AppError('Associated payment record not found.', 404);
  }

  if (payment.status !== PAYMENT_STATUS.CAPTURED && payment.status !== PAYMENT_STATUS.PARTIALLY_REFUNDED) {
    throw new AppError(`Refunds can only be requested for completed/captured payments. Current status: ${payment.status}`, 400);
  }

  // 2. Prevent Duplicate Refunds & Calculate Remaining Refundable Amount
  const existingRefunds = await findRefundsByPaymentRepo(payment._id);
  
  // Check for existing pending refund requests
  const hasPending = existingRefunds.some((r) => r.status === REFUND_STATUS.PENDING);
  if (hasPending) {
    throw new AppError('A pending refund request already exists for this payment.', 400);
  }

  const previousRefundedTotal = existingRefunds
    .filter((r) => r.status === REFUND_STATUS.PROCESSED)
    .reduce((sum, r) => sum + r.amount, 0);

  const remainingRefundable = payment.amount - previousRefundedTotal;
  if (remainingRefundable <= 0) {
    throw new AppError('This transaction has already been fully refunded.', 400);
  }

  const refundAmount = amount ? Number(amount) : remainingRefundable;
  if (isNaN(refundAmount) || refundAmount <= 0) {
    throw new AppError('Refund amount must be greater than zero.', 400);
  }

  if (refundAmount > remainingRefundable) {
    throw new AppError(`Requested refund amount (₹${refundAmount}) exceeds maximum remaining refundable balance (₹${remainingRefundable}).`, 400);
  }

  // 3. Store Refund Record (Status: Pending Admin Approval)
  const newRefundId = `rfnd_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  const refundData = {
    refundId: newRefundId,
    payment: payment._id,
    transaction: transaction._id,
    user: userId,
    amount: refundAmount,
    currency: payment.currency || 'INR',
    reason: reason || 'Customer requested refund',
    status: REFUND_STATUS.PENDING,
  };

  const newRefund = await createRefundRepo(refundData);

  // Dispatch Real-Time & Persisted Notification
  await createNotificationService({
    type: NOTIFICATION_TYPE.REFUND_REQUESTED,
    recipientId: userId,
    resourceKind: 'Refund',
    resourceId: newRefund._id,
    payload: {
      amount: newRefund.amount,
      transactionId,
      refundId: newRefund.refundId,
    },
  });

  logger.info(`[PaymentService] Refund request ${newRefund.refundId} created for transaction ${transactionId}`);

  return {
    refundId: newRefund.refundId,
    amount: newRefund.amount,
    currency: newRefund.currency,
    status: newRefund.status,
    reason: newRefund.reason,
    message: 'Refund request submitted successfully. It will be processed after admin review.',
  };
};

/**
 * Process or Reject Refund Request (Admin Authorization Only via Razorpay API)
 */
export const processRefundAdminService = async (adminUser, { refundId, action = 'approve', notes = '' }) => {
  if (adminUser.role !== 'Admin') {
    throw new AppError('Only administrators can process refund requests.', 403);
  }

  const refund = await findRefundByRefundIdRepo(refundId);
  if (!refund) {
    throw new AppError('Refund request not found.', 404);
  }

  if (refund.status !== REFUND_STATUS.PENDING) {
    throw new AppError(`Refund request is already in ${refund.status} status.`, 400);
  }

  // Handle Admin Rejection
  if (action === 'reject') {
    refund.status = REFUND_STATUS.REJECTED;
    refund.reason = notes ? `${refund.reason} [Admin rejection note: ${notes}]` : refund.reason;
    await refund.save();

    await createNotificationRepo({
      recipient: refund.user._id,
      type: NOTIFICATION_TYPE.SYSTEM,
      title: 'Refund Request Rejected',
      message: `Your refund request ${refund.refundId} was reviewed and rejected.`,
    });

    return {
      refundId: refund.refundId,
      status: refund.status,
      message: 'Refund request has been rejected.',
    };
  }

  // Handle Admin Approval via Razorpay API
  const payment = refund.payment;
  const transaction = refund.transaction;

  const razorpayPaymentId = transaction?.razorpayPaymentId || payment?.paymentId;
  if (!razorpayPaymentId) {
    throw new AppError('Razorpay payment gateway ID not found for processing refund.', 400);
  }

  const razorpay = getRazorpayInstance();
  const amountPaise = Math.round(refund.amount * 100);

  let razorpayRefund;
  try {
    razorpayRefund = await razorpay.payments.refund(razorpayPaymentId, {
      amount: amountPaise,
      notes: {
        refundId: refund.refundId,
        reason: refund.reason,
        processedByAdmin: adminUser._id.toString(),
      },
    });
  } catch (err) {
    logger.error(`[PaymentService] Razorpay API refund error: ${err.message}`);
    refund.status = REFUND_STATUS.FAILED;
    await refund.save();
    throw new AppError(`Razorpay refund failed: ${err.message || 'Payment gateway error'}`, 500);
  }

  // Update Local Refund Record
  refund.status = REFUND_STATUS.PROCESSED;
  refund.providerRefundId = razorpayRefund.id;
  await refund.save();

  // Recalculate Payment Refunded Status
  const allRefunds = await findRefundsByPaymentRepo(payment._id);
  const totalProcessedAmount = allRefunds
    .filter((r) => r.status === REFUND_STATUS.PROCESSED)
    .reduce((sum, r) => sum + r.amount, 0);

  const newPaymentStatus =
    totalProcessedAmount >= payment.amount
      ? PAYMENT_STATUS.REFUNDED
      : PAYMENT_STATUS.PARTIALLY_REFUNDED;

  await updatePaymentStatusRepo(payment._id, newPaymentStatus);

  // Create Immutable Refund Transaction
  const refundTransactionId = `txn_rfnd_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  await createTransactionRepo({
    transactionId: refundTransactionId,
    user: refund.user._id,
    payment: payment._id,
    type: TRANSACTION_TYPE.REFUND,
    amount: refund.amount,
    currency: refund.currency || 'INR',
    status: TRANSACTION_STATUS.REFUNDED,
    razorpayPaymentId: razorpayPaymentId,
    razorpayOrderId: payment.orderId,
  });

  // Real-Time & Persisted Notification
  await createNotificationService({
    type: NOTIFICATION_TYPE.REFUND_PROCESSED,
    recipientId: refund.user._id,
    resourceKind: 'Refund',
    resourceId: refund._id,
    payload: {
      amount: refund.amount,
      refundId: refund.refundId,
    },
  });

  logger.info(`[PaymentService] Processed refund ${refund.refundId} via Razorpay refund ID ${razorpayRefund.id}`);

  return {
    refundId: refund.refundId,
    providerRefundId: razorpayRefund.id,
    amount: refund.amount,
    status: refund.status,
    paymentStatus: newPaymentStatus,
    message: 'Refund has been successfully processed via Razorpay gateway.',
  };
};

/**
 * Get Refund Requests of Current Authenticated User
 */
export const getUserRefundRequestsService = async (userId, queryParams) => {
  return await getUserRefundsRepo(userId, queryParams);
};

/**
 * Admin: Get All Refund Requests with Filters
 */
export const getAllRefundRequestsAdminService = async (queryParams) => {
  return await getAllRefundsRepo(queryParams);
};
