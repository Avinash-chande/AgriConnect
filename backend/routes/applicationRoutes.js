import express from 'express';
import {
  applyForJob,
  getMyApplications,
  getFarmerApplications,
  withdrawApplication,
  acceptApplication,
  rejectApplication,
  toggleShortlistApplication,
  cancelHiring,
  getDashboardStats,
} from '../controllers/applicationController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  validateApplyJobInput,
  validateApplicationQuery,
  validateWithdrawApplicationInput,
  validateAcceptApplicationInput,
  validateRejectApplicationInput,
  validateShortlistApplicationInput,
  validateCancelHiringInput,
} from '../validators/applicationValidator.js';
import { USER_ROLES } from '../constants/index.js';
import { profileRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * @route   POST /api/v1/applications/jobs/:jobId
 * @desc    Apply for a Job Posting (Worker Only)
 * @access  Private (Worker Only)
 */
router.post(
  '/jobs/:jobId',
  protect,
  authorize(USER_ROLES.WORKER),
  profileRateLimiter,
  validateApplyJobInput,
  applyForJob
);

/**
 * @route   GET /api/v1/applications/my-applications
 * @desc    Get Worker's Submitted Applications List
 * @access  Private (Worker Only)
 */
router.get(
  '/my-applications',
  protect,
  authorize(USER_ROLES.WORKER),
  validateApplicationQuery,
  getMyApplications
);

/**
 * @route   GET /api/v1/applications/dashboard/stats
 * @desc    Get Farmer Application Dashboard Analytics
 * @access  Private (Farmer Only)
 */
router.get(
  '/dashboard/stats',
  protect,
  authorize(USER_ROLES.FARMER),
  getDashboardStats
);

/**
 * @route   GET /api/v1/applications/farmer
 * @desc    Get Applications received by logged-in Farmer
 * @access  Private (Farmer Only)
 */
router.get(
  '/farmer',
  protect,
  authorize(USER_ROLES.FARMER),
  validateApplicationQuery,
  getFarmerApplications
);

/**
 * @route   PATCH /api/v1/applications/:id/withdraw
 * @desc    Withdraw Application (Worker Only)
 * @access  Private (Worker Only)
 */
router.patch(
  '/:id/withdraw',
  protect,
  authorize(USER_ROLES.WORKER),
  profileRateLimiter,
  validateWithdrawApplicationInput,
  withdrawApplication
);

/**
 * @route   PUT /api/v1/applications/:id/withdraw (Fallback route)
 * @desc    Withdraw Application (Worker Only)
 * @access  Private (Worker Only)
 */
router.put(
  '/:id/withdraw',
  protect,
  authorize(USER_ROLES.WORKER),
  profileRateLimiter,
  validateWithdrawApplicationInput,
  withdrawApplication
);

/**
 * @route   PATCH /api/v1/applications/:id/accept
 * @desc    Accept Job Application (Farmer Only)
 * @access  Private (Farmer Only)
 */
router.patch(
  '/:id/accept',
  protect,
  authorize(USER_ROLES.FARMER),
  profileRateLimiter,
  validateAcceptApplicationInput,
  acceptApplication
);

/**
 * @route   PUT /api/v1/applications/:id/accept (Fallback route)
 * @desc    Accept Job Application (Farmer Only)
 * @access  Private (Farmer Only)
 */
router.put(
  '/:id/accept',
  protect,
  authorize(USER_ROLES.FARMER),
  profileRateLimiter,
  validateAcceptApplicationInput,
  acceptApplication
);

/**
 * @route   PATCH /api/v1/applications/:id/reject
 * @desc    Reject Job Application (Farmer Only)
 * @access  Private (Farmer Only)
 */
router.patch(
  '/:id/reject',
  protect,
  authorize(USER_ROLES.FARMER),
  profileRateLimiter,
  validateRejectApplicationInput,
  rejectApplication
);

/**
 * @route   PUT /api/v1/applications/:id/reject (Fallback route)
 * @desc    Reject Job Application (Farmer Only)
 * @access  Private (Farmer Only)
 */
router.put(
  '/:id/reject',
  protect,
  authorize(USER_ROLES.FARMER),
  profileRateLimiter,
  validateRejectApplicationInput,
  rejectApplication
);

/**
 * @route   POST /api/v1/applications/:id/shortlist
 * @desc    Toggle Shortlist Status of Job Application (Farmer Only)
 * @access  Private (Farmer Only)
 */
router.post(
  '/:id/shortlist',
  protect,
  authorize(USER_ROLES.FARMER),
  profileRateLimiter,
  validateShortlistApplicationInput,
  toggleShortlistApplication
);

/**
 * @route   PATCH /api/v1/applications/:id/shortlist
 * @desc    Toggle Shortlist Status of Job Application (Farmer Only)
 * @access  Private (Farmer Only)
 */
router.patch(
  '/:id/shortlist',
  protect,
  authorize(USER_ROLES.FARMER),
  profileRateLimiter,
  validateShortlistApplicationInput,
  toggleShortlistApplication
);

/**
 * @route   PATCH /api/v1/applications/:id/cancel-hiring
 * @desc    Cancel Hiring of an Accepted/Hired Worker (Farmer Only, pre-joining)
 * @access  Private (Farmer Only)
 */
router.patch(
  '/:id/cancel-hiring',
  protect,
  authorize(USER_ROLES.FARMER),
  profileRateLimiter,
  validateCancelHiringInput,
  cancelHiring
);

/**
 * @route   PUT /api/v1/applications/:id/cancel-hiring (Fallback route)
 */
router.put(
  '/:id/cancel-hiring',
  protect,
  authorize(USER_ROLES.FARMER),
  profileRateLimiter,
  validateCancelHiringInput,
  cancelHiring
);

export default router;
