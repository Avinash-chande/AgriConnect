import api from './api';
import type { MembershipPlan, PlanApiResponse } from '../types/plan';

/**
 * Fetch available membership plans for a specific role or all users
 */
export const getPlansApi = async (role?: string): Promise<MembershipPlan[]> => {
  const response = await api.get<PlanApiResponse>('/plans', {
    params: role ? { role } : undefined,
  });
  return response.data.data.plans;
};

/**
 * Fetch plan details by planId
 */
export const getPlanByIdApi = async (planId: string): Promise<MembershipPlan> => {
  const response = await api.get<{ success: boolean; data: { plan: MembershipPlan } }>(
    `/plans/${planId}`
  );
  return response.data.data.plan;
};
