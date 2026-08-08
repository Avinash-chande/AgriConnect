import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Filter,
  Calendar,
  CreditCard,
  FileText,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { getPaymentHistoryApi, getInvoiceApi } from '../services/paymentService';
import { InvoiceModal } from '../components/payment/InvoiceModal';

export const PaymentHistoryPage: React.FC = () => {
  const [page, setPage] = useState<number>(1);
  const [search, setSearch] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [type, setType] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState<boolean>(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['payment-history', page, search, status, type, startDate, endDate, sortOrder],
    queryFn: () =>
      getPaymentHistoryApi({
        page,
        limit: 10,
        search,
        status,
        type,
        startDate,
        endDate,
        sortBy: 'createdAt',
        sortOrder,
      }),
  });

  const transactions = data?.transactions || [];
  const pagination = data?.pagination || { page: 1, limit: 10, total: 0, pages: 1 };

  const handleOpenInvoice = async (transactionId: string) => {
    try {
      const inv = await getInvoiceApi(transactionId);
      setSelectedInvoice(inv);
      setIsInvoiceOpen(true);
    } catch {
      alert('Invoice is not available for this transaction.');
    }
  };

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setType('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              Secure Payment Ledger
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Transaction History</h1>
            <p className="text-sm text-slate-500 mt-1">
              View past payments, download official tax receipts, and track refund statuses.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            Refresh History
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm mb-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Search by Txn ID / Order ID..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
              >
                <option value="">All Statuses</option>
                <option value="success">Success</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>

            {/* Date Range Start */}
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Date Range End */}
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {(search || status || type || startDate || endDate) && (
            <div className="flex justify-end">
              <button
                onClick={clearFilters}
                className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold underline"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-8">
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-rose-600 text-sm">
              Failed to load transaction history. Please try again.
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-3">
              <CreditCard className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No Transactions Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No payment transactions match your selected search or filter criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-4 px-6">Transaction ID</th>
                    <th className="py-4 px-6">Date & Time</th>
                    <th className="py-4 px-6">Purpose / Method</th>
                    <th className="py-4 px-6">Amount</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {transactions.map((tx: any) => {
                    const payment = tx.payment || {};
                    const isSuccess = tx.status === 'success';
                    const isFailed = tx.status === 'failed';
                    const isRefunded = tx.status === 'refunded';

                    return (
                      <tr key={tx._id} className="hover:bg-slate-50/80 transition">
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900">{tx.transactionId}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Order: {tx.razorpayOrderId || payment.orderId || 'N/A'}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-slate-600">
                          {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                          <span className="block text-[10px] text-slate-400">
                            {new Date(tx.createdAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="capitalize font-medium text-slate-800">
                            {payment.purpose || 'subscription'}
                          </span>
                          <span className="block text-[10px] text-slate-400 uppercase font-semibold">
                            {payment.paymentMethod || 'Razorpay Gateway'}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-extrabold text-slate-900 text-sm">
                          ₹{tx.amount?.toLocaleString('en-IN')}
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              isSuccess
                                ? 'bg-emerald-100 text-emerald-800'
                                : isFailed
                                ? 'bg-rose-100 text-rose-800'
                                : isRefunded
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isSuccess && <CheckCircle2 className="w-3 h-3" />}
                            {isFailed && <XCircle className="w-3 h-3" />}
                            {isRefunded && <Clock className="w-3 h-3" />}
                            <span className="capitalize">{tx.status}</span>
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          {isSuccess && (
                            <button
                              onClick={() => handleOpenInvoice(tx._id)}
                              className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 font-semibold bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Tax Invoice
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination Bar */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-slate-200">
            <span className="text-xs text-slate-500">
              Showing page <span className="font-bold text-slate-800">{pagination.page}</span> of{' '}
              <span className="font-bold text-slate-800">{pagination.pages}</span> ({pagination.total} records)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="p-2 rounded-xl border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={pagination.page >= pagination.pages}
                className="p-2 rounded-xl border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tax Receipt Modal */}
      <InvoiceModal
        invoice={selectedInvoice}
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
      />
    </div>
  );
};

export default PaymentHistoryPage;
