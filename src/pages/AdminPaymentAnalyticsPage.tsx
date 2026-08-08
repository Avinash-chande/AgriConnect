import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  IndianRupee,
  TrendingUp,
  CreditCard,
  Users,
  ShieldCheck,
  Calendar,
  Sparkles,
  RefreshCcw,
  BarChart3,
  PieChart,
  ArrowUpRight,
} from 'lucide-react';
import { getAdminPaymentAnalyticsApi } from '../services/paymentService';

export const AdminPaymentAnalyticsPage: React.FC = () => {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-payment-analytics', startDate, endDate],
    queryFn: () => getAdminPaymentAnalyticsApi({ startDate, endDate }),
  });

  const summary = data?.summary;
  const charts = data?.charts;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                Financial & Payment Analytics
              </h1>
            </div>
            <p className="text-xs md:text-sm text-slate-400 mt-1">
              Real-time platform revenue metrics, subscription conversion, and financial breakdowns.
            </p>
          </div>

          {/* Date Range Picker Controls */}
          <div className="flex items-center gap-3 bg-slate-800/80 p-2 rounded-2xl border border-slate-700/60">
            <div className="flex items-center gap-2 text-xs text-slate-300 px-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Filter Range:</span>
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500"
            />
            <span className="text-slate-500 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={() => refetch()}
              className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition"
              title="Refresh Data"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-20 text-center space-y-3">
            <RefreshCcw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
            <p className="text-sm text-slate-400">Aggregating real-time financial metrics...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl text-sm">
            Failed to load payment analytics. Ensure you possess Administrator privileges.
          </div>
        )}

        {/* Summary Metric Cards */}
        {summary && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Card 1: Total Revenue */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-3xl p-5 space-y-3">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <span>Total Revenue</span>
                  <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                    <IndianRupee className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-white">
                  ₹{summary.totalRevenue.toLocaleString('en-IN')}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Monthly: ₹{summary.monthlyRevenue.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Card 2: Successful Payments */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-3xl p-5 space-y-3">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <span>Successful Payments</span>
                  <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
                    <CreditCard className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-white">
                  {summary.successfulPaymentsCount}
                </div>
                <div className="text-[11px] text-slate-400 font-medium">
                  ATV: <span className="text-slate-200 font-bold">₹{summary.averageTransactionValue}</span>
                </div>
              </div>

              {/* Card 3: Active Premium Users */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-3xl p-5 space-y-3">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <span>Active Premium Pro</span>
                  <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-white">
                  {summary.activePremiumUsersCount}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Conversion Rate: {summary.premiumConversionRate}%</span>
                </div>
              </div>

              {/* Card 4: Featured Job Revenue */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-3xl p-5 space-y-3">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <span>Featured Job Sales</span>
                  <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-white">
                  ₹{summary.featuredJobRevenue.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-slate-400 font-medium">
                  Refunded: <span className="text-rose-400 font-bold">₹{summary.processedRefundAmount}</span> ({summary.totalRefundsCount} requests)
                </div>
              </div>
            </div>

            {/* Charts & Detailed Breakdowns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Revenue Over Time Table */}
              <div className="lg:col-span-2 bg-slate-800/60 border border-slate-700/60 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
                  <h3 className="font-extrabold text-slate-200 text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    Daily Revenue Time Series
                  </h3>
                  <span className="text-[11px] text-slate-400">Captured Orders Only</span>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {charts?.revenueOverTime.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6 text-center">No payment transactions recorded in selected range.</p>
                  ) : (
                    charts?.revenueOverTime.map((item: any) => (
                      <div
                        key={item._id}
                        className="flex items-center justify-between p-3 bg-slate-900/60 border border-slate-800 rounded-2xl text-xs"
                      >
                        <div className="font-medium text-slate-300">{item._id}</div>
                        <div className="flex items-center gap-4">
                          <span className="text-slate-400">{item.transactions} transactions</span>
                          <span className="font-black text-emerald-400">₹{item.revenue.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Plan Distribution Breakdown */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
                  <h3 className="font-extrabold text-slate-200 text-sm flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-indigo-400" />
                    Plan Distribution
                  </h3>
                </div>

                <div className="space-y-3">
                  {charts?.planDistribution.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6 text-center">No active plan distributions available.</p>
                  ) : (
                    charts?.planDistribution.map((plan: any) => (
                      <div
                        key={plan._id}
                        className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between font-bold text-slate-200">
                          <span className="capitalize">{plan._id.replace('_', ' ')}</span>
                          <span className="text-emerald-400 font-black">₹{plan.totalRevenue.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Subscribers: {plan.count}</span>
                          <span>{Math.round((plan.totalRevenue / (summary.totalRevenue || 1)) * 100)}% of sales</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminPaymentAnalyticsPage;
