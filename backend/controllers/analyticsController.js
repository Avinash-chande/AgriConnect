import { asyncHandler } from '../utils/asyncHandler.js';
import { sendResponse } from '../utils/apiResponse.js';
import {
  getAdminPaymentAnalyticsService,
  getHomeStatisticsService,
} from '../services/analyticsService.js';

/**
 * @desc    Get Admin Financial & Payment Analytics Metrics
 * @route   GET /api/v1/payments/analytics/admin
 * @access  Private (Admin Only)
 */
export const getAdminPaymentAnalytics = asyncHandler(async (req, res) => {
  const analyticsData = await getAdminPaymentAnalyticsService(req.query);

  return sendResponse(res, 200, 'Admin payment analytics retrieved successfully', analyticsData);
});

/**
 * @desc    Get Public Real Aggregate Statistics for /home Landing Cards
 * @route   GET /api/v1/analytics/home-stats
 * @access  Public (Logged out or Logged in, NO JWT required)
 */
export const getHomeStatisticsController = asyncHandler(async (req, res) => {
  const stats = await getHomeStatisticsService();
  return sendResponse(res, 200, 'Home statistics retrieved successfully', stats);
});

