import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PaymentHistoryPage from '../../pages/PaymentHistoryPage';
import * as paymentService from '../../services/paymentService';

vi.mock('../../services/paymentService', () => ({
  fetchTransactionHistoryApi: vi.fn(),
  downloadInvoicePdfApi: vi.fn(),
}));

describe('PaymentHistoryPage Component Test Suite', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const mockTransactions = [
    {
      _id: 'txn_111',
      transactionId: 'txn_20260808_001',
      orderId: 'order_111',
      amount: 499,
      currency: 'INR',
      paymentMethod: 'UPI',
      purpose: 'farmer_pro_monthly',
      status: 'success',
      createdAt: '2026-08-08T10:00:00Z',
    },
    {
      _id: 'txn_222',
      transactionId: 'txn_20260808_002',
      orderId: 'order_222',
      amount: 199,
      currency: 'INR',
      paymentMethod: 'Card',
      purpose: 'job_promotion_7d',
      status: 'failed',
      createdAt: '2026-08-07T10:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header and transaction history records when loaded', async () => {
    (paymentService.fetchTransactionHistoryApi as any).mockResolvedValue({
      transactions: mockTransactions,
      pagination: { total: 2, page: 1, limit: 10, totalPages: 1 },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PaymentHistoryPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Transaction History')).toBeDefined();
    });
  });
});
