import { asyncHandler } from '../utils/asyncHandler.js';
import { sendResponse } from '../utils/apiResponse.js';
import { getFeaturedWorkersService } from '../services/workerService.js';

/**
 * @desc    Get Featured Verified Workers
 * @route   GET /api/v1/workers/featured or GET /api/workers/featured
 * @access  Public
 */
export const getFeaturedWorkersController = asyncHandler(async (req, res) => {
  const limit = req.query.limit || 6;
  const workers = await getFeaturedWorkersService(limit);
  return sendResponse(res, 200, 'Featured workers retrieved successfully', workers);
});
