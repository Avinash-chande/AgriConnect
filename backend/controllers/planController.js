import { asyncHandler } from '../utils/asyncHandler.js';
import { sendResponse } from '../utils/apiResponse.js';
import {
  getActivePlansService,
  getPlanDetailsService,
  seedPlansService,
} from '../services/planService.js';

/**
 * @desc    Get all active membership plans
 * @route   GET /api/v1/plans
 * @access  Public
 */
export const getPlans = asyncHandler(async (req, res) => {
  const role = req.query.role || (req.user ? req.user.role : null);
  const plans = await getActivePlansService(role);

  return sendResponse(res, 200, 'Membership plans retrieved successfully', {
    count: plans.length,
    plans,
  });
});

/**
 * @desc    Get membership plan details by planId
 * @route   GET /api/v1/plans/:planId
 * @access  Public
 */
export const getPlanById = asyncHandler(async (req, res) => {
  const { planId } = req.params;
  const plan = await getPlanDetailsService(planId);

  return sendResponse(res, 200, 'Membership plan details retrieved', { plan });
});

/**
 * @desc    Seed default membership plans into DB
 * @route   POST /api/v1/plans/seed
 * @access  Private (Admin)
 */
export const seedPlans = asyncHandler(async (req, res) => {
  const seeded = await seedPlansService();

  return sendResponse(res, 201, 'Default membership plans seeded successfully', {
    count: seeded.length,
    plans: seeded,
  });
});
