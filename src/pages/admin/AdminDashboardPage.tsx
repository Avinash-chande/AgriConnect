import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatCard } from '../../components/admin/shared/StatCard';
import { getAdminDashboardApi } from '../../services/adminService';
import {
  Users,
  Briefcase,
  FileCheck,
  IndianRupee,
  ShieldAlert,
  Award,
  ShieldCheck,
  IdCard,
  Crown,
  FileText,
  UserCheck,
  Activity,
  BarChart3,
  TrendingUp,
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [auditPage, setAuditPage] = useState(1);

  const { data: dashData, isLoading, error } = useQuery({
    queryKey: ['adminDashboard', auditPage],
    queryFn: () => getAdminDashboardApi(),
    refetchInterval: 30000,
  });

  const m = (dashData as any)?.metrics || (dashData as any)?.kpis || dashData;
  const charts = (dashData as any)?.charts;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Welcome Hero Banner */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-agri-primary border border-emerald-600 rounded-3xl p-6 relative overflow-hidden shadow-soft-lg text-white">
          <div className="relative z-10 max-w-2xl space-y-2">
            <span className="px-3 py-1 rounded-full bg-white/10 text-emerald-100 text-xs font-mono border border-white/20 backdrop-blur-sm">
              AgriConnect Production Telemetry Engine
            </span>
            <h2 className="text-2xl font-bold font-heading text-white">Platform Command Center</h2>
            <p className="text-xs text-emerald-100 leading-relaxed">
              Real-time operational metrics across Users, Jobs, Applications, System A Trust Verification, System B Aadhaar e-KYC, Financial Revenue, and Security Audits.
            </p>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-28 bg-white rounded-2xl animate-pulse border border-slate-200 shadow-soft-sm" />
            ))}
          </div>
        )}

        {/* Primary Operational Metrics Grid */}
        {m && (
          <div className="space-y-4">
            <h3 className="text-xs font-mono uppercase text-slate-400 font-bold flex items-center space-x-1.5">
              <Activity size={14} className="text-emerald-400" />
              <span>Core Telemetry & Operational Metrics</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Platform Users"
                value={m.totalUsers.toLocaleString()}
                subtitle={`${m.farmers} Farmers • ${m.workers} Workers`}
                icon={Users}
                color="emerald"
              />

              <StatCard
                title="Skill Verified Workers (System A)"
                value={m.verifiedWorkers.toLocaleString()}
                subtitle={`${m.trustedWorkers} Trusted Workers (80+ Score)`}
                icon={ShieldCheck}
                color="emerald"
              />

              <StatCard
                title="Identity Verified Workers (System B)"
                value={m.identityVerifiedWorkers.toLocaleString()}
                subtitle="UIDAI Paperless e-KYC Passed"
                icon={IdCard}
                color="blue"
              />

              <StatCard
                title="Active Premium Subscribers"
                value={m.premiumUsers.toLocaleString()}
                subtitle="Pro Membership Active"
                icon={Crown}
                color="amber"
              />

              <StatCard
                title="Total Job Vacancies"
                value={m.totalJobs.toLocaleString()}
                subtitle="Agriculture & Equipment Jobs"
                icon={Briefcase}
                color="blue"
              />

              <StatCard
                title="Job Applications & Hires"
                value={m.applications.toLocaleString()}
                subtitle={`${m.hires} Candidates Successfully Hired`}
                icon={FileCheck}
                color="purple"
              />

              <StatCard
                title="Pending Verification Queue"
                value={(m.pendingCertificates + m.pendingIdentityVerifications).toString()}
                subtitle={`${m.pendingCertificates} Certs • ${m.pendingIdentityVerifications} Aadhaar KYC`}
                icon={FileText}
                color="amber"
              />

              <StatCard
                title="Gross Platform Revenue"
                value={`₹${(m.revenue || 0).toLocaleString('en-IN')}`}
                subtitle={`₹${(m.monthlyRevenue || 0).toLocaleString('en-IN')} this month`}
                icon={IndianRupee}
                color="emerald"
              />
            </div>
          </div>
        )}

        {/* Charts & Trends Section */}
        {charts && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* User Signup Growth Trend Chart */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono font-bold uppercase text-white flex items-center space-x-1.5">
                  <TrendingUp size={14} className="text-emerald-400" />
                  <span>User Signup Growth Trend (Last 30 Days)</span>
                </h4>
              </div>
              <div className="h-36 flex items-end justify-between space-x-1 pt-4 border-b border-slate-800 pb-2">
                {charts.userGrowth?.length === 0 ? (
                  <p className="text-slate-500 italic text-xs w-full text-center py-8">No signup trend data available.</p>
                ) : (
                  charts.userGrowth?.map((item: any) => (
                    <div key={item._id} className="flex flex-col items-center flex-1 min-w-[12px] group">
                      <div
                        className="w-full bg-emerald-500/40 group-hover:bg-emerald-400 rounded-t-sm transition-all"
                        style={{ height: `${Math.max(item.count * 12, 6)}px` }}
                        title={`${item._id}: ${item.count} signup(s)`}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Trust Score Distribution Histogram */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono font-bold uppercase text-white flex items-center space-x-1.5">
                  <BarChart3 size={14} className="text-teal-400" />
                  <span>System A Trust Score Distribution</span>
                </h4>
              </div>
              <div className="space-y-2 pt-2 text-xs font-mono">
                {[
                  { range: '81 - 100 (Trusted Worker)', count: charts.trustDistribution?.find((d: any) => d._id === 81)?.count || 0, color: 'bg-emerald-500' },
                  { range: '61 - 80 (Skilled Worker)', count: charts.trustDistribution?.find((d: any) => d._id === 61)?.count || 0, color: 'bg-teal-500' },
                  { range: '41 - 60 (Verified Worker)', count: charts.trustDistribution?.find((d: any) => d._id === 41)?.count || 0, color: 'bg-blue-500' },
                  { range: '0 - 40 (Basic Worker)', count: charts.trustDistribution?.find((d: any) => d._id === 0 || d._id === 21)?.count || 0, color: 'bg-slate-700' },
                ].map((b) => (
                  <div key={b.range} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-300">{b.range}</span>
                      <span className="text-slate-400">{b.count} workers</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div className={`h-full ${b.color}`} style={{ width: `${Math.min(b.count * 10, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Server-Side Paginated Recent Security & Admin Audit Stream */}
        {dashData?.recentAuditLogs && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-2">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity size={16} className="text-amber-400" />
                <h3 className="text-xs font-mono font-bold uppercase text-white">Recent Security & Administrative Audit Stream</h3>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono border-b border-slate-800">
                  <tr>
                    <th className="p-3">Actor Admin</th>
                    <th className="p-3">Action Event</th>
                    <th className="p-3">Severity</th>
                    <th className="p-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {dashData.recentAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-500">No audit events logged.</td>
                    </tr>
                  ) : (
                    dashData.recentAuditLogs.map((log: any) => (
                      <tr key={log._id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-semibold text-white">{log.actor?.name || 'System Admin'}</td>
                        <td className="p-3 text-emerald-400">{log.action}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                            log.severity === 'CRITICAL' || log.severity === 'HIGH' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                            log.severity === 'WARNING' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            'bg-slate-800 text-slate-400'
                          }`}>
                            {log.severity}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400">{new Date(log.createdAt).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination controls for audit log */}
            {dashData.auditPagination && (
              <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Audit Logs Page {dashData.auditPagination.page} of {dashData.auditPagination.pages}</span>
                <div className="flex space-x-2">
                  <button
                    disabled={auditPage <= 1}
                    onClick={() => setAuditPage((p) => p - 1)}
                    className="px-2.5 py-1 bg-slate-900 rounded border border-slate-800 disabled:opacity-40 hover:bg-slate-800 text-[11px]"
                  >
                    Previous
                  </button>
                  <button
                    disabled={auditPage >= dashData.auditPagination.pages}
                    onClick={() => setAuditPage((p) => p + 1)}
                    className="px-2.5 py-1 bg-slate-900 rounded border border-slate-800 disabled:opacity-40 hover:bg-slate-800 text-[11px]"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboardPage;
