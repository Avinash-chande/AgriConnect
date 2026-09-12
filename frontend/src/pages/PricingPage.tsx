import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, XCircle, Sparkles, HelpCircle, ShieldCheck } from 'lucide-react';
import { getPlansApi } from '../services/planService';
import { PlanComparisonCard } from '../components/payment/PlanComparisonCard';
import { RazorpayCheckoutModal } from '../components/payment/RazorpayCheckoutModal';
import { useAuth } from '../context/AuthContext';
import type { MembershipPlan } from '../types/plan';

export const PricingPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState<'farmer' | 'worker'>(
    user?.role === 'worker' ? 'worker' : 'farmer'
  );
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [checkoutPlan, setCheckoutPlan] = useState<MembershipPlan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const { data: plans = [], isLoading, error } = useQuery({
    queryKey: ['plans', selectedRole],
    queryFn: () => getPlansApi(selectedRole),
  });

  const filteredPlans = plans.filter((plan) => {
    if (plan.price === 0) return true;
    return plan.billingPeriod === billingCycle;
  });

  const handleSelectPlan = (plan: MembershipPlan) => {
    if (plan.price === 0) {
      alert(`You are currently on the Free ${selectedRole === 'farmer' ? 'Farmer' : 'Worker'} tier.`);
      return;
    }
    setCheckoutPlan(plan);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <div className="max-w-7xl mx-auto text-center mb-12">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-bold text-emerald-800 mb-4">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          AgriConnect Premium Membership Tiers
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl tracking-tight">
          Supercharge Your Agricultural Growth
        </h1>
        <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
          Choose the perfect plan tailored for your farm or labor operations. Transparent pricing with zero hidden fees.
        </p>

        {/* Role Switcher */}
        <div className="mt-8 flex justify-center">
          <div className="bg-slate-200 p-1.5 rounded-2xl inline-flex gap-2 border border-slate-300">
            <button
              onClick={() => setSelectedRole('farmer')}
              className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                selectedRole === 'farmer'
                  ? 'bg-emerald-800 text-white shadow-md'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              🌾 For Farmers
            </button>
            <button
              onClick={() => setSelectedRole('worker')}
              className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                selectedRole === 'worker'
                  ? 'bg-emerald-800 text-white shadow-md'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              🚜 For Workers & Operators
            </button>
          </div>
        </div>

        {/* Billing Cycle Switcher */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
            Monthly Billing
          </span>
          <button
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
            className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-emerald-600 transition-colors duration-200 ease-in-out focus:outline-none"
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                billingCycle === 'yearly' ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <span className={`text-sm font-medium flex items-center gap-1.5 ${billingCycle === 'yearly' ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
            Annual Billing
            <span className="rounded-full bg-amber-100 text-amber-800 text-xs px-2 py-0.5 font-extrabold">
              Save 20%
            </span>
          </span>
        </div>
      </div>

      {/* Plan Cards Grid */}
      <div className="max-w-7xl mx-auto">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-rose-600">
            Failed to load membership plans. Please try again later.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPlans.map((plan) => (
              <PlanComparisonCard
                key={plan.planId}
                plan={plan}
                isPopular={plan.planId.includes('pro_monthly') || plan.planId.includes('pro_yearly')}
                isCurrent={user?.subscriptionPlan === plan.planId}
                onSelectPlan={handleSelectPlan}
              />
            ))}
          </div>
        )}
      </div>

      {/* Comprehensive Feature Comparison Matrix */}
      <div className="max-w-5xl mx-auto mt-20 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
        <h3 className="text-2xl font-bold text-slate-900 text-center mb-8 flex items-center justify-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-600" />
          Detailed Feature Comparison
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th className="py-4 px-4">Feature</th>
                <th className="py-4 px-4 text-center">Free Tier</th>
                <th className="py-4 px-4 text-center text-emerald-600 font-bold">Pro Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              <tr>
                <td className="py-4 px-4 font-medium">Featured Job Postings</td>
                <td className="py-4 px-4 text-center"><XCircle className="w-5 h-5 mx-auto text-slate-300" /></td>
                <td className="py-4 px-4 text-center"><CheckCircle2 className="w-5 h-5 mx-auto text-emerald-500" /></td>
              </tr>
              <tr>
                <td className="py-4 px-4 font-medium">AI Match Recommendations</td>
                <td className="py-4 px-4 text-center">Standard</td>
                <td className="py-4 px-4 text-center font-semibold text-emerald-600">Priority AI Ranking</td>
              </tr>
              <tr>
                <td className="py-4 px-4 font-medium">Advanced GIS & Location Search</td>
                <td className="py-4 px-4 text-center"><XCircle className="w-5 h-5 mx-auto text-slate-300" /></td>
                <td className="py-4 px-4 text-center"><CheckCircle2 className="w-5 h-5 mx-auto text-emerald-500" /></td>
              </tr>
              <tr>
                <td className="py-4 px-4 font-medium">Daily AI Query Budget</td>
                <td className="py-4 px-4 text-center">50 Requests/Day</td>
                <td className="py-4 px-4 text-center font-semibold text-emerald-600">500 Requests/Day</td>
              </tr>
              <tr>
                <td className="py-4 px-4 font-medium">Pro Verified Badge</td>
                <td className="py-4 px-4 text-center"><XCircle className="w-5 h-5 mx-auto text-slate-300" /></td>
                <td className="py-4 px-4 text-center"><CheckCircle2 className="w-5 h-5 mx-auto text-emerald-500" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto mt-20">
        <h3 className="text-2xl font-bold text-slate-900 text-center mb-8 flex items-center justify-center gap-2">
          <HelpCircle className="w-6 h-6 text-emerald-600" />
          Frequently Asked Questions
        </h3>
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h4 className="font-bold text-slate-900 mb-2">Can I switch plans at any time?</h4>
            <p className="text-sm text-slate-600">
              Yes! You can upgrade or downgrade your membership plan whenever you like. Upgrades apply immediately.
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h4 className="font-bold text-slate-900 mb-2">How are payments processed securely?</h4>
            <p className="text-sm text-slate-600">
              All transactions are processed through Razorpay's PCI-DSS compliant server infrastructure. AgriConnect never stores your credit card, UPI PIN, or bank credentials.
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h4 className="font-bold text-slate-900 mb-2">Is there an automatic refund for cancellations?</h4>
            <p className="text-sm text-slate-600">
              Eligible transactions requested within 7 days are processed automatically per our platform policy.
            </p>
          </div>
        </div>
      </div>

      {/* Razorpay Secure Checkout Modal */}
      <RazorpayCheckoutModal
        plan={checkoutPlan}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default PricingPage;
