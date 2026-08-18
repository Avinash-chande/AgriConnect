import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Crown,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  XCircle,
  ArrowRight,
  Zap,
  CreditCard,
  FileText,
  Sparkles,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import {
  getSubscriptionDetailsFullApi,
  cancelSubscriptionApi,
  toggleAutoRenewApi,
} from '../services/paymentService';
import { RazorpayCheckoutModal } from '../components/payment/RazorpayCheckoutModal';
import type { MembershipPlan } from '../types/plan';

export const SubscriptionManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState<boolean>(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['subscription-me'],
    queryFn: getSubscriptionDetailsFullApi,
  });

  const cancelMutation = useMutation({
    mutationFn: cancelSubscriptionApi,
    onSuccess: (data) => {
      alert(data.message || 'Subscription cancelled successfully.');
      queryClient.invalidateQueries({ queryKey: ['subscription-me'] });
      setIsCancelModalOpen(false);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to cancel subscription.');
    },
  });

  const autoRenewMutation = useMutation({
    mutationFn: (newValue: boolean) => toggleAutoRenewApi(newValue),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-me'] });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="text-sm font-semibold text-slate-600">Loading subscription status...</p>
        </div>
      </div>
    );
  }

  const user = data?.user || {};
  const subscription = data?.subscription || {};
  const plan = data?.plan || {};
  const stats = data?.stats || { transactionCount: 0, invoiceCount: 0 };

  const isPremium = user.isPremium;
  const status = user.subscriptionStatus || 'free';
  const autoRenew = subscription.autoRenew ?? true;

  const startDate = subscription.startDate
    ? new Date(subscription.startDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'N/A';

  const expiryDate = user.subscriptionExpiresAt
    ? new Date(user.subscriptionExpiresAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'N/A';

  const planObj: MembershipPlan = {
    planId: user.subscriptionPlan || 'farmer_pro_monthly',
    name: plan.name || 'Premium Membership',
    description: plan.description || 'Full Access Plan',
    price: plan.price || 499,
    currency: plan.currency || 'INR',
    billingPeriod: plan.billingPeriod || 'monthly',
    targetRole: 'all',
    features: plan.features || [
      'Featured Job Postings',
      'AI Candidate Recommendations',
      'Priority Worker Search',
      'Advanced Farm Analytics',
      'Verified Gold Badge',
    ],
    isActive: true,
    sortOrder: 1,
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 mb-2">
              <Crown className="w-3.5 h-3.5" />
              Membership Control Center
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Premium Membership</h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage your subscription plan, auto-renewal settings, and member benefits.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow transition"
            >
              <Zap className="w-4 h-4" />
              Upgrade Plan
            </Link>
          </div>
        </div>

        {/* Current Plan Overview Card */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-agri-primary text-white rounded-3xl p-8 shadow-soft-lg relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    isPremium && status === 'active'
                      ? 'bg-white/20 text-white border border-white/30 backdrop-blur-sm'
                      : status === 'cancelled'
                      ? 'bg-amber-500/30 text-amber-200 border border-amber-400/40 backdrop-blur-sm'
                      : 'bg-white/10 text-emerald-100 border border-white/20 backdrop-blur-sm'
                  }`}
                >
                  {isPremium ? `Active ${status}` : 'Free Plan'}
                </span>
                {isPremium && <Crown className="w-5 h-5 text-amber-300" />}
              </div>

              <h2 className="text-2xl font-black font-heading tracking-tight text-white">
                {isPremium ? planObj.name : 'AgriConnect Free Tier'}
              </h2>

              <p className="text-xs text-slate-300 max-w-lg">
                {isPremium
                  ? 'Your premium subscription provides priority visibility, AI recommendations, and farm management analytics.'
                  : 'Upgrade to Premium Pro to unlock unlimited job postings, priority placement, and AI recommendations.'}
              </p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 text-right space-y-1 min-w-[200px]">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Billing Renewal</p>
              <p className="text-sm font-bold text-white">{expiryDate}</p>
              {isPremium && (
                <p className="text-[10px] text-emerald-400">
                  {status === 'cancelled' ? 'Expires at end of cycle' : 'Renews automatically'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Subscription Specs & Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Subscription Metadata & Auto-Renew */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              Subscription Timeline & Renewal
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl">
                <p className="text-slate-400 uppercase text-[10px] font-bold mb-1">Start Date</p>
                <p className="font-bold text-slate-800 text-sm">{startDate}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl">
                <p className="text-slate-400 uppercase text-[10px] font-bold mb-1">Expiration Date</p>
                <p className="font-bold text-slate-800 text-sm">{expiryDate}</p>
              </div>
            </div>

            {/* Auto-Renew Toggle */}
            {isPremium && (
              <div className="flex items-center justify-between p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                <div>
                  <p className="text-xs font-bold text-slate-900">Auto-Renew Subscription</p>
                  <p className="text-[11px] text-slate-500">
                    Automatically renew membership at end of billing cycle.
                  </p>
                </div>
                <button
                  onClick={() => autoRenewMutation.mutate(!autoRenew)}
                  disabled={autoRenewMutation.isPending}
                  className="text-emerald-700 hover:text-emerald-900 transition"
                >
                  {autoRenew ? (
                    <ToggleRight className="w-8 h-8 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-400" />
                  )}
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {isPremium && status !== 'cancelled' && (
                <button
                  onClick={() => setIsCancelModalOpen(true)}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold rounded-xl transition"
                >
                  Cancel Subscription
                </button>
              )}

              {isPremium && (
                <button
                  onClick={() => setIsRenewModalOpen(true)}
                  className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Renew Now
                </button>
              )}
            </div>
          </div>

          {/* Quick Ledger Navigation */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              Billing Summary
            </h3>

            <div className="space-y-3">
              <Link
                to="/payment-history"
                className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 rounded-2xl transition text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4 text-slate-500" />
                  <span className="font-semibold text-slate-800">Transaction History</span>
                </div>
                <span className="font-bold text-emerald-700">{stats.transactionCount}</span>
              </Link>

              <Link
                to="/payment-history"
                className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 rounded-2xl transition text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span className="font-semibold text-slate-800">Tax Invoices</span>
                </div>
                <span className="font-bold text-emerald-700">{stats.invoiceCount}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Unlocked Benefits Feature List */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Included Premium Benefits
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {planObj.features.map((feature, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="font-medium text-slate-800">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center">Cancel Premium Subscription?</h3>
            <p className="text-xs text-slate-500 text-center">
              Your premium features will remain accessible until <span className="font-bold">{expiryDate}</span>. After this date, your plan will revert to the free tier.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="w-1/2 py-2.5 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition"
              >
                Keep Subscription
              </button>
              <button
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow transition"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Razorpay Renewal Modal */}
      <RazorpayCheckoutModal
        plan={planObj}
        isOpen={isRenewModalOpen}
        onClose={() => setIsRenewModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['subscription-me'] });
          setIsRenewModalOpen(false);
        }}
      />
    </div>
  );
};

export default SubscriptionManagementPage;
