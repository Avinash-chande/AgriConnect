import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatusBadge } from '../../components/admin/shared/StatusBadge';
import { AdminModal } from '../../components/admin/shared/AdminModal';
import {
  getAdminJobsApi,
  getJobModerationOverviewApi,
  moderateJobApi,
  featureJobApi,
} from '../../services/adminService';
import type { AdminJob } from '../../types/admin';
import {
  Search,
  Briefcase,
  Flag,
  EyeOff,
  RotateCcw,
  XCircle,
  CheckCircle,
  AlertTriangle,
  Star,
  MapPin,
  IndianRupee,
  Users,
  ShieldCheck,
  IdCard,
} from 'lucide-react';

import { useDebounce } from '../../hooks/useDebounce';

export const AdminJobModerationPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Search & Filter State
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);

  // Selected Job Overview Modal
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [actionReason, setActionReason] = useState('');

  // Query: Jobs List
  const { data: jobsData, isLoading: isJobsLoading } = useQuery({
    queryKey: ['adminJobs', debouncedSearch, statusFilter, categoryFilter, page],
    queryFn: () =>
      getAdminJobsApi({
        search: debouncedSearch,
        status: statusFilter,
        category: categoryFilter,
        page,
        limit: 15,
      }),
  });

  // Query: Job Moderation Overview (Job + Farmer + Reports)
  const { data: overviewData, isLoading: isOverviewLoading } = useQuery({
    queryKey: ['adminJobOverview', selectedJobId],
    queryFn: () => getJobModerationOverviewApi(selectedJobId!),
    enabled: !!selectedJobId,
  });

  // Mutations
  const moderateMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      moderateJobApi(id, action, actionReason),
    onSuccess: () => {
      setSelectedJobId(null);
      setActionReason('');
      queryClient.invalidateQueries({ queryKey: ['adminJobs'] });
    },
  });

  const featureMut = useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) =>
      featureJobApi(id, featured),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminJobs'] });
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Briefcase size={24} />
            </div>
            <div>
              <h1 className="text-lg font-heading font-bold text-white">
                Admin Job Moderation
              </h1>
              <p className="text-xs text-slate-400">
                Inspect job vacancies, flag suspicious postings, hide content, restore listings, or soft-remove non-compliant jobs.
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-2 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
            <ShieldCheck size={12} />
            <span>SOFT-DELETION PREFERRED</span>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
            {/* Search Input */}
            <div className="relative col-span-1 md:col-span-2">
              <Search size={16} className="absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search job title, crop, or location..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500/50"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Flagged">Flagged</option>
              <option value="Hidden">Hidden</option>
              <option value="Closed">Closed</option>
              <option value="Removed">Removed</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500/50"
            >
              <option value="">All Categories</option>
              <option value="Harvesting">Harvesting</option>
              <option value="Sowing / Planting">Sowing / Planting</option>
              <option value="Plowing / Tillage">Plowing / Tillage</option>
              <option value="Irrigation">Irrigation</option>
              <option value="Equipment Operation">Equipment Operation</option>
              <option value="General Farm Labor">General Farm Labor</option>
            </select>
          </div>
        </div>

        {/* Jobs Data Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono border-b border-slate-800">
                <tr>
                  <th className="p-4">Job Title & Category</th>
                  <th className="p-4">Farmer</th>
                  <th className="p-4">Daily Wage</th>
                  <th className="p-4">Applications</th>
                  <th className="p-4">Moderation Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isJobsLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">Loading job postings...</td>
                  </tr>
                ) : jobsData?.jobs?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">No jobs found matching criteria.</td>
                  </tr>
                ) : (
                  jobsData?.jobs?.map((j: any) => (
                    <tr key={j._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-white truncate max-w-xs">{j.title}</p>
                          <p className="text-[10px] text-emerald-400 font-mono">{j.category}</p>
                        </div>
                      </td>

                      <td className="p-4 font-mono">
                        <p className="text-slate-200">{j.farmer?.name || 'Farmer'}</p>
                      </td>

                      <td className="p-4 font-mono font-semibold text-emerald-400">
                        ₹{j.dailyWage || 0}/day
                      </td>

                      <td className="p-4 font-mono">
                        {j.totalApplications || 0} Apps
                      </td>

                      <td className="p-4">
                        <StatusBadge status={j.status} type={j.status === 'Active' ? 'success' : 'warning'} />
                      </td>

                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => featureMut.mutate({ id: j._id, featured: !j.isFeatured })}
                          title={j.isFeatured ? 'Unfeature Job' : 'Feature Job'}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            j.isFeatured
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                          }`}
                        >
                          <Star size={14} className={j.isFeatured ? 'fill-amber-400' : ''} />
                        </button>
                        <button
                          onClick={() => setSelectedJobId(j._id)}
                          className="px-3 py-1.5 bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 font-mono text-[11px]"
                        >
                          Moderate Job
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Job Overview Modal */}
        {selectedJobId && (
          <AdminModal
            isOpen={!!selectedJobId}
            onClose={() => setSelectedJobId(null)}
            title={`Moderate Job Posting: ${overviewData?.job?.title || 'Loading...'}`}
          >
            {isOverviewLoading ? (
              <div className="p-8 text-center text-slate-500 font-mono text-xs animate-pulse">
                Loading job details and attached reports...
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Farmer Info Bar */}
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between font-mono">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm">
                      {overviewData?.farmer?.name?.charAt(0) || 'F'}
                    </div>
                    <div>
                      <p className="text-white font-semibold">{overviewData?.farmer?.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {overviewData?.farmer?.trustVerificationId ? `${overviewData.farmer.trustVerificationId.trustScore}/100 Trust` : 'Unscored'}
                      </p>
                    </div>
                  </div>
                  {overviewData?.farmer?.identityVerified && (
                    <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px]">
                      🪪 Identity Verified
                    </span>
                  )}
                </div>

                {/* Job Details Card */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <p className="text-slate-400 font-mono text-[11px]">Description:</p>
                  <p className="text-slate-200 leading-relaxed bg-slate-900 p-3 rounded-xl border border-slate-800">
                    {overviewData?.job?.description}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-slate-300 font-mono pt-1">
                    <span>Wage: <strong className="text-emerald-400">₹{overviewData?.job?.dailyWage}/day</strong></span>
                    <span>Category: <strong>{overviewData?.job?.category}</strong></span>
                  </div>
                </div>

                {/* Reports Attached */}
                {overviewData?.reports && overviewData.reports.length > 0 && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl space-y-2">
                    <p className="font-mono text-rose-400 font-bold text-[11px] flex items-center space-x-1">
                      <AlertTriangle size={14} />
                      <span>Reports Filed Against This Job ({overviewData.reports.length})</span>
                    </p>
                    <div className="space-y-1.5">
                      {overviewData.reports.map((r: any) => (
                        <div key={r._id} className="p-2 bg-slate-900 rounded-lg text-[11px] text-slate-300">
                          <p className="font-semibold text-white">{r.title}</p>
                          <p className="text-slate-400">{r.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Moderation Reason Input */}
                <div>
                  <label className="block text-slate-400 font-mono text-[11px] mb-1">
                    Moderation Note / Reason (Sent to Farmer):
                  </label>
                  <textarea
                    placeholder="Enter reason for moderation action..."
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-emerald-500/50"
                    rows={2}
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  <button
                    onClick={() => moderateMut.mutate({ id: selectedJobId, action: 'flag' })}
                    className="px-3 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl hover:bg-amber-500/20 font-mono text-[11px] flex items-center space-x-1"
                  >
                    <Flag size={14} />
                    <span>Flag Job</span>
                  </button>

                  <button
                    onClick={() => moderateMut.mutate({ id: selectedJobId, action: 'hide' })}
                    className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 font-mono text-[11px] flex items-center space-x-1"
                  >
                    <EyeOff size={14} />
                    <span>Hide Job</span>
                  </button>

                  <button
                    onClick={() => moderateMut.mutate({ id: selectedJobId, action: 'restore' })}
                    className="px-3 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/30 font-mono text-[11px] flex items-center space-x-1"
                  >
                    <RotateCcw size={14} />
                    <span>Restore Live</span>
                  </button>

                  <button
                    onClick={() => moderateMut.mutate({ id: selectedJobId, action: 'remove' })}
                    className="px-4 py-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-500/20 font-mono text-[11px] flex items-center space-x-1"
                  >
                    <XCircle size={14} />
                    <span>Soft-Remove Job</span>
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

export default AdminJobModerationPage;
