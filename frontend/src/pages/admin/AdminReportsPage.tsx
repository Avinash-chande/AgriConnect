import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatusBadge } from '../../components/admin/shared/StatusBadge';
import { AdminModal } from '../../components/admin/shared/AdminModal';
import { getAdminReportsApi, resolveReportApi } from '../../services/adminService';
import type { ReportData } from '../../types/admin';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  ShieldAlert,
  ArrowUpRight,
  UserCheck,
  Lock,
  FileText,
} from 'lucide-react';

export const AdminReportsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null);
  const [resolution, setResolution] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['adminReports', statusFilter, priorityFilter],
    queryFn: () =>
      getAdminReportsApi({
        status: statusFilter === 'ALL' ? '' : statusFilter,
        priority: priorityFilter === 'ALL' ? '' : priorityFilter,
      }),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      resolveReportApi(id, status, resolution, internalNotes),
    onSuccess: () => {
      setSelectedReport(null);
      setResolution('');
      setInternalNotes('');
      queryClient.invalidateQueries({ queryKey: ['adminReports'] });
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h1 className="text-lg font-heading font-bold text-white">
                Reports & Complaints Center
              </h1>
              <p className="text-xs text-slate-400">
                Investigate user complaints regarding Fraud, Harassment, Verification Abuse, Spam, and Suspicious Profiles.
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-2 text-[11px] font-mono text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
            <Lock size={12} />
            <span>INTERNAL NOTES PROTECTED</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400">Status:</span>
            {['ALL', 'PENDING', 'INVESTIGATING', 'RESOLVED', 'REJECTED', 'ESCALATED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  statusFilter === st
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-slate-400">Priority:</span>
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((pr) => (
              <button
                key={pr}
                onClick={() => setPriorityFilter(pr)}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  priorityFilter === pr
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                {pr}
              </button>
            ))}
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono border-b border-slate-800">
                <tr>
                  <th className="p-4">Reporter</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Title</th>
                  <th className="p-4">Priority</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">Loading reports queue...</td>
                  </tr>
                ) : data?.reports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">No reports found matching filter.</td>
                  </tr>
                ) : (
                  data?.reports.map((r: any) => (
                    <tr key={r._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-semibold text-white">{r.reporter?.name || 'User'}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700 text-[10px] uppercase font-mono">
                          {r.category}
                        </span>
                      </td>
                      <td className="p-4 text-slate-200 max-w-xs truncate">{r.title}</td>
                      <td className="p-4 font-mono">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          r.priority === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                          r.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {r.priority}
                        </span>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={r.status} type={r.status === 'RESOLVED' ? 'success' : 'warning'} />
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedReport(r)}
                          className="px-3 py-1.5 bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 font-mono text-[11px]"
                        >
                          Investigate
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {selectedReport && (
          <AdminModal
            isOpen={!!selectedReport}
            onClose={() => setSelectedReport(null)}
            title={`Investigate Report: ${selectedReport.title}`}
          >
            <div className="space-y-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-slate-400 font-mono">
                  <span>Category: <strong className="text-amber-400">{selectedReport.category}</strong></span>
                  <span>Priority: <strong className="text-rose-400">{selectedReport.priority}</strong></span>
                </div>

                <div>
                  <p className="text-slate-400 font-mono text-[11px] mb-1">Description:</p>
                  <p className="text-slate-200 leading-relaxed bg-slate-900 p-3 rounded-lg border border-slate-800">
                    {selectedReport.description}
                  </p>
                </div>

                <div>
                  <label className="block text-slate-400 font-mono text-[11px] mb-1">
                    Public Resolution Note (Visible to Reporter):
                  </label>
                  <textarea
                    placeholder="Enter public resolution summary..."
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-amber-500/50"
                    rows={2}
                  />
                </div>

                <div className="pt-1">
                  <label className="block text-blue-400 font-mono text-[11px] mb-1 flex items-center space-x-1">
                    <Lock size={12} />
                    <span>Internal Admin Notes (STRICTLY CONFIDENTIAL — Admin Only):</span>
                  </label>
                  <textarea
                    placeholder="Enter confidential investigation notes for admin staff..."
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-blue-500/30 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-blue-500/50 font-mono"
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  onClick={() => reviewMutation.mutate({ id: selectedReport._id, status: 'INVESTIGATING' })}
                  className="px-3 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 font-mono text-[11px]"
                >
                  Mark Investigating
                </button>
                <button
                  onClick={() => reviewMutation.mutate({ id: selectedReport._id, status: 'ESCALATED' })}
                  className="px-3 py-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-500/20 font-mono text-[11px] flex items-center space-x-1"
                >
                  <ArrowUpRight size={14} />
                  <span>Escalate Report</span>
                </button>
                <button
                  onClick={() => reviewMutation.mutate({ id: selectedReport._id, status: 'REJECTED' })}
                  className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 font-mono text-[11px]"
                >
                  Reject Complaint
                </button>
                <button
                  onClick={() => reviewMutation.mutate({ id: selectedReport._id, status: 'RESOLVED' })}
                  className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/30 font-mono text-[11px] flex items-center space-x-1"
                >
                  <CheckCircle size={14} />
                  <span>Mark Resolved</span>
                </button>
              </div>
            </div>
          </AdminModal>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminReportsPage;
