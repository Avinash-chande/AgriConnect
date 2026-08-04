import { asyncHandler } from '../utils/asyncHandler.js';
import { sendResponse } from '../utils/apiResponse.js';
import { toggleSaveJobService, getSavedJobsService } from '../services/savedJobService.js';

/**
 * @desc    Toggle Save / Bookmark Job (Worker Only)
 * @route   POST /api/v1/jobs/:id/save
 * @access  Private (Worker Only)
 */
export const toggleSaveJob = asyncHandler(async (req, res) => {
  const result = await toggleSaveJobService(req.user, req.params.id);
  return sendResponse(res, 200, result.message, result);
});

/**
 * @desc    Get Saved Jobs List for Worker
 * @route   GET /api/v1/jobs/saved
 * @access  Private (Worker Only)
 */
export const getSavedJobs = asyncHandler(async (req, res) => {
  const result = await getSavedJobsService(req.user, req.query);
  return sendResponse(res, 200, 'Saved jobs retrieved successfully', result.jobs, {
    pagination: result.pagination,
  });
});
