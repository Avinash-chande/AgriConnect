import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatusBadge } from '../../components/admin/shared/StatusBadge';
import { AdminModal } from '../../components/admin/shared/AdminModal';
import {
  getAdminPaymentsApi,
  getAdminPaymentOverviewApi,
  processAdminRefundApi,
} from '../../services/adminService';
import {
  CreditCard,
  RotateCcw,
  IndianRupee,
  Search,
  CheckCircle,
  AlertTriangle,
  Lock,
  Star,
  RefreshCw,
} from 'lucide-react';

export const AdminPaymentManagementPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [refundReason, setRefundReason] = useState('');

  // Overview Stats
  const { data: overviewData } = useQuery({
    queryKey: ['adminPaymentOverview'],
    queryFn: () => getAdminPaymentOverviewApi(),
  });

  // Payments List
  const { data, isLoading } = useQuery({
    queryKey: ['adminPayments', search, statusFilter, page],
    queryFn: () =>
      getAdminPaymentsApi({
        search,
        status: statusFilter,
        page,
        limit: 15,
      }),
  });

  const refundMutation = useMutation({
    mutationFn: (id: string) => processAdminRefundApi(id, refundReason),
    onSuccess: () => {
      setSelectedPayment(null);
      setRefundReason('');
      queryClient.invalidateQueries({ queryKey: ['adminPayments'] });
      queryClient.invalidateQueries({ queryKey: ['adminPaymentOverview'] });
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <CreditCard size={24} />
            </div>
            <div>
              <h1 className="text-lg font-heading font-bold text-white">
                Financial Administration & Payments
              </h1>
              <p className="text-xs text-slate-400">
                Inspect Razorpay transactions, audit refunds, review failed payments, and monitor gross platform revenue.
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-2 text-[11px] font-mono text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
            <Lock size={12} />
            <span>PAYMENT SECRETS & CVV MASKED</span>
          </div>
        </div>

        {/* Financial KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase">Gross Revenue Captured</span>
            <p className="text-xl font-bold text-emerald-400">
              ₹{(overviewData?.totalRevenue || 0).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase">Processed Refunds</span>
            <p className="text-xl font-bold text-amber-400">
              {overviewData?.refundsCount || 0}
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase">Failed Payment Alerts</span>
            <p className="text-xl font-bold text-rose-400">
              {overviewData?.failedPaymentsCount || 0}
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase">Featured Job Boosts</span>
            <p className="text-xl font-bold text-blue-400">
              {overviewData?.featuredJobsCount || 0}
            </p>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            {/* Search Input */}
            <div className="relative col-span-1 md:col-span-2">
              <Search size={16} className="absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search Order ID or Payment ID..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-200 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-amber-500/50"
            >
              <option value="">All Transaction Statuses</option>
              <option value="captured">Captured (Successful)</option>
              <option value="refunded">Refunded</option>
              <option value="failed">Failed</option>
              <option value="created">Created (Pending)</option>
            </select>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono border-b border-slate-800">
                <tr>
                  <th className="p-4">User</th>
                  <th className="p-4">Order ID</th>
                  <th className="p-4">Payment ID</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Purpose</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">Loading payment transactions...</td>
                  </tr>
                ) : data?.payments?.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">No payment transactions found.</td>
                  </tr>
                ) : (
                  data?.payments?.map((p: any) => (
                    <tr key={p._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-semibold text-white font-sans">{p.user?.name || 'User'}</td>
                      <td className="p-4 text-slate-400">{p.orderId}</td>
                      <td className="p-4 text-slate-500">{p.paymentId || '—'}</td>
                      <td className="p-4 font-bold text-emerald-400">
                        ₹{p.amount?.toLocaleString('en-IN')}
                      </td>
                      <td className="p-4 uppercase text-[10px] text-slate-300">{p.purpose}</td>
                      <td className="p-4">
                        <StatusBadge status={p.status} type={p.status === 'captured' ? 'success' : p.status === 'failed' ? 'danger' : 'warning'} />
                      </td>
                      <td className="p-4 text-slate-400">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="p-4 text-right">
                        {p.status === 'captured' && (
                          <button
                            onClick={() => setSelectedPayment(p)}
                            className="px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 inline-flex items-center space-x-1 text-[11px]"
                          >
                            <RotateCcw size={12} />
                            <span>Audit & Refund</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data?.pagination && (
            <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Showing Page {data.pagination.page} of {data.pagination.pages} ({data.pagination.total} Payments)</span>
              <div className="flex space-x-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1 bg-slate-900 rounded-lg border border-slate-800 disabled:opacity-40 hover:bg-slate-800"
                >
                  Previous
                </button>
                <button
                  disabled={page >= data.pagination.pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 bg-slate-900 rounded-lg border border-slate-800 disabled:opacity-40 hover:bg-slate-800"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Refund Modal */}
        {selectedPayment && (
          <AdminModal
            isOpen={!!selectedPayment}
            onClose={() => setSelectedPayment(null)}
            title={`Audit & Refund Transaction: ${selectedPayment.orderId}`}
          >
            <div className="space-y-4 text-xs font-mono">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <p className="text-slate-300">
                  User: <strong className="text-white">{selectedPayment.user?.name}</strong> ({selectedPayment.user?.email})
                </p>
                <p className="text-slate-300">
                  Amount to refund: <strong className="text-emerald-400 font-mono">₹{selectedPayment.amount}</strong>
                </p>
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">
                    Refund Reason (Audited in System Logs):
                  </label>
                  <textarea
                    placeholder="Enter reason for processing refund..."
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-amber-500/50"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedPayment(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => refundMutation.mutate(selectedPayment._id)}
                  className="px-4 py-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl hover:bg-amber-500/30 flex items-center space-x-1.5"
                >
                  <RotateCcw size={14} />
                  <span>Confirm Audit Refund</span>
                </button>
              </div>
            </div>
          </AdminModal>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPaymentManagementPage;
