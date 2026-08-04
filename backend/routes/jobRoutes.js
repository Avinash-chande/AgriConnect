import express from 'express';
import { createJob, updateJob, getJobById, deleteJob, getAllJobs, autocompleteJobs, incrementJobShareCount, getFarmerJobs } from '../controllers/jobController.js';
import { toggleSaveJob, getSavedJobs } from '../controllers/savedJobController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { uploadJobImages } from '../middleware/uploadMiddleware.js';
import { validateCreateJobInput, validateUpdateJobInput, validateJobQuery } from '../validators/jobValidator.js';
import { USER_ROLES } from '../constants/index.js';
import { profileRateLimiter } from '../middleware/rateLimiter.js';
import { publicCacheControl } from './profileRoutes.js';

const router = express.Router();

/**
 * @route   GET /api/v1/jobs
 * @desc    Get All Job Postings with Pagination, Filtering & Sorting
 * @access  Public
 */
router.get('/', publicCacheControl, validateJobQuery, getAllJobs);

/**
 * @route   GET /api/v1/jobs/autocomplete
 * @desc    Get Smart Autocomplete Suggestions for Search Input
 * @access  Public
 */
router.get('/autocomplete', publicCacheControl, autocompleteJobs);

/**
 * @route   GET /api/v1/jobs/saved
 * @desc    Get Worker's Saved / Bookmarked Jobs List
 * @access  Private (Worker Only)
 */
router.get(
  '/saved',
  protect,
  authorize(USER_ROLES.WORKER),
  getSavedJobs
);

/**
 * @route   GET /api/v1/jobs/farmer/my-jobs
 * @desc    Get Farmer's Dashboard Jobs & Metrics
 * @access  Private (Farmer Only)
 */
router.get(
  '/farmer/my-jobs',
  protect,
  authorize(USER_ROLES.FARMER),
  getFarmerJobs
);

/**
 * @route   POST /api/v1/jobs
 * @desc    Create a new Job Posting (Farmers Only)
 * @access  Private (Farmer)
 */
router.post(
  '/',
  protect,
  authorize(USER_ROLES.FARMER),
  profileRateLimiter,
  uploadJobImages,
  validateCreateJobInput,
  createJob
);

/**
 * @route   GET /api/v1/jobs/:id
 * @desc    Get single Job details by ID
 * @access  Public
 */
router.get('/:id', publicCacheControl, getJobById);

/**
 * @route   POST /api/v1/jobs/:id/share
 * @desc    Increment Job Share Count Metric
 * @access  Public
 */
router.post('/:id/share', profileRateLimiter, incrementJobShareCount);

/**
 * @route   POST /api/v1/jobs/:id/save
 * @desc    Toggle Save / Bookmark Job Posting (Worker Only)
 * @access  Private (Worker Only)
 */
router.post(
  '/:id/save',
  protect,
  authorize(USER_ROLES.WORKER),
  profileRateLimiter,
  toggleSaveJob
);

/**
 * @route   PUT /api/v1/jobs/:id
 * @desc    Edit an existing Job Posting (Job Owner Only)
 * @access  Private (Farmer - Job Owner Only)
 */
router.put(
  '/:id',
  protect,
  authorize(USER_ROLES.FARMER),
  profileRateLimiter,
  uploadJobImages,
  validateUpdateJobInput,
  updateJob
);

/**
 * @route   DELETE /api/v1/jobs/:id
 * @desc    Soft Delete Job Posting (Job Owner or Admin Override)
 * @access  Private (Farmer Owner or Admin)
 */
router.delete(
  '/:id',
  protect,
  profileRateLimiter,
  deleteJob
);

export default router;
