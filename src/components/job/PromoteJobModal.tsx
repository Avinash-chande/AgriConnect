import React, { useState } from 'react';
import { Sparkles, CheckCircle2, ShieldCheck, X, Zap, Crown, Loader2, ArrowRight } from 'lucide-react';
import { createJobPromotionOrderApi, verifyJobPromotionPaymentApi } from '../../services/paymentService';
import { loadRazorpayScript } from '../../utils/razorpay';

interface PromoteJobModalProps {
  job: {
    _id: string;
    title: string;
    isFeatured?: boolean;
    featuredEndDate?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PROMOTION_TIERS = [
  {
    planId: 'job_promote_7d',
    durationDays: 7,
    priceRupees: 199,
    title: '7 Days Boost',
    badge: 'Popular',
    perDay: '₹28/day',
  },
  {
    planId: 'job_promote_14d',
    durationDays: 14,
    priceRupees: 349,
    title: '14 Days Super Boost',
    badge: 'Best Value',
    perDay: '₹24/day',
  },
  {
    planId: 'job_promote_30d',
    durationDays: 30,
    priceRupees: 599,
    title: '30 Days Max Visibility',
    badge: 'Long-term',
    perDay: '₹19/day',
  },
];

export const PromoteJobModal: React.FC<PromoteJobModalProps> = ({
  job,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState<string>('job_promote_7d');
  const [step, setStep] = useState<'SELECT' | 'CHECKOUT' | 'SUCCESS'>('SELECT');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  if (!isOpen || !job) return null;

  const selectedTier = PROMOTION_TIERS.find((t) => t.planId === selectedPlanId) || PROMOTION_TIERS[0];

  const handlePromoteCheckout = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      // 1. Load Razorpay Checkout Script
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        setErrorMessage('Razorpay payment gateway failed to load. Check internet connection.');
        setLoading(false);
        return;
      }

      // 2. Create Order Backend Call
      const orderData = await createJobPromotionOrderApi(job._id, selectedPlanId);

      // 3. Open Razorpay Modal
      const options = {
        key: orderData.keyId,
        amount: orderData.amountPaise,
        currency: orderData.currency || 'INR',
        name: 'AgriConnect Platform',
        description: `Promote Job: ${job.title}`,
        order_id: orderData.orderId,
        handler: async (response: any) => {
          try {
            // 4. Cryptographic Signature Verification Call
            const verifyRes = await verifyJobPromotionPaymentApi({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyRes.verified) {
              setStep('SUCCESS');
              if (onSuccess) onSuccess();
            }
          } catch (err: any) {
            setErrorMessage(err.response?.data?.message || 'Payment verification failed.');
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
        theme: {
          color: '#059669',
        },
      };

      const razorpayInstance = new (window as any).Razorpay(options);
      razorpayInstance.open();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to initialize promotion order.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 overflow-hidden space-y-6">
        {/* Modal Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {step === 'SELECT' && (
          <div className="space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                Featured Job Promotion
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Promote Job Vacancy</h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                Target Job: <span className="font-bold text-slate-800">{job.title}</span>
              </p>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-medium">
                {errorMessage}
              </div>
            )}

            {/* Plan Tier Options */}
            <div className="space-y-3">
              {PROMOTION_TIERS.map((tier) => {
                const isSelected = selectedPlanId === tier.planId;
                return (
                  <div
                    key={tier.planId}
                    onClick={() => setSelectedPlanId(tier.planId)}
                    className={`cursor-pointer p-4 rounded-2xl border transition flex items-center justify-between ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">{tier.title}</span>
                        <span className="text-[10px] bg-slate-900 text-white font-bold px-2 py-0.5 rounded-full">
                          {tier.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">{tier.perDay} • Priority feed placement</p>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-black text-emerald-700">₹{tier.priceRupees}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Included Benefits */}
            <div className="bg-slate-50 p-4 rounded-2xl text-xs space-y-2 text-slate-700">
              <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                <Crown className="w-4 h-4 text-amber-500" />
                Featured Promotion Advantages
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Pinned at top of worker job feeds and map discovery</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Highlighted with Gold Featured Pro badge</span>
              </div>
            </div>

            {/* Action Trigger */}
            <button
              onClick={handlePromoteCheckout}
              disabled={loading}
              className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Preparing Payment Gateway...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-400" />
                  Promote Now for ₹{selectedTier.priceRupees}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </div>
        )}

        {step === 'SUCCESS' && (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900">Promotion Activated!</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Your job vacancy <span className="font-bold text-slate-800">"{job.title}"</span> is now featured at the top of worker feeds for {selectedTier.durationDays} days.
            </p>
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-900 text-white font-semibold text-xs rounded-xl shadow transition"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PromoteJobModal;
