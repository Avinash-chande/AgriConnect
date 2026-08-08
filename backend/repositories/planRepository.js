import { Plan } from '../models/Plan.js';
import { DEFAULT_PLANS } from '../constants/paymentPlans.js';

/**
 * Fetch all active plans from DB with fallback to DEFAULT_PLANS
 */
export const getAllActivePlansRepo = async (role = null) => {
  const query = { isActive: true };
  if (role) {
    query.targetRole = { $in: [role.toLowerCase(), 'all'] };
  }

  let plans = await Plan.find(query).sort({ sortOrder: 1 });

  // If database has no seeded plans, return filtered DEFAULT_PLANS
  if (!plans || plans.length === 0) {
    if (role) {
      return DEFAULT_PLANS.filter(
        (p) => p.isActive && (p.targetRole === role.toLowerCase() || p.targetRole === 'all')
      ).sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return DEFAULT_PLANS.filter((p) => p.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  return plans;
};

/**
 * Fetch a specific plan by planId from DB or DEFAULT_PLANS
 */
export const getPlanByIdRepo = async (planId) => {
  if (!planId) return null;
  const normalizedId = planId.toLowerCase().trim();

  const dbPlan = await Plan.findOne({ planId: normalizedId, isActive: true });
  if (dbPlan) return dbPlan;

  const defaultPlan = DEFAULT_PLANS.find(
    (p) => p.planId.toLowerCase() === normalizedId && p.isActive
  );
  return defaultPlan || null;
};

/**
 * Seed or Upsert Plan in DB
 */
export const upsertPlanRepo = async (planData) => {
  return await Plan.findOneAndUpdate(
    { planId: planData.planId.toLowerCase() },
    planData,
    { new: true, upsert: true, runValidators: true }
  );
};
