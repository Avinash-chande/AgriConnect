import { asyncHandler } from '../utils/asyncHandler.js';
import { sendResponse } from '../utils/apiResponse.js';
import {
  createPaymentOrderService,
  verifyPaymentService,
  getSubscriptionStatusService,
  getPaymentHistoryService,
  getTransactionDetailsService,
  cancelSubscriptionService,
  toggleAutoRenewService,
  getSubscriptionDetailsFullService,
  createJobPromotionOrderService,
  verifyJobPromotionPaymentService,
  requestRefundService,
  processRefundAdminService,
  getUserRefundRequestsService,
  getAllRefundRequestsAdminService,
} from '../services/paymentService.js';
import { getInvoiceByIdService } from '../services/invoiceService.js';
import { runAllExpirationChecksService } from '../services/expirationService.js';

/**
 * @desc    Create Razorpay Payment Order
 * @route   POST /api/v1/payments/orders
 * @access  Private (Authenticated User)
 */
export const createPaymentOrder = asyncHandler(async (req, res) => {
  const { planId, purpose, idempotencyKey, notes } = req.body;

  const result = await createPaymentOrderService({
    userId: req.user._id,
    planId,
    purpose,
    idempotencyKey,
    notes,
  });

  return sendResponse(res, 201, 'Payment order created successfully', result);
});

/**
 * @desc    Verify Razorpay Payment Signature & Activate Premium Membership
 * @route   POST /api/v1/payments/verify
 * @access  Private (Authenticated User)
 */
export const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const result = await verifyPaymentService({
    userId: req.user._id,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  });

  return sendResponse(res, 200, 'Payment verified successfully and premium membership activated', result);
});

/**
 * @desc    Get Current User Subscription Status
 * @route   GET /api/v1/payments/subscription
 * @access  Private (Authenticated User)
 */
export const getSubscriptionStatus = asyncHandler(async (req, res) => {
  const result = await getSubscriptionStatusService(req.user._id);

  return sendResponse(res, 200, 'Subscription status retrieved', result);
});

/**
 * @desc    Get User Payment History with filters, search, and pagination
 * @route   GET /api/v1/payments/history
 * @access  Private (Authenticated User)
 */
export const getPaymentHistory = asyncHandler(async (req, res) => {
  const result = await getPaymentHistoryService(req.user._id, req.user.role, req.query);

  return sendResponse(res, 200, 'Payment history retrieved successfully', result);
});

/**
 * @desc    Get Invoice for completed transaction
 * @route   GET /api/v1/payments/invoice/:transactionId
 * @access  Private (Authenticated User)
 */
export const getInvoice = asyncHandler(async (req, res) => {
  const { transactionId } = req.params;
  const result = await getInvoiceByIdService(transactionId, req.user._id);

  return sendResponse(res, 200, 'Invoice details retrieved', { invoice: result });
});

/**
 * @desc    Get Detailed Transaction Record
 * @route   GET /api/v1/payments/details/:transactionId
 * @access  Private (Authenticated User)
 */
export const getTransactionDetails = asyncHandler(async (req, res) => {
  const { transactionId } = req.params;
  const result = await getTransactionDetailsService(transactionId, req.user._id, req.user.role);

  return sendResponse(res, 200, 'Transaction details retrieved successfully', result);
});

/**
 * @desc    Get Full Subscription Management Details
 * @route   GET /api/v1/payments/subscription/me
 * @access  Private (Authenticated User)
 */
export const getSubscriptionDetailsFull = asyncHandler(async (req, res) => {
  const result = await getSubscriptionDetailsFullService(req.user._id);

  return sendResponse(res, 200, 'Full subscription details retrieved', result);
});

/**
 * @desc    Cancel Active Subscription
 * @route   POST /api/v1/payments/subscription/cancel
 * @access  Private (Authenticated User)
 */
export const cancelSubscription = asyncHandler(async (req, res) => {
  const result = await cancelSubscriptionService(req.user._id);

  return sendResponse(res, 200, result.message, result);
});

/**
 * @desc    Toggle Subscription Auto-Renew
 * @route   POST /api/v1/payments/subscription/auto-renew
 * @access  Private (Authenticated User)
 */
export const toggleAutoRenew = asyncHandler(async (req, res) => {
  const { autoRenew } = req.body;
  const result = await toggleAutoRenewService(req.user._id, autoRenew);

  return sendResponse(res, 200, result.message, result);
});

/**
 * @desc    Create Payment Order to Promote a Job Vacancy
 * @route   POST /api/v1/payments/promote-job/order
 * @access  Private (Farmer Only)
 */
export const createJobPromotionOrder = asyncHandler(async (req, res) => {
  const result = await createJobPromotionOrderService(req.user._id, req.body);

  return sendResponse(res, 201, 'Job promotion payment order created successfully', result);
});

/**
 * @desc    Verify Cryptographic Signature & Activate Job Promotion
 * @route   POST /api/v1/payments/promote-job/verify
 * @access  Private (Farmer Only)
 */
export const verifyJobPromotionPayment = asyncHandler(async (req, res) => {
  const result = await verifyJobPromotionPaymentService(req.user._id, req.body);

  return sendResponse(res, 200, result.message, result);
});

/**
 * @desc    Submit a Refund Request for a Transaction
 * @route   POST /api/v1/payments/refund/request
 * @access  Private (Authenticated User)
 */
export const requestRefund = asyncHandler(async (req, res) => {
  const result = await requestRefundService(req.user._id, req.body);

  return sendResponse(res, 201, result.message, result);
});

/**
 * @desc    Approve or Reject a Refund Request (Admin Only via Razorpay API)
 * @route   POST /api/v1/payments/refund/process
 * @access  Private (Admin Only)
 */
export const processRefundAdmin = asyncHandler(async (req, res) => {
  const result = await processRefundAdminService(req.user, req.body);

  return sendResponse(res, 200, result.message, result);
});

/**
 * @desc    Get Refund Requests submitted by current user
 * @route   GET /api/v1/payments/refund/my-requests
 * @access  Private (Authenticated User)
 */
export const getUserRefundRequests = asyncHandler(async (req, res) => {
  const result = await getUserRefundRequestsService(req.user._id, req.query);

  return sendResponse(res, 200, 'User refund requests retrieved successfully', result);
});

/**
 * @desc    Get All Refund Requests for Admin Management
 * @route   GET /api/v1/payments/refund/all
 * @access  Private (Admin Only)
 */
export const getAllRefundRequestsAdmin = asyncHandler(async (req, res) => {
  const result = await getAllRefundRequestsAdminService(req.query);

  return sendResponse(res, 200, 'All refund requests retrieved successfully', result);
});

/**
 * @desc    Run On-Demand Expiration & Promotion Sweep
 * @route   POST /api/v1/payments/expiration/run-maintenance
 * @access  Private (Admin Only)
 */
export const runExpirationMaintenance = asyncHandler(async (req, res) => {
  const result = await runAllExpirationChecksService();

  return sendResponse(res, 200, 'Server-side expiration sweep completed successfully', result);
});
