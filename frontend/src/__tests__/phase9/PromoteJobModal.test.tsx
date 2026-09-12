import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PromoteJobModal } from '../../components/job/PromoteJobModal';
import * as paymentService from '../../services/paymentService';
import * as razorpayUtils from '../../utils/razorpay';

vi.mock('../../services/paymentService', () => ({
  createJobPromotionOrderApi: vi.fn(),
  verifyJobPromotionPaymentApi: vi.fn(),
}));

vi.mock('../../utils/razorpay', () => ({
  loadRazorpayCheckoutScript: vi.fn(),
}));

describe('PromoteJobModal Component Test Suite', () => {
  const mockJob = {
    _id: 'job_12345',
    title: 'Wheat Harvesting Expert Required',
    dailyWage: 800,
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    job: mockJob,
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders promotion tiers (7 Days, 14 Days, 30 Days) with pricing', () => {
    render(<PromoteJobModal {...defaultProps} />);

    expect(screen.getByText('Promote Job Vacancy')).toBeDefined();
    expect(screen.getByText(/Wheat Harvesting Expert Required/i)).toBeDefined();
    expect(screen.getByText(/7 Days/i)).toBeDefined();
    expect(screen.getByText(/14 Days/i)).toBeDefined();
    expect(screen.getByText(/30 Days/i)).toBeDefined();
    expect(screen.getAllByText(/199/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/349/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/599/).length).toBeGreaterThan(0);
  });

  it('allows user to select duration tier and initiates order creation', async () => {
    (razorpayUtils.loadRazorpayCheckoutScript as any).mockResolvedValue(true);
    (paymentService.createJobPromotionOrderApi as any).mockResolvedValue({
      orderId: 'order_promo_777',
      amount: 349,
      currency: 'INR',
      keyId: 'rzp_test_mockkey',
    });

    (window as any).Razorpay = vi.fn().mockImplementation(() => ({
      open: vi.fn(),
    }));

    render(<PromoteJobModal {...defaultProps} />);

    const submitBtn = screen.getByRole('button', { name: /Promote Now for/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(paymentService.createJobPromotionOrderApi).toHaveBeenCalledWith('job_12345', 'job_promote_7d');
    });
  });

  it('handles script load failure gracefully', async () => {
    (razorpayUtils.loadRazorpayCheckoutScript as any).mockResolvedValueOnce(false);

    render(<PromoteJobModal {...defaultProps} />);

    const submitBtn = screen.getByRole('button', { name: /Promote Now for/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Razorpay payment gateway failed to load/i)).toBeDefined();
    });
  });
});
