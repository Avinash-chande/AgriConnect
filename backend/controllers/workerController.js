import { asyncHandler } from '../utils/asyncHandler.js';
import { sendResponse } from '../utils/apiResponse.js';
import {
  getFeaturedWorkersService,
  searchWorkersService,
  matchWorkersService,
} from '../services/workerService.js';

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

/**
 * @desc    AgriMatch AI Engine: Match Verified Workers from MongoDB
 * @route   GET /api/v1/workers/agrimatch or GET /api/v1/workers/match
 * @access  Public
 */
export const matchWorkersController = asyncHandler(async (req, res) => {
  const {
    crop,
    operation,
    skill,
    location,
    targetCrewSize = 5,
    limit = 10,
  } = req.query;

  const effectiveCrop = crop || operation || skill || '';
  const result = await matchWorkersService({
    crop: effectiveCrop,
    location,
    targetCrewSize: parseInt(targetCrewSize, 10) || 5,
    limit: parseInt(limit, 10) || 10,
  });

  return sendResponse(res, 200, 'AgriMatch worker recommendations generated successfully', result);
});


