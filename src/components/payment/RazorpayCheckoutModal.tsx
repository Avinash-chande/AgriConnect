import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  X,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { loadRazorpayScript } from '../../utils/razorpay';
import { createPaymentOrderApi, verifyPaymentApi } from '../../services/paymentService';
import { useAuth } from '../../context/AuthContext';
import type { MembershipPlan } from '../../types/plan';
import type { PaymentStatusState, RazorpayResponse } from '../../types/payment';

interface RazorpayCheckoutModalProps {
  plan: MembershipPlan | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const RazorpayCheckoutModal: React.FC<RazorpayCheckoutModalProps> = ({
  plan,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user, checkSession } = useAuth();
  const [status, setStatus] = useState<PaymentStatusState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [orderDetails, setOrderDetails] = useState<{
    orderId: string;
    amount: number;
    currency: string;
    paymentId: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen && plan) {
      initiateCheckout();
    } else {
      resetState();
    }
  }, [isOpen, plan]);

  const resetState = () => {
    setStatus('idle');
    setErrorMessage('');
    setOrderDetails(null);
  };

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // Ignore if confetti fails
    }
  };

  const initiateCheckout = async () => {
    if (!plan || plan.price === 0) return;

    setStatus('creating_order');
    setErrorMessage('');

    try {
      // 1. Request backend to create Razorpay order with server-calculated price
      const order = await createPaymentOrderApi({
        planId: plan.planId,
        idempotencyKey: `checkout_${user?._id}_${plan.planId}_${Date.now()}`,
      });

      setOrderDetails({
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        paymentId: order.paymentId,
      });

      // 2. Load Razorpay SDK Script
      const scriptLoaded = await loadRazorpayScript();

      // If Razorpay SDK loaded and window.Razorpay is available
      if (scriptLoaded && window.Razorpay) {
        setStatus('checkout_open');

        const options = {
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: 'AgriConnect Platform',
          description: `Subscription for ${order.plan.name}`,
          order_id: order.orderId,
          prefill: {
            name: user?.fullName || '',
            email: user?.email || '',
            contact: user?.phone || '',
          },
          theme: {
            color: '#065F46', // Emerald theme
          },
          handler: async (response: RazorpayResponse) => {
            handleVerification(response);
          },
          modal: {
            ondismiss: () => {
              setStatus((prev) => (prev === 'verifying' || prev === 'success' ? prev : 'cancelled'));
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // Dev fallback for offline testing
        console.warn('Razorpay SDK not available. Executing simulated verification for testing.');
        handleVerification({
          razorpay_order_id: order.orderId,
          razorpay_payment_id: `pay_simulated_${Date.now()}`,
          razorpay_signature: 'valid_mock_signature',
        });
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      if (err.message && err.message.includes('Network')) {
        setStatus('network_error');
        setErrorMessage('Network connection lost while preparing order. Please check your internet connection.');
      } else {
        setStatus('failed');
        setErrorMessage(err.message || 'Failed to initialize payment gateway order.');
      }
    }
  };

  const handleVerification = async (paymentResponse: RazorpayResponse) => {
    setStatus('verifying');
    setErrorMessage('');

    try {
      // 3. CRITICAL SECURITY STEP: Submit payment IDs to backend for signature verification & activation
      await verifyPaymentApi({
        razorpay_order_id: paymentResponse.razorpay_order_id,
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_signature: paymentResponse.razorpay_signature,
      });

      // 4. Update user session globally from backend
      await checkSession();

      setStatus('success');
      triggerConfetti();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Verification error:', err);
      setStatus('failed');
      setErrorMessage(
        err.message || 'Payment signature verification failed. Membership could not be activated.'
      );
    }
  };

  if (!isOpen || !plan) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 transition-all">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={status === 'creating_order' || status === 'verifying'}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Secure Payment Checkout</h3>
          <p className="text-xs text-slate-500 mt-1">256-bit SSL Encrypted via Razorpay Server Integration</p>
        </div>

        {/* Selected Plan Summary */}
        <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-200">
          <div className="flex justify-between items-center text-sm font-semibold text-slate-800">
            <span>{plan.name}</span>
            <span className="text-emerald-700 font-extrabold text-base">
              ₹{plan.price.toLocaleString('en-IN')}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Billed {plan.billingPeriod === 'yearly' ? 'annually' : 'monthly'}
          </p>
        </div>

        {/* Dynamic Status Renderers */}

        {/* 1. Creating Order State */}
        {status === 'creating_order' && (
          <div className="py-8 text-center space-y-3">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mx-auto" />
            <p className="text-sm font-medium text-slate-700">Calculating plan & creating secure order...</p>
          </div>
        )}

        {/* 2. Checkout Open State */}
        {status === 'checkout_open' && (
          <div className="py-8 text-center space-y-3">
            <div className="relative inline-flex">
              <ShieldCheck className="w-12 h-12 text-emerald-600 animate-pulse" />
            </div>
            <p className="text-sm font-semibold text-slate-800">Payment Gateway Opened</p>
            <p className="text-xs text-slate-500">
              Please complete the payment in the Razorpay popup window.
            </p>
          </div>
        )}

        {/* 3. Verifying State */}
        {status === 'verifying' && (
          <div className="py-8 text-center space-y-3">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-800">Verifying HMAC Signature...</p>
            <p className="text-xs text-slate-500">Activating your Pro membership privileges safely on backend.</p>
          </div>
        )}

        {/* 4. Success State */}
        {status === 'success' && (
          <div className="py-6 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-900 flex items-center justify-center gap-1.5">
                <Sparkles className="w-5 h-5 text-amber-500 fill-current" />
                Payment Verified!
              </h4>
              <p className="text-xs text-slate-600 mt-1">
                Your account has been upgraded to <span className="font-bold text-emerald-700">{plan.name}</span>.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-sm rounded-xl shadow-md transition"
            >
              Done & Explore Pro Features
            </button>
          </div>
        )}

        {/* 5. Cancelled State */}
        {status === 'cancelled' && (
          <div className="py-6 text-center space-y-4">
            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">Payment Window Closed</h4>
              <p className="text-xs text-slate-500 mt-1">
                You closed the payment popup before completing transaction.
              </p>
            </div>
            <button
              onClick={initiateCheckout}
              className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Checkout Again
            </button>
          </div>
        )}

        {/* 6. Failure / Network Error State */}
        {(status === 'failed' || status === 'network_error') && (
          <div className="py-6 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">
                {status === 'network_error' ? 'Connection Timeout' : 'Payment Failed'}
              </h4>
              <p className="text-xs text-rose-600 mt-1">{errorMessage}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={initiateCheckout}
                className="w-1/2 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Payment
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
