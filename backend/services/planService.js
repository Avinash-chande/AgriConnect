import {
  getAllActivePlansRepo,
  getPlanByIdRepo,
  upsertPlanRepo,
} from '../repositories/planRepository.js';
import { DEFAULT_PLANS } from '../constants/paymentPlans.js';
import { AppError } from '../utils/appError.js';

/**
 * Get all available membership plans
 */
export const getActivePlansService = async (role = null) => {
  const plans = await getAllActivePlansRepo(role);
  return plans;
};

/**
 * Get plan details by planId
 */
export const getPlanDetailsService = async (planId) => {
  const plan = await getPlanByIdRepo(planId);
  if (!plan) {
    throw new AppError(`Membership plan '${planId}' was not found or is no longer active.`, 404);
  }
  return plan;
};

/**
 * Strictly calculate & resolve price server-side
 * @returns {Object} { planId, priceInRupees, priceInPaise, currency, durationDays }
 */
export const getResolvedPlanPriceService = async (planId) => {
  const plan = await getPlanDetailsService(planId);

  const priceInRupees = plan.price;
  const priceInPaise = Math.round(plan.price * 100);

  let durationDays = 30;
  if (plan.billingPeriod === 'yearly') {
    durationDays = 365;
  } else if (plan.billingPeriod === 'lifetime') {
    durationDays = 3650;
  }

  return {
    planId: plan.planId,
    name: plan.name,
    price: priceInRupees,
    amountInPaise: priceInPaise,
    currency: plan.currency || 'INR',
    billingPeriod: plan.billingPeriod,
    durationDays,
    features: plan.features || [],
  };
};

/**
 * Seed default membership plans into MongoDB
 */
export const seedPlansService = async () => {
  const seeded = [];
  for (const planData of DEFAULT_PLANS) {
    const plan = await upsertPlanRepo(planData);
    seeded.push(plan);
  }
  return seeded;
};
