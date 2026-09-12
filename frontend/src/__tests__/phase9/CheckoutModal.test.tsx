import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RazorpayCheckoutModal } from '../../components/payment/RazorpayCheckoutModal';
import * as paymentService from '../../services/paymentService';
import * as razorpayUtils from '../../utils/razorpay';

vi.mock('../../services/paymentService', () => ({
  createPaymentOrderApi: vi.fn(),
  verifyPaymentApi: vi.fn(),
}));

vi.mock('../../utils/razorpay', () => ({
  loadRazorpayScript: vi.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { _id: 'user_123', fullName: 'John Farmer', email: 'john@agriconnect.com' },
    checkSession: vi.fn(),
  }),
}));

describe('RazorpayCheckoutModal Component Test Suite', () => {
  const mockPlan = {
    planId: 'farmer_pro_monthly',
    name: 'Farmer Pro Monthly',
    description: 'Full power hiring suite',
    price: 499,
    currency: 'INR',
    billingPeriod: 'monthly' as const,
    targetRole: 'farmer' as const,
    features: ['Unlimited AI Queries', 'Priority Worker Access'],
    isActive: true,
    sortOrder: 1,
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    plan: mockPlan,
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with plan details when open', () => {
    render(<RazorpayCheckoutModal {...defaultProps} />);

    expect(screen.getByText('Secure Payment Checkout')).toBeDefined();
    expect(screen.getByText('Farmer Pro Monthly')).toBeDefined();
    expect(screen.getByText('₹499')).toBeDefined();
  });

  it('initiates backend order creation when opened', async () => {
    (razorpayUtils.loadRazorpayScript as any).mockResolvedValue(true);
    (paymentService.createPaymentOrderApi as any).mockResolvedValue({
      orderId: 'order_sub_888',
      amount: 499,
      currency: 'INR',
      keyId: 'rzp_test_mockkey',
      paymentId: 'pay_123',
    });

    (window as any).Razorpay = vi.fn().mockImplementation(() => ({
      open: vi.fn(),
    }));

    render(<RazorpayCheckoutModal {...defaultProps} />);

    await waitFor(() => {
      expect(paymentService.createPaymentOrderApi).toHaveBeenCalledWith(
        expect.objectContaining({ planId: 'farmer_pro_monthly' })
      );
    });
  });
});
