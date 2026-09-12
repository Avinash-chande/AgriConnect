import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { broadcastNotificationApi } from '../../services/adminService';
import { Bell, Send, CheckCircle2 } from 'lucide-react';

export const AdminNotificationsPage: React.FC = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetRole, setTargetRole] = useState('ALL');
  const [successMsg, setSuccessMsg] = useState('');

  const broadcastMutation = useMutation({
    mutationFn: () => broadcastNotificationApi({ title, message, targetRole }),
    onSuccess: (res) => {
      setSuccessMsg(`Broadcast successfully sent to ${res.recipientCount || 'all'} user(s)!`);
      setTitle('');
      setMessage('');
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <Bell size={20} className="text-amber-400" />
          <h3 className="text-sm font-heading font-semibold text-white">System Announcement & Broadcast Desk</h3>
        </div>

        {/* Broadcast Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-2xl space-y-4">
          <h4 className="font-heading font-semibold text-white text-base">New Platform Broadcast Announcement</h4>

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center space-x-2">
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Target Audience</label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-amber-500/50 font-mono"
              >
                <option value="ALL">All Platform Users (Farmers + Workers)</option>
                <option value="Farmer">Farmers Only</option>
                <option value="Worker">Workers Only</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Announcement Title</label>
              <input
                type="text"
                placeholder="e.g. Seasonal Harvesting Subsidy Notice"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Notification Message</label>
              <textarea
                placeholder="Write message content for instant push and system alert..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-amber-500/50"
                rows={4}
              />
            </div>

            <button
              onClick={() => broadcastMutation.mutate()}
              disabled={!title || !message || broadcastMutation.isPending}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold rounded-xl hover:opacity-90 flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              <Send size={16} />
              <span>{broadcastMutation.isPending ? 'Sending Broadcast...' : 'Send Broadcast Announcement'}</span>
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
