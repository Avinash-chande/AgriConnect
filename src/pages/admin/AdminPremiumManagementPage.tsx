import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatusBadge } from '../../components/admin/shared/StatusBadge';
import { AdminModal } from '../../components/admin/shared/AdminModal';
import { getAdminSubscriptionsApi, grantPremiumApi, revokePremiumApi } from '../../services/adminService';
import { Crown, Plus, XCircle } from 'lucide-react';

export const AdminPremiumManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isGrantOpen, setIsGrantOpen] = useState(false);
  const [grantUserId, setGrantUserId] = useState('');
  const [durationDays, setDurationDays] = useState(30);

  const { data, isLoading } = useQuery({
    queryKey: ['adminSubscriptions'],
    queryFn: () => getAdminSubscriptionsApi(),
  });

  const grantMutation = useMutation({
    mutationFn: () => grantPremiumApi(grantUserId, Number(durationDays)),
    onSuccess: () => {
      setIsGrantOpen(false);
      setGrantUserId('');
      queryClient.invalidateQueries({ queryKey: ['adminSubscriptions'] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => revokePremiumApi(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminSubscriptions'] }),
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center space-x-3">
            <Crown size={20} className="text-amber-400" />
            <h3 className="text-sm font-heading font-semibold text-white">Premium Membership Subscriptions</h3>
          </div>

          <button
            onClick={() => setIsGrantOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold rounded-xl hover:opacity-90 flex items-center space-x-1.5 text-xs shadow-lg shadow-amber-500/20"
          >
            <Plus size={16} />
            <span>Grant Premium</span>
          </button>
        </div>

        {/* Subscriptions Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono border-b border-slate-800">
                <tr>
                  <th className="p-4">User</th>
                  <th className="p-4">Plan Name</th>
                  <th className="p-4">Start Date</th>
                  <th className="p-4">Expiration Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">Loading premium subscriptions...</td>
                  </tr>
                ) : data?.subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">No active or past subscriptions found.</td>
                  </tr>
                ) : (
                  data?.subscriptions.map((s: any) => (
                    <tr key={s._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-semibold text-white">{s.user?.name || 'User'}</td>
                      <td className="p-4 uppercase font-mono text-amber-400 font-bold">{s.plan}</td>
                      <td className="p-4 font-mono text-slate-400">{new Date(s.startDate).toLocaleDateString()}</td>
                      <td className="p-4 font-mono text-slate-400">{new Date(s.endDate).toLocaleDateString()}</td>
                      <td className="p-4">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="p-4 text-right">
                        {s.status === 'active' && (
                          <button
                            onClick={() => revokeMutation.mutate(s._id)}
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10"
                            title="Revoke Premium"
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Grant Premium Modal */}
        {isGrantOpen && (
          <AdminModal isOpen={isGrantOpen} onClose={() => setIsGrantOpen(false)} title="Grant Premium Membership">
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Target User ID (User Mongo ID)</label>
                <input
                  type="text"
                  placeholder="Enter User ObjectId"
                  value={grantUserId}
                  onChange={(e) => setGrantUserId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Duration (Days)</label>
                <input
                  type="number"
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-amber-500/50"
                  min={1}
                  max={365}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  onClick={() => setIsGrantOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => grantMutation.mutate()}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold rounded-xl hover:opacity-90"
                >
                  Grant Premium
                </button>
              </div>
            </div>
          </AdminModal>
        )}
      </div>
    </AdminLayout>
  );
};
