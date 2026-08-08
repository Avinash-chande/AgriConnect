export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  image?: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

export interface CreateOrderPayload {
  planId: string;
  purpose?: string;
  idempotencyKey?: string;
  notes?: Record<string, string>;
}

export interface CreateOrderResponseData {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  paymentId: string;
  plan: {
    planId: string;
    name: string;
    price: number;
    billingPeriod: string;
  };
}

export interface VerifyPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface VerifyPaymentResponseData {
  subscription: {
    user: string;
    plan: string;
    status: string;
    startDate: string;
    endDate: string;
  };
  transaction: {
    transactionId: string;
    amount: number;
    status: string;
  };
  user: {
    _id: string;
    isPremium: boolean;
    subscriptionPlan: string;
    subscriptionExpiresAt: string;
  };
}

export type PaymentStatusState =
  | 'idle'
  | 'creating_order'
  | 'checkout_open'
  | 'verifying'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'network_error';
