import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatusBadge } from '../../components/admin/shared/StatusBadge';
import { AdminModal } from '../../components/admin/shared/AdminModal';
import {
  getAdminUsersApi,
  getUserOverviewApi,
  suspendUserApi,
  activateUserApi,
} from '../../services/adminService';
import type { AdminUser } from '../../types/admin';
import {
  Search,
  Users,
  ShieldCheck,
  IdCard,
  Briefcase,
  FileCheck,
  AlertTriangle,
  Crown,
  Lock,
  UserCheck,
  Ban,
  CheckCircle,
  XCircle,
  RefreshCw,
  Mail,
  Smartphone,
  Calendar,
} from 'lucide-react';

import { useDebounce } from '../../hooks/useDebounce';

export const AdminUserManagementPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Search & Filter State
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [page, setPage] = useState(1);

  // Selected User Overview Modal
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState<
    'PROFILE' | 'TRUST' | 'IDENTITY' | 'JOBS' | 'APPLICATIONS' | 'REPORTS' | 'PREMIUM'
  >('PROFILE');

  // Query: Users List
  const { data: usersData, isLoading: isUsersLoading } = useQuery({
    queryKey: ['adminUsers', debouncedSearch, roleFilter, statusFilter, sortBy, sortOrder, page],
    queryFn: () =>
      getAdminUsersApi({
        search: debouncedSearch,
        role: roleFilter,
        isActive: statusFilter,
        sortBy,
        sortOrder,
        page,
        limit: 15,
      }),
  });

  // Query: Single User Complete Overview
  const { data: overviewData, isLoading: isOverviewLoading } = useQuery({
    queryKey: ['adminUserOverview', selectedUserId],
    queryFn: () => getUserOverviewApi(selectedUserId!),
    enabled: !!selectedUserId,
  });

  // Mutations
  const suspendMut = useMutation({
    mutationFn: (id: string) => suspendUserApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['adminUserOverview'] });
    },
  });

  const activateMut = useMutation({
    mutationFn: (id: string) => activateUserApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['adminUserOverview'] });
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Users size={24} />
            </div>
            <div>
              <h1 className="text-lg font-heading font-bold text-white">
                Admin User Management
              </h1>
              <p className="text-xs text-slate-400">
                Search, filter, inspect profiles, System A Trust Scores, System B e-KYC status, jobs, applications, and manage account statuses.
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-2 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
            <Lock size={12} />
            <span>CONFIDENTIAL DATA PROTECTED</span>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            {/* Search Input */}
            <div className="relative col-span-1 md:col-span-2">
              <Search size={16} className="absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search by name, email, or mobile..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500/50"
            >
              <option value="">All Roles</option>
              <option value="Farmer">Farmers</option>
              <option value="Worker">Workers</option>
              <option value="Admin">Admins</option>
            </select>

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
              <option value="true">Active Accounts</option>
              <option value="false">Suspended / Deactivated</option>
            </select>
          </div>
        </div>

        {/* Users Data Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono border-b border-slate-800">
                <tr>
                  <th className="p-4">User</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4">Trust Score (System A)</th>
                  <th className="p-4">Identity (System B)</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isUsersLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">Loading user accounts...</td>
                  </tr>
                ) : usersData?.users?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">No user accounts found matching query.</td>
                  </tr>
                ) : (
                  usersData?.users?.map((u: any) => (
                    <tr key={u._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold shrink-0">
                            {u.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{u.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">ID: {u._id.slice(-6)}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 font-mono">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${
                          u.role === 'Farmer' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          u.role === 'Admin' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {u.role}
                        </span>
                      </td>

                      <td className="p-4 space-y-0.5 text-[11px] font-mono">
                        <p className="text-slate-300">{u.mobile || '—'}</p>
                        <p className="text-slate-500 truncate max-w-[140px]">{u.email || '—'}</p>
                      </td>

                      <td className="p-4 font-mono">
                        {u.trustVerificationId ? (
                          <div className="space-y-0.5">
                            <p className="font-bold text-emerald-400">{u.trustVerificationId.trustScore} / 100</p>
                            <p className="text-[10px] text-slate-400">{u.trustVerificationId.trustLevel}</p>
                          </div>
                        ) : (
                          <span className="text-slate-500">Unscored</span>
                        )}
                      </td>

                      <td className="p-4">
                        {u.identityVerified ? (
                          <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono text-[10px]">
                            🪪 VERIFIED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-500 font-mono text-[10px]">
                            Unverified
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        <StatusBadge
                          status={u.isActive !== false ? 'Active' : 'Suspended'}
                          type={u.isActive !== false ? 'success' : 'danger'}
                        />
                      </td>

                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setSelectedUserId(u._id);
                            setActiveDrawerTab('PROFILE');
                          }}
                          className="px-3 py-1.5 bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 font-mono text-[11px]"
                        >
                          View Full Overview
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          {usersData?.pagination && (
            <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Showing Page {usersData.pagination.page} of {usersData.pagination.pages} ({usersData.pagination.total} Users)</span>
              <div className="flex space-x-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1 bg-slate-900 rounded-lg border border-slate-800 disabled:opacity-40 hover:bg-slate-800"
                >
                  Previous
                </button>
                <button
                  disabled={page >= usersData.pagination.pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 bg-slate-900 rounded-lg border border-slate-800 disabled:opacity-40 hover:bg-slate-800"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Overview Inspection Drawer Modal */}
        {selectedUserId && (
          <AdminModal
            isOpen={!!selectedUserId}
            onClose={() => setSelectedUserId(null)}
            title={`User Overview: ${overviewData?.user?.name || 'Loading...'}`}
          >
            {isOverviewLoading ? (
              <div className="p-8 text-center text-slate-500 font-mono text-xs animate-pulse">
                Loading complete user profile and activity records...
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Tabs */}
                <div className="flex flex-wrap gap-1 border-b border-slate-800 pb-2 font-mono text-[11px]">
                  {[
                    { id: 'PROFILE', label: 'Profile', icon: Users },
                    { id: 'TRUST', label: 'Trust (System A)', icon: ShieldCheck },
                    { id: 'IDENTITY', label: 'Identity (System B)', icon: IdCard },
                    { id: 'JOBS', label: 'Jobs', icon: Briefcase },
                    { id: 'APPLICATIONS', label: 'Applications', icon: FileCheck },
                    { id: 'REPORTS', label: 'Reports', icon: AlertTriangle },
                    { id: 'PREMIUM', label: 'Premium', icon: Crown },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveDrawerTab(t.id as any)}
                      className={`px-2.5 py-1.5 rounded-lg flex items-center space-x-1 transition-all ${
                        activeDrawerTab === t.id
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-900'
                      }`}
                    >
                      <t.icon size={13} />
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 min-h-[220px]">
                  {activeDrawerTab === 'PROFILE' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 font-mono">
                        <div>
                          <span className="text-slate-500">Name</span>
                          <p className="text-white font-semibold">{overviewData?.user?.name}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Role</span>
                          <p className="text-emerald-400 font-semibold">{overviewData?.user?.role}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Mobile</span>
                          <p className="text-slate-200">{overviewData?.user?.mobile || '—'}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Email</span>
                          <p className="text-slate-200">{overviewData?.user?.email || '—'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeDrawerTab === 'TRUST' && (
                    <div className="space-y-2 font-mono">
                      <p>Trust Score: <strong className="text-emerald-400">{overviewData?.trustProfile?.trustScore || 0}/100</strong></p>
                      <p>Trust Level: <span className="text-white">{overviewData?.trustProfile?.trustLevel || 'BASIC'}</span></p>
                      <p>Completed Jobs: <span className="text-white">{overviewData?.trustProfile?.completedJobs || 0}</span></p>
                      <p>Rating: <span className="text-amber-400">⭐ {(overviewData?.trustProfile?.averageRating || 0).toFixed(1)}</span></p>
                    </div>
                  )}

                  {activeDrawerTab === 'IDENTITY' && (
                    <div className="space-y-2 font-mono">
                      <p>e-KYC Status: <span className="text-blue-400">{overviewData?.identityKyc?.status || 'NOT_STARTED'}</span></p>
                      <p>Masked Ref ID: <span className="text-white">{overviewData?.identityKyc?.referenceId || 'XXXX-XXXX-****'}</span></p>
                      <p>Signature Match: <span className="text-emerald-400">{overviewData?.identityKyc?.signatureVerified ? 'VALID ✓' : 'UNCHECKED'}</span></p>
                    </div>
                  )}

                  {activeDrawerTab === 'JOBS' && (
                    <div className="space-y-2">
                      {overviewData?.jobs?.length === 0 ? (
                        <p className="text-slate-500 italic">No jobs posted.</p>
                      ) : (
                        overviewData?.jobs?.map((j: any) => (
                          <div key={j._id} className="p-2 bg-slate-900 rounded-lg border border-slate-800 text-xs flex justify-between font-mono">
                            <span className="text-white font-medium">{j.title}</span>
                            <span className="text-emerald-400">₹{j.dailyWage}/day</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeDrawerTab === 'APPLICATIONS' && (
                    <div className="space-y-2 font-mono">
                      {overviewData?.applications?.length === 0 ? (
                        <p className="text-slate-500 italic">No applications submitted.</p>
                      ) : (
                        overviewData?.applications?.map((a: any) => (
                          <div key={a._id} className="p-2 bg-slate-900 rounded-lg border border-slate-800 text-xs flex justify-between">
                            <span className="text-white">{a.job?.title}</span>
                            <span className="text-amber-400">{a.status}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeDrawerTab === 'REPORTS' && (
                    <div className="space-y-2 font-mono">
                      {overviewData?.reports?.length === 0 ? (
                        <p className="text-slate-500 italic">No reports on file.</p>
                      ) : (
                        overviewData?.reports?.map((r: any) => (
                          <div key={r._id} className="p-2 bg-slate-900 rounded-lg border border-slate-800 text-xs flex justify-between">
                            <span className="text-white">{r.title}</span>
                            <span className="text-rose-400">{r.status}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeDrawerTab === 'PREMIUM' && (
                    <div className="space-y-2 font-mono">
                      <p>Premium Membership: <span className="text-amber-400">{overviewData?.subscription ? 'ACTIVE PRO ⭐' : 'STANDARD (FREE)'}</span></p>
                    </div>
                  )}
                </div>

                {/* Admin Status Actions */}
                <div className="flex justify-end space-x-3 pt-2">
                  {overviewData?.user?.isActive !== false ? (
                    <button
                      onClick={() => suspendMut.mutate(selectedUserId)}
                      disabled={suspendMut.isPending}
                      className="px-4 py-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-500/20 font-mono text-xs flex items-center space-x-1.5"
                    >
                      <Ban size={15} />
                      <span>Suspend / Deactivate User</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => activateMut.mutate(selectedUserId)}
                      disabled={activateMut.isPending}
                      className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/30 font-mono text-xs flex items-center space-x-1.5"
                    >
                      <CheckCircle size={15} />
                      <span>Reactivate / Unsuspend User</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </AdminModal>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminUserManagementPage;
