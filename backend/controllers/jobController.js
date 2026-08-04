import { asyncHandler } from '../utils/asyncHandler.js';
import { sendResponse } from '../utils/apiResponse.js';
import {
  createJobService,
  updateJobService,
  getJobByIdService,
  deleteJobService,
  getAllJobsService,
  autocompleteJobsService,
  incrementJobShareCountService,
  getFarmerJobsService,
} from '../services/jobService.js';

/**
 * @desc    Get Farmer Dashboard Jobs & Performance Metrics
 * @route   GET /api/v1/jobs/farmer/my-jobs
 * @access  Private (Farmer Only)
 */
export const getFarmerJobs = asyncHandler(async (req, res) => {
  const result = await getFarmerJobsService(req.user, req.query);
  return sendResponse(res, 200, 'Farmer job dashboard data retrieved successfully', result.jobs, {
    stats: result.stats,
    pagination: result.pagination,
  });
});

/**
 * @desc    Get All Job Postings with Pagination, Filtering & Sorting
 * @route   GET /api/v1/jobs
 * @access  Public
 */
export const getAllJobs = asyncHandler(async (req, res) => {
  const result = await getAllJobsService(req.query);
  return sendResponse(res, 200, 'Job vacancies retrieved successfully', result.jobs, {
    pagination: result.pagination,
  });
});

/**
 * @desc    Get Smart Autocomplete Suggestions for Search Input
 * @route   GET /api/v1/jobs/autocomplete
 * @access  Public
 */
export const autocompleteJobs = asyncHandler(async (req, res) => {
  const result = await autocompleteJobsService(req.query.q || req.query.query || '');
  return sendResponse(res, 200, 'Autocomplete suggestions retrieved successfully', result);
});

/**
 * @desc    Increment Job Share Count Metric
 * @route   POST /api/v1/jobs/:id/share
 * @access  Public
 */
export const incrementJobShareCount = asyncHandler(async (req, res) => {
  const result = await incrementJobShareCountService(req.params.id);
  return sendResponse(res, 200, 'Job share count updated successfully', result);
});

/**
 * @desc    Create a new Job Posting (Farmers Only)
 * @route   POST /api/v1/jobs
 * @access  Private (Farmer Only)
 */
export const createJob = asyncHandler(async (req, res) => {
  const result = await createJobService(req.user, req.body, req.files);
  return sendResponse(res, 201, 'Job posted successfully', result);
});

/**
 * @desc    Get single Job details by ID
 * @route   GET /api/v1/jobs/:id
 * @access  Public
 */
export const getJobById = asyncHandler(async (req, res) => {
  const result = await getJobByIdService(req.params.id);
  return sendResponse(res, 200, 'Job details retrieved successfully', result);
});

/**
 * @desc    Edit an existing Job Posting (Job Owner Only)
 * @route   PUT /api/v1/jobs/:id
 * @access  Private (Farmer Only - Job Owner)
 */
export const updateJob = asyncHandler(async (req, res) => {
  const result = await updateJobService(req.user, req.params.id, req.body, req.files);
  return sendResponse(res, 200, 'Job updated successfully', result);
});

/**
 * @desc    Soft Delete Job Posting (Job Owner or Admin Override)
 * @route   DELETE /api/v1/jobs/:id
 * @access  Private (Farmer Owner or Admin)
 */
export const deleteJob = asyncHandler(async (req, res) => {
  const result = await deleteJobService(req.user, req.params.id);
  return sendResponse(res, 200, result.message, result);
});
