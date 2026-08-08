import React from 'react';
import { CheckCircle2, Zap, Crown, ShieldCheck } from 'lucide-react';
import type { MembershipPlan } from '../../types/plan';

interface PlanComparisonCardProps {
  plan: MembershipPlan;
  isPopular?: boolean;
  isCurrent?: boolean;
  onSelectPlan: (plan: MembershipPlan) => void;
  isLoading?: boolean;
}

export const PlanComparisonCard: React.FC<PlanComparisonCardProps> = ({
  plan,
  isPopular = false,
  isCurrent = false,
  onSelectPlan,
  isLoading = false,
}) => {
  const isFree = plan.price === 0;

  return (
    <div
      className={`relative flex flex-col justify-between rounded-3xl p-8 transition-all duration-300 ${
        isPopular
          ? 'bg-slate-900 text-white shadow-2xl ring-2 ring-emerald-500 hover:-translate-y-1'
          : 'bg-white text-slate-800 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1'
      }`}
    >
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-md flex items-center gap-1">
          <Zap className="w-3.5 h-3.5 fill-current" />
          Most Popular Choice
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {isPopular ? (
              <Crown className="w-6 h-6 text-amber-400" />
            ) : (
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
            )}
            <h3 className="text-xl font-bold">{plan.name}</h3>
          </div>
          {isCurrent && (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              Active Plan
            </span>
          )}
        </div>

        <p className={`text-sm mb-6 ${isPopular ? 'text-slate-300' : 'text-slate-600'}`}>
          {plan.description}
        </p>

        <div className="mb-6">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-extrabold tracking-tight">
              {isFree ? '₹0' : `₹${plan.price.toLocaleString('en-IN')}`}
            </span>
            <span className={`text-sm font-medium ${isPopular ? 'text-slate-300' : 'text-slate-500'}`}>
              /{plan.billingPeriod === 'yearly' ? 'year' : plan.billingPeriod === 'monthly' ? 'month' : 'forever'}
            </span>
          </div>
          {plan.billingPeriod === 'yearly' && !isFree && (
            <p className="text-xs text-emerald-400 font-semibold mt-1">
              Includes ~20% annual discount!
            </p>
          )}
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 pt-6 mb-8">
          <p className={`text-xs font-semibold uppercase tracking-wider mb-4 ${isPopular ? 'text-slate-300' : 'text-slate-500'}`}>
            Included Features
          </p>
          <ul className="space-y-3">
            {plan.features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm">
                <CheckCircle2
                  className={`w-5 h-5 shrink-0 ${
                    isPopular ? 'text-emerald-400' : 'text-emerald-600'
                  }`}
                />
                <span className={isPopular ? 'text-slate-200' : 'text-slate-700'}>
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <button
        onClick={() => onSelectPlan(plan)}
        disabled={isCurrent || isLoading}
        className={`w-full rounded-xl py-3.5 px-6 font-semibold text-sm transition-all duration-200 shadow-md ${
          isCurrent
            ? 'bg-slate-200 text-slate-500 cursor-not-allowed shadow-none'
            : isPopular
            ? 'bg-emerald-500 text-white hover:bg-emerald-600 hover:shadow-emerald-500/25 active:scale-95'
            : 'bg-emerald-800 text-white hover:bg-emerald-900 active:scale-95'
        }`}
      >
        {isCurrent
          ? 'Current Active Plan'
          : isFree
          ? 'Get Started Free'
          : `Upgrade to ${plan.name}`}
      </button>
    </div>
  );
};
