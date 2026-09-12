import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AdminModal } from '../../components/admin/shared/AdminModal';
import { getAdminRolesApi, createAdminRoleApi } from '../../services/adminService';
import { KeyRound, Plus, Lock, ShieldCheck, ShieldAlert, CheckCircle2 } from 'lucide-react';

const GRANULAR_PERMISSIONS = [
  { id: 'users.read', category: 'Users', label: 'View Users' },
  { id: 'users.update', category: 'Users', label: 'Update Profiles' },
  { id: 'users.suspend', category: 'Users', label: 'Suspend / Deactivate' },
  { id: 'jobs.read', category: 'Jobs', label: 'View Vacancies' },
  { id: 'jobs.moderate', category: 'Jobs', label: 'Flag / Hide / Remove Jobs' },
  { id: 'applications.read', category: 'Applications', label: 'Read Applications' },
  { id: 'applications.moderate', category: 'Applications', label: 'Flag / Override Applications' },
  { id: 'verification.read', category: 'System A Trust', label: 'Read Certificates' },
  { id: 'verification.review', category: 'System A Trust', label: 'Approve / Reject Skills' },
  { id: 'identity.read', category: 'System B Identity', label: 'Read Aadhaar e-KYC' },
  { id: 'identity.review', category: 'System B Identity', label: 'Review e-KYC Records' },
  { id: 'reports.read', category: 'Complaints', label: 'Read Complaints' },
  { id: 'reports.resolve', category: 'Complaints', label: 'Resolve Complaints' },
  { id: 'payments.read', category: 'Finance', label: 'View Transactions' },
  { id: 'refunds.manage', category: 'Finance', label: 'Process Refunds' },
  { id: 'analytics.read', category: 'Analytics', label: 'View Metrics' },
  { id: 'settings.manage', category: 'Settings', label: 'Platform Config' },
  { id: 'roles.manage', category: 'RBAC', label: 'Manage Roles' },
  { id: 'audit.read', category: 'Security', label: 'Read Audit Logs' },
];

export const AdminRoleManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const { data: roles, isLoading } = useQuery({
    queryKey: ['adminRoles'],
    queryFn: getAdminRolesApi,
  });

  const createRoleMutation = useMutation({
    mutationFn: () => createAdminRoleApi({ name: roleName, permissions: selectedPermissions, description }),
    onSuccess: () => {
      setIsModalOpen(false);
      setRoleName('');
      setDescription('');
      setSelectedPermissions([]);
      queryClient.invalidateQueries({ queryKey: ['adminRoles'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to create role.');
    },
  });

  const togglePermission = (permId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <KeyRound size={24} />
            </div>
            <div>
              <h1 className="text-lg font-heading font-bold text-white">
                Granular Admin RBAC & Role Management
              </h1>
              <p className="text-xs text-slate-400">
                Predefined & custom security roles (SUPER_ADMIN, ADMIN, MODERATOR, VERIFICATION_OFFICER, SUPPORT_AGENT, FINANCE_ADMIN, ANALYTICS_ADMIN).
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-500 text-slate-950 font-bold rounded-xl hover:bg-emerald-400 flex items-center space-x-1.5 text-xs shadow-lg shadow-emerald-500/20"
          >
            <Plus size={16} />
            <span>Create Custom Role</span>
          </button>
        </div>

        {/* Roles List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {isLoading ? (
            <div className="col-span-3 text-center py-8 text-slate-500 font-mono text-xs">Loading admin roles...</div>
          ) : (
            roles?.map((r) => (
              <div key={r._id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-heading font-bold text-white text-base">{r.name}</h4>
                    {r.isSystem && (
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700 text-[10px] font-mono flex items-center space-x-1">
                        <Lock size={10} />
                        <span>SYSTEM ROLE</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 mt-1">{r.description || 'Predefined administrative role.'}</p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 space-y-2">
                  <span className="text-[10px] font-mono uppercase text-slate-500 block">
                    Granted Permissions ({r.permissions?.length || 0}):
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto pr-1">
                    {r.permissions?.map((p) => (
                      <span key={p} className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal */}
        {isModalOpen && (
          <AdminModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Custom Granular Admin Role">
            <div className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-1">Role Name</label>
                <input
                  type="text"
                  placeholder="e.g. REGIONAL_INSPECTOR"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Role Description</label>
                <input
                  type="text"
                  placeholder="Brief role description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-2 font-semibold">Select Granular Permissions</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 max-h-60 overflow-y-auto">
                  {GRANULAR_PERMISSIONS.map((perm) => (
                    <label key={perm.id} className="flex items-center space-x-2 p-1.5 rounded hover:bg-slate-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(perm.id)}
                        onChange={() => togglePermission(perm.id)}
                        className="rounded border-slate-800 text-emerald-500 focus:ring-0 bg-slate-900"
                      />
                      <div className="text-[11px]">
                        <span className="text-white block font-semibold">{perm.id}</span>
                        <span className="text-slate-500 text-[9px]">{perm.label}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => createRoleMutation.mutate()}
                  disabled={createRoleMutation.isPending || !roleName}
                  className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold rounded-xl hover:bg-emerald-400 disabled:opacity-50"
                >
                  Create Role
                </button>
              </div>
            </div>
          </AdminModal>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminRoleManagementPage;
