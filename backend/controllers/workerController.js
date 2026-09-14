import { asyncHandler } from '../utils/asyncHandler.js';
import { sendResponse } from '../utils/apiResponse.js';
import { getFeaturedWorkersService, searchWorkersService } from '../services/workerService.js';

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

/**
 * @desc    Search Verified Workers (Keyword, Location, Category, Pagination)
 * @route   GET /api/v1/workers/search or GET /api/workers/search
 * @access  Public (No login required)
 */
export const searchWorkersController = asyncHandler(async (req, res) => {
  const {
    search,
    keyword,
    q,
    location,
    category,
    page = 1,
    limit = 12,
    sort = 'rating',
  } = req.query;

  const effectiveSearch = search || keyword || q || '';

  const result = await searchWorkersService({
    search: effectiveSearch,
    location,
    category,
    page,
    limit,
    sort,
  });

  return sendResponse(res, 200, 'Workers retrieved successfully', result);
});

