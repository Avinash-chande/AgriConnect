import express from 'express';
import {
  createPaymentOrder,
  verifyPayment,
  getSubscriptionStatus,
  getPaymentHistory,
  getInvoice,
  getTransactionDetails,
  getSubscriptionDetailsFull,
  cancelSubscription,
  toggleAutoRenew,
  createJobPromotionOrder,
  verifyJobPromotionPayment,
  requestRefund,
  processRefundAdmin,
  getUserRefundRequests,
  getAllRefundRequestsAdmin,
  runExpirationMaintenance,
} from '../controllers/paymentController.js';
import { getAdminPaymentAnalytics } from '../controllers/analyticsController.js';
import { handleRazorpayWebhook } from '../controllers/webhookController.js';
import {
  validateCreateOrder,
  validateVerifyPayment,
} from '../validators/paymentValidator.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { paymentRateLimiter, refundRateLimiter, webhookRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Razorpay Webhook Endpoint (Raw Body HMAC Signature Verified)
router.post('/webhook', webhookRateLimiter, handleRazorpayWebhook);

// Create Razorpay Payment Order (supports /orders and /create-order)
router.post('/orders', protect, paymentRateLimiter, validateCreateOrder, createPaymentOrder);
router.post('/create-order', protect, paymentRateLimiter, validateCreateOrder, createPaymentOrder);

// Verify Cryptographic Signature & Activate Membership
router.post('/verify', protect, paymentRateLimiter, validateVerifyPayment, verifyPayment);

// Standalone Job Vacancy Promotion Endpoints
router.post('/promote-job/order', protect, paymentRateLimiter, createJobPromotionOrder);
router.post('/promote-job/verify', protect, paymentRateLimiter, verifyJobPromotionPayment);

// Refund Management Endpoints
router.post('/refund/request', protect, refundRateLimiter, requestRefund);
router.get('/refund/my-requests', protect, getUserRefundRequests);

// Admin-Only Refund Review & Processing via Razorpay API
router.post('/refund/process', protect, authorize('Admin'), refundRateLimiter, processRefundAdmin);
router.get('/refund/all', protect, authorize('Admin'), getAllRefundRequestsAdmin);

// Admin-Only Server-Side Expiration Maintenance Sweep
router.post('/expiration/run-maintenance', protect, authorize('Admin'), runExpirationMaintenance);

// Admin-Only Financial & Payment Analytics
router.get('/analytics/admin', protect, authorize('Admin'), getAdminPaymentAnalytics);

// Membership Subscription Management & Payment History
router.get('/subscription', protect, getSubscriptionStatus);
router.get('/subscription/me', protect, getSubscriptionDetailsFull);
router.post('/subscription/cancel', protect, cancelSubscription);
router.post('/subscription/auto-renew', protect, toggleAutoRenew);
router.get('/history', protect, getPaymentHistory);

// Invoice & Transaction Details retrieval
router.get('/invoice/:transactionId', protect, getInvoice);
router.get('/details/:transactionId', protect, getTransactionDetails);

export default router;
