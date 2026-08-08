import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RazorpayCheckoutModal } from '../components/payment/RazorpayCheckoutModal';
import * as paymentService from '../services/paymentService';
import type { MembershipPlan } from '../types/plan';

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      _id: 'user_123',
      fullName: 'Test Farmer',
      email: 'farmer@agriconnect.com',
      phone: '+919876543210',
      role: 'farmer',
      isPremium: false,
    },
    checkSession: vi.fn(),
  }),
}));

const mockPlan: MembershipPlan = {
  planId: 'farmer_pro_monthly',
  name: 'Farmer Pro (Monthly)',
  description: 'Full power hiring suite',
  price: 499,
  currency: 'INR',
  billingPeriod: 'monthly',
  targetRole: 'farmer',
  features: ['Featured Job Posting', 'AI Recommendations'],
  isActive: true,
  sortOrder: 1,
};

describe('RazorpayCheckoutModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render modal with plan details when open', () => {
    render(
      <RazorpayCheckoutModal
        plan={mockPlan}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Secure Payment Checkout')).toBeDefined();
    expect(screen.getByText('Farmer Pro (Monthly)')).toBeDefined();
    expect(screen.getByText('₹499')).toBeDefined();
  });

  it('should initiate backend order creation when opened', async () => {
    const createOrderSpy = vi.spyOn(paymentService, 'createPaymentOrderApi').mockResolvedValue({
      orderId: 'order_mock_123',
      amount: 49900,
      currency: 'INR',
      keyId: 'rzp_test_key',
      paymentId: 'pay_local_123',
      plan: {
        planId: 'farmer_pro_monthly',
        name: 'Farmer Pro (Monthly)',
        price: 499,
        billingPeriod: 'monthly',
      },
    });

    render(
      <RazorpayCheckoutModal
        plan={mockPlan}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(createOrderSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          planId: 'farmer_pro_monthly',
        })
      );
    });
  });

  it('should display error message on backend order creation failure', async () => {
    vi.spyOn(paymentService, 'createPaymentOrderApi').mockRejectedValue(
      new Error('Gateway unavailable. Please try again.')
    );

    render(
      <RazorpayCheckoutModal
        plan={mockPlan}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Payment Failed')).toBeDefined();
      expect(screen.getByText('Gateway unavailable. Please try again.')).toBeDefined();
    });
  });
});
