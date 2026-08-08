import { asyncHandler } from '../utils/asyncHandler.js';
import { sendResponse } from '../utils/apiResponse.js';
import { getAdminPaymentAnalyticsService } from '../services/analyticsService.js';

/**
 * @desc    Get Admin Financial & Payment Analytics Metrics
 * @route   GET /api/v1/payments/analytics/admin
 * @access  Private (Admin Only)
 */
export const getAdminPaymentAnalytics = asyncHandler(async (req, res) => {
  const analyticsData = await getAdminPaymentAnalyticsService(req.query);

  return sendResponse(res, 200, 'Admin payment analytics retrieved successfully', analyticsData);
});
