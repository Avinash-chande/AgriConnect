import api from './api';
import type {
  CreateOrderPayload,
  CreateOrderResponseData,
  VerifyPaymentPayload,
  VerifyPaymentResponseData,
} from '../types/payment';

/**
 * Request backend to create a Razorpay payment order (server-calculated price)
 */
export const createPaymentOrderApi = async (
  payload: CreateOrderPayload
): Promise<CreateOrderResponseData> => {
  const response = await api.post<{ success: boolean; data: CreateOrderResponseData }>(
    '/payments/orders',
    payload
  );
  return response.data.data;
};

/**
 * Send payment identifiers to backend for HMAC signature verification and premium activation
 */
export const verifyPaymentApi = async (
  payload: VerifyPaymentPayload
): Promise<VerifyPaymentResponseData> => {
  const response = await api.post<{ success: boolean; data: VerifyPaymentResponseData }>(
    '/payments/verify',
    payload
  );
  return response.data.data;
};

/**
 * Get current user subscription status
 */
export const getSubscriptionStatusApi = async (): Promise<{
  isPremium: boolean;
  subscriptionPlan: string;
  subscriptionExpiresAt: string;
  subscriptionStatus: string;
}> => {
  const response = await api.get<{
    success: boolean;
    data: {
      isPremium: boolean;
      subscriptionPlan: string;
      subscriptionExpiresAt: string;
      subscriptionStatus: string;
    };
  }>('/payments/subscription');
  return response.data.data;
};

/**
 * Get user payment history with search, status, date range filters & pagination
 */
export const getPaymentHistoryApi = async (params: Record<string, any> = {}) => {
  const response = await api.get('/payments/history', {
    params,
  });
  return response.data.data;
};

/**
 * Get invoice details by transactionId
 */
export const getInvoiceApi = async (transactionId: string) => {
  const response = await api.get(`/payments/invoice/${transactionId}`);
  return response.data.data.invoice;
};

/**
 * Get full transaction details by transactionId
 */
export const getTransactionDetailsApi = async (transactionId: string) => {
  const response = await api.get(`/payments/details/${transactionId}`);
  return response.data.data;
};

/**
 * Get full subscription details including plan info and stats
 */
export const getSubscriptionDetailsFullApi = async () => {
  const response = await api.get('/payments/subscription/me');
  return response.data.data;
};

/**
 * Cancel active subscription
 */
export const cancelSubscriptionApi = async () => {
  const response = await api.post('/payments/subscription/cancel');
  return response.data.data;
};

/**
 * Toggle auto-renewal setting
 */
export const toggleAutoRenewApi = async (autoRenew: boolean) => {
  const response = await api.post('/payments/subscription/auto-renew', { autoRenew });
  return response.data.data;
};

/**
 * Create order to promote a job vacancy
 */
export const createJobPromotionOrderApi = async (jobId: string, planId: string) => {
  const response = await api.post('/payments/promote-job/order', { jobId, planId });
  return response.data.data;
};

/**
 * Verify cryptographic payment signature & activate job promotion
 */
export const verifyJobPromotionPaymentApi = async (payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) => {
  const response = await api.post('/payments/promote-job/verify', payload);
  return response.data.data;
};

/**
 * Fetch Admin Financial & Payment Analytics Metrics
 */
export const getAdminPaymentAnalyticsApi = async (params: { startDate?: string; endDate?: string } = {}) => {
  const response = await api.get('/payments/analytics/admin', { params });
  return response.data.data;
};
