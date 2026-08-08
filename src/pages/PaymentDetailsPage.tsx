import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheck,
  ArrowLeft,
  FileText,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Printer,
  ChevronRight,
} from 'lucide-react';
import { getTransactionDetailsApi } from '../services/paymentService';
import { InvoiceModal } from '../components/payment/InvoiceModal';
import { RazorpayCheckoutModal } from '../components/payment/RazorpayCheckoutModal';
import type { MembershipPlan } from '../types/plan';

export const PaymentDetailsPage: React.FC = () => {
  const { transactionId } = useParams<{ transactionId: string }>();
  const navigate = useNavigate();

  const [isInvoiceOpen, setIsInvoiceOpen] = useState<boolean>(false);
  const [isRetryModalOpen, setIsRetryModalOpen] = useState<boolean>(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['transaction-details', transactionId],
    queryFn: () => getTransactionDetailsApi(transactionId || ''),
    enabled: !!transactionId,
  });

  const transaction = data?.transaction || null;
  const invoice = data?.invoice || null;
  const refund = data?.refund || null;
  const payment = transaction?.payment || {};

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="text-sm font-semibold text-slate-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-16 px-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Transaction Not Found</h2>
          <p className="text-xs text-slate-500">
            {(error as any)?.message || 'The requested transaction details could not be loaded or access is restricted.'}
          </p>
          <button
            onClick={() => navigate('/payment-history')}
            className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs rounded-xl shadow transition"
          >
            Back to Transaction History
          </button>
        </div>
      </div>
    );
  }

  const isSuccess = transaction.status === 'success';
  const isFailed = transaction.status === 'failed';
  const isRefunded = transaction.status === 'refunded';

  const planId = payment.metadata?.planId || 'farmer_pro_monthly';
  const retryPlan: MembershipPlan = {
    planId,
    name: payment.metadata?.planName || 'Membership Plan',
    description: 'Retry subscription payment',
    price: transaction.amount || 0,
    currency: transaction.currency || 'INR',
    billingPeriod: 'monthly',
    targetRole: 'all',
    features: ['Priority Job Visibility', 'AI Recommendations'],
    isActive: true,
    sortOrder: 1,
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link to="/payment-history" className="hover:text-emerald-700 flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Transaction History
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-slate-900">{transaction.transactionId}</span>
        </div>

        {/* Main Status Header Card */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                    isSuccess
                      ? 'bg-emerald-100 text-emerald-800'
                      : isFailed
                      ? 'bg-rose-100 text-rose-800'
                      : isRefunded
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  {isFailed && <XCircle className="w-4 h-4 text-rose-600" />}
                  {isRefunded && <Clock className="w-4 h-4 text-purple-600" />}
                  <span className="capitalize">{transaction.status}</span>
                </span>
                <span className="text-xs text-slate-400 font-mono">ID: {transaction.transactionId}</span>
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                ₹{transaction.amount?.toLocaleString('en-IN')}{' '}
                <span className="text-sm font-semibold text-slate-500">{transaction.currency}</span>
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Processed on{' '}
                {new Date(transaction.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {isSuccess && invoice && (
                <button
                  onClick={() => setIsInvoiceOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs rounded-xl shadow transition"
                >
                  <FileText className="w-4 h-4" />
                  View & Print Tax Invoice
                </button>
              )}

              {(isFailed || transaction.status === 'pending') && (
                <button
                  onClick={() => setIsRetryModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs rounded-xl shadow transition"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry Failed Payment
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Transaction Summary Grid */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4">
            Payment Specifications
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div>
              <p className="text-slate-400 uppercase font-semibold text-[10px] mb-1">Razorpay Order ID</p>
              <p className="font-mono font-bold text-slate-800 text-sm">
                {transaction.razorpayOrderId || payment.orderId || 'N/A'}
              </p>
            </div>

            <div>
              <p className="text-slate-400 uppercase font-semibold text-[10px] mb-1">Razorpay Payment ID</p>
              <p className="font-mono font-bold text-slate-800 text-sm">
                {transaction.razorpayPaymentId || payment.paymentId || 'N/A'}
              </p>
            </div>

            <div>
              <p className="text-slate-400 uppercase font-semibold text-[10px] mb-1">Purpose / Plan</p>
              <p className="font-semibold text-slate-800 text-sm capitalize">
                {payment.metadata?.planName || payment.purpose || 'Pro Subscription'}
              </p>
            </div>

            <div>
              <p className="text-slate-400 uppercase font-semibold text-[10px] mb-1">Payment Gateway Method</p>
              <p className="font-semibold text-slate-800 text-sm uppercase">
                {payment.paymentMethod || 'Razorpay Encrypted Channel'}
              </p>
            </div>
          </div>
        </div>

        {/* Refund Status Details (If Refunded) */}
        {isRefunded && (
          <div className="bg-purple-50 rounded-3xl p-6 border border-purple-200 space-y-3">
            <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
              <Clock className="w-5 h-5 text-purple-700" />
              Refund Processed Summary
            </div>
            <p className="text-xs text-purple-800">
              A full refund of ₹{transaction.amount} has been processed back to your original payment method.
            </p>
            {refund && (
              <div className="text-xs text-purple-700 font-mono pt-2 border-t border-purple-200">
                Refund ID: {refund.refundId} | Provider Ref: {refund.providerRefundId || 'N/A'}
              </div>
            )}
          </div>
        )}

        {/* PCI Security Guarantee Card */}
        <div className="bg-slate-900 text-slate-300 rounded-3xl p-6 shadow-md flex items-start gap-4">
          <Lock className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-white text-sm">Strict PCI-DSS Compliance & Secrecy Guarantee</p>
            <p className="text-slate-400">
              AgriConnect enforces PCI-DSS standards. Raw card numbers, CVVs, PINs, and gateway secrets are strictly forbidden from being stored in our database or exposed in responses.
            </p>
          </div>
        </div>
      </div>

      {/* Tax Receipt Printable Modal */}
      <InvoiceModal
        invoice={invoice}
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
      />

      {/* Razorpay Retry Payment Modal */}
      <RazorpayCheckoutModal
        plan={retryPlan}
        isOpen={isRetryModalOpen}
        onClose={() => setIsRetryModalOpen(false)}
        onSuccess={() => {
          refetch();
          setIsRetryModalOpen(false);
        }}
      />
    </div>
  );
};

export default PaymentDetailsPage;
