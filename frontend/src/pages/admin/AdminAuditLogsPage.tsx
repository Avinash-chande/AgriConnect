import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatusBadge } from '../../components/admin/shared/StatusBadge';
import { AdminModal } from '../../components/admin/shared/AdminModal';
import { getAdminAuditLogsApi } from '../../services/adminService';
import { History, Search, ShieldCheck, Lock, Eye, Terminal } from 'lucide-react';

export const AdminAuditLogsPage: React.FC = () => {
  const [action, setAction] = useState('');
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('');
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['adminAuditLogs', page, action, category, severity],
    queryFn: () => getAdminAuditLogsApi({ page, limit: 20, action, category, severity }),
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <History size={24} />
            </div>
            <div>
              <h1 className="text-lg font-heading font-bold text-white">
                Immutable Administrative Audit Trail
              </h1>
              <p className="text-xs text-slate-400">
                Permanent security audit log capturing user suspensions, identity reviews, job moderation, payment refunds, and setting updates.
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-2 text-[11px] font-mono text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
            <Lock size={12} />
            <span>IMMUTABLE RECORD GUARD ENFORCED</span>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
            {/* Search Input */}
            <div className="relative col-span-1 md:col-span-2">
              <Search size={16} className="absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search audit action event..."
                value={action}
                onChange={(e) => {
                  setAction(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-200 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            {/* Category Filter */}
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-amber-500/50"
            >
              <option value="">All Categories</option>
              <option value="admin">ADMIN</option>
              <option value="user">USER</option>
              <option value="job">JOB</option>
              <option value="payment">PAYMENT</option>
              <option value="kyc">KYC</option>
              <option value="settings">SETTINGS</option>
              <option value="security">SECURITY</option>
            </select>

            {/* Severity Filter */}
            <select
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value);
                setPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-amber-500/50"
            >
              <option value="">All Severities</option>
              <option value="INFO">INFO</option>
              <option value="WARNING">WARNING</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>
        </div>

        {/* Audit Stream Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono border-b border-slate-800">
                <tr>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Actor Admin</th>
                  <th className="p-4">Action Event</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Severity</th>
                  <th className="p-4">IP Address</th>
                  <th className="p-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 font-sans">Loading audit trail stream...</td>
                  </tr>
                ) : data?.logs?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 font-sans">No audit events found.</td>
                  </tr>
                ) : (
                  data?.logs?.map((l: any) => (
                    <tr key={l._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 text-slate-400">{new Date(l.createdAt).toLocaleString()}</td>
                      <td className="p-4 font-sans font-semibold text-white">{l.actor?.name || 'System Admin'}</td>
                      <td className="p-4 font-bold text-amber-400">{l.action}</td>
                      <td className="p-4 text-slate-400 uppercase">{l.category}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          l.severity === 'CRITICAL' || l.severity === 'HIGH' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                          l.severity === 'WARNING' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          'bg-slate-800 text-slate-300'
                        }`}>
                          {l.severity}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400">{l.ipAddress || l.IP || '127.0.0.1'}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedLog(l)}
                          className="px-3 py-1 bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 text-[11px]"
                        >
                          View Payload
                        </button>
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
              <span>Showing Page {data.pagination.page} of {data.pagination.pages} ({data.pagination.total} Audit Logs)</span>
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

        {/* Audit Log Modal Inspection */}
        {selectedLog && (
          <AdminModal
            isOpen={!!selectedLog}
            onClose={() => setSelectedLog(null)}
            title={`Audit Event: ${selectedLog.action}`}
          >
            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <p>Actor Admin: <strong className="text-white">{selectedLog.actor?.name || 'System Admin'}</strong> ({selectedLog.actor?.email})</p>
                <p>IP Address: <span className="text-amber-400">{selectedLog.ipAddress || selectedLog.IP || '127.0.0.1'}</span></p>
                <p>User Agent: <span className="text-slate-400">{selectedLog.userAgent || 'AgriConnect Admin Web Dashboard'}</span></p>
                <p>Timestamp: <span className="text-slate-400">{new Date(selectedLog.createdAt).toISOString()}</span></p>
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1 flex items-center space-x-1">
                  <Terminal size={12} />
                  <span>Sanitized Event Payload Metadata (No Aadhaar / Secrets):</span>
                </label>
                <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-emerald-400 text-[11px] overflow-x-auto font-mono">
                  {JSON.stringify(selectedLog.details || selectedLog.metadata || {}, null, 2)}
                </pre>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-amber-500/20 text-amber-300 text-[11px]">
                🔒 <strong>Immutable Permanent Audit Entry:</strong> This record cannot be edited, modified, or deleted by any administrative account.
              </div>
            </div>
          </AdminModal>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminAuditLogsPage;
