export type BillingPeriod = 'monthly' | 'yearly' | 'lifetime' | 'one_time';
export type PlanTargetRole = 'farmer' | 'worker' | 'all';

export interface MembershipPlan {
  _id?: string;
  planId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingPeriod: BillingPeriod;
  targetRole: PlanTargetRole;
  features: string[];
  isActive: boolean;
  sortOrder: number;
}

export interface PlanApiResponse {
  success: boolean;
  message: string;
  data: {
    count: number;
    plans: MembershipPlan[];
  };
}
