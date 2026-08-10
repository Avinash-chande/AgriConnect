import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatusBadge } from '../../components/admin/shared/StatusBadge';
import { AdminModal } from '../../components/admin/shared/AdminModal';
import { ApplicationStatusTimeline } from '../../components/applications/ApplicationStatusTimeline';
import {
  getAdminApplicationsApi,
  getApplicationByIdApi,
  flagApplicationApi,
  overrideApplicationApi,
} from '../../services/adminService';
import {
  Search,
  FileCheck,
  Flag,
  ShieldCheck,
  IdCard,
  Lock,
  Briefcase,
  User,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
} from 'lucide-react';

import { useDebounce } from '../../hooks/useDebounce';

export const AdminApplicationMonitorPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Search & Filter State
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Selected Application Overview Modal
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  // Query: Applications List
  const { data: appData, isLoading: isAppsLoading } = useQuery({
    queryKey: ['adminApplications', debouncedSearch, statusFilter, page],
    queryFn: () =>
      getAdminApplicationsApi({
        search: debouncedSearch,
        status: statusFilter,
        page,
        limit: 15,
      }),
  });

  // Query: Single Application Details
  const { data: selectedApp, isLoading: isDetailsLoading } = useQuery({
    queryKey: ['adminApplicationDetails', selectedAppId],
    queryFn: () => getApplicationByIdApi(selectedAppId!),
    enabled: !!selectedAppId,
  });

  // Mutations
  const flagMut = useMutation({
    mutationFn: ({ id, isFlagged }: { id: string; isFlagged: boolean }) =>
      flagApplicationApi(id, isFlagged, adminNotes),
    onSuccess: () => {
      setSelectedAppId(null);
      setAdminNotes('');
      queryClient.invalidateQueries({ queryKey: ['adminApplications'] });
    },
  });

  const overrideMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      overrideApplicationApi(id, status, adminNotes),
    onSuccess: () => {
      setSelectedAppId(null);
      setAdminNotes('');
      queryClient.invalidateQueries({ queryKey: ['adminApplications'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Permission Denied: Explicit "applications.manage" permission is required.');
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <FileCheck size={24} />
            </div>
            <div>
              <h1 className="text-lg font-heading font-bold text-white">
                Admin Application Monitoring
              </h1>
              <p className="text-xs text-slate-400">
                Monitor job applications, view timeline histories, flag suspicious activity, and audit hiring decisions.
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-2 text-[11px] font-mono text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/20">
            <Lock size={12} />
            <span>RBAC PERMISSIONS: READ / MODERATE / MANAGE</span>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            {/* Search Input */}
            <div className="relative col-span-1 md:col-span-2">
              <Search size={16} className="absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search candidate, farmer, or job title..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-200 focus:outline-none focus:border-blue-500/50"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-blue-500/50"
            >
              <option value="">All Application Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Shortlisted">Shortlisted</option>
              <option value="Accepted">Accepted</option>
              <option value="Hired">Hired</option>
              <option value="Rejected">Rejected</option>
              <option value="Withdrawn">Withdrawn</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Applications Data Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono border-b border-slate-800">
                <tr>
                  <th className="p-4">Candidate Worker</th>
                  <th className="p-4">Job Vacancy</th>
                  <th className="p-4">Farmer</th>
                  <th className="p-4">Applied Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isAppsLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">Loading job applications...</td>
                  </tr>
                ) : appData?.applications?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">No applications matching filter.</td>
                  </tr>
                ) : (
                  appData?.applications?.map((a: any) => (
                    <tr key={a._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold shrink-0">
                            {a.worker?.name?.charAt(0) || 'W'}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{a.worker?.name || 'Candidate'}</p>
                            <div className="flex items-center space-x-1.5 mt-0.5">
                              {a.worker?.trustVerificationId && (
                                <span className="text-[10px] font-mono text-emerald-400">
                                  {a.worker.trustVerificationId.trustScore}/100 Trust
                                </span>
                              )}
                              {a.worker?.identityVerified && (
                                <span className="text-[10px] font-mono text-blue-400">🪪 Verified</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 font-mono text-slate-200">
                        <p className="truncate max-w-xs">{a.job?.title || 'Job Posting'}</p>
                      </td>

                      <td className="p-4 font-mono text-slate-300">
                        {a.farmer?.name || 'Farmer'}
                      </td>

                      <td className="p-4 font-mono text-slate-400">
                        {new Date(a.createdAt).toLocaleDateString()}
                      </td>

                      <td className="p-4">
                        <StatusBadge
                          status={a.status}
                          type={a.status === 'Hired' || a.status === 'Accepted' ? 'success' : 'warning'}
                        />
                      </td>

                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedAppId(a._id)}
                          className="px-3 py-1.5 bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 font-mono text-[11px]"
                        >
                          Inspect Timeline
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {appData?.pagination && (
            <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Showing Page {appData.pagination.page} of {appData.pagination.pages} ({appData.pagination.total} Applications)</span>
              <div className="flex space-x-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1 bg-slate-900 rounded-lg border border-slate-800 disabled:opacity-40 hover:bg-slate-800"
                >
                  Previous
                </button>
                <button
                  disabled={page >= appData.pagination.pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 bg-slate-900 rounded-lg border border-slate-800 disabled:opacity-40 hover:bg-slate-800"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Application Inspection Modal */}
        {selectedAppId && (
          <AdminModal
            isOpen={!!selectedAppId}
            onClose={() => setSelectedAppId(null)}
            title={`Application Inspection: ${selectedApp?.worker?.name} ➔ ${selectedApp?.job?.title}`}
          >
            {isDetailsLoading ? (
              <div className="p-8 text-center text-slate-500 font-mono text-xs animate-pulse">
                Loading complete application timeline...
              </div>
            ) : (
              <div className="space-y-5 text-xs">
                {/* Visual Application Status Timeline */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <p className="text-[11px] font-mono text-slate-400 uppercase font-bold mb-3">Application State Progress Timeline:</p>
                  <ApplicationStatusTimeline application={selectedApp} compact={false} />
                </div>

                {/* Candidate & Job Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-300">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 font-mono">
                    <p className="text-slate-500 text-[10px] uppercase">Candidate Worker</p>
                    <p className="text-white font-bold">{selectedApp?.worker?.name}</p>
                    <p className="text-emerald-400 text-[11px]">
                      {selectedApp?.worker?.trustVerificationId ? `${selectedApp.worker.trustVerificationId.trustScore}/100 Trust Score` : 'Unscored'}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 font-mono">
                    <p className="text-slate-500 text-[10px] uppercase">Job & Farmer</p>
                    <p className="text-white font-bold">{selectedApp?.job?.title}</p>
                    <p className="text-slate-400 text-[11px]">Posted by: {selectedApp?.farmer?.name}</p>
                  </div>
                </div>

                {/* Permission Warning Notice for Overrides */}
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300 flex items-start space-x-2">
                  <Info size={16} className="shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <strong className="block font-mono">RBAC Permission Guard Enforced:</strong>
                    Admins cannot arbitrarily change candidate hiring decisions unless explicitly authorized with <strong>"applications.manage"</strong> permission. All overrides are permanently recorded in audit logs.
                  </div>
                </div>

                {/* Admin Notes Input */}
                <div>
                  <label className="block text-slate-400 font-mono text-[11px] mb-1">
                    Administrative Notes / Audit Reason:
                  </label>
                  <textarea
                    placeholder="Enter audit note for this action..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-blue-500/50"
                    rows={2}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  <button
                    onClick={() => flagMut.mutate({ id: selectedAppId, isFlagged: !selectedApp?.isFlagged })}
                    className="px-3 py-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-500/20 font-mono text-[11px] flex items-center space-x-1"
                  >
                    <Flag size={14} />
                    <span>{selectedApp?.isFlagged ? 'Unflag Application' : 'Flag Suspicious Activity'}</span>
                  </button>

                  <button
                    onClick={() => overrideMut.mutate({ id: selectedAppId, status: 'Rejected' })}
                    className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 font-mono text-[11px]"
                  >
                    Override: Reject
                  </button>

                  <button
                    onClick={() => overrideMut.mutate({ id: selectedAppId, status: 'Hired' })}
                    className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/30 font-mono text-[11px] flex items-center space-x-1"
                  >
                    <CheckCircle size={14} />
                    <span>Override: Mark Hired (requires applications.manage)</span>
                  </button>
                </div>
              </div>
            )}
          </AdminModal>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminApplicationMonitorPage;
