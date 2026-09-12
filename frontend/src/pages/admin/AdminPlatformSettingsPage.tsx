import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { getPlatformSettingsApi, updatePlatformSettingApi } from '../../services/adminService';
import {
  Sliders,
  Check,
  ShieldCheck,
  Award,
  FileCheck,
  IdCard,
  Briefcase,
  Bot,
  Bell,
  CreditCard,
  Crown,
  AlertTriangle,
  Lock,
  Wrench,
} from 'lucide-react';

const SETTING_CATEGORIES = [
  { id: 'ALL', label: 'All Settings', icon: Sliders },
  { id: 'trust_score', label: 'Trust Score Rules', icon: ShieldCheck },
  { id: 'badges', label: 'Badge Thresholds', icon: Award },
  { id: 'certificates', label: 'Certificate Rules', icon: FileCheck },
  { id: 'identity', label: 'Identity Verification', icon: IdCard },
  { id: 'jobs', label: 'Job Rules', icon: Briefcase },
  { id: 'applications', label: 'Application Rules', icon: FileCheck },
  { id: 'ai_limits', label: 'AI Limits', icon: Bot },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'payments', label: 'Payment Settings', icon: CreditCard },
  { id: 'premium', label: 'Premium Settings', icon: Crown },
  { id: 'maintenance', label: 'Maintenance Mode', icon: Wrench },
  { id: 'verification', label: 'Verification Rules', icon: ShieldCheck },
];

export const AdminPlatformSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<any>('');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['platformSettings', activeCategory],
    queryFn: () => getPlatformSettingsApi(activeCategory === 'ALL' ? undefined : activeCategory),
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: any }) => updatePlatformSettingApi(key, value),
    onSuccess: () => {
      setEditingKey(null);
      queryClient.invalidateQueries({ queryKey: ['platformSettings'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to update setting.');
    },
  });

  const handleEditClick = (setting: any) => {
    setEditingKey(setting.key);
    setEditValue(setting.value);
  };

  const handleSave = (key: string, type: string) => {
    let finalVal = editValue;
    if (type === 'number') finalVal = Number(editValue);
    if (type === 'boolean') finalVal = editValue === 'true' || editValue === true;

    updateMutation.mutate({ key, value: finalVal });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sliders size={24} />
            </div>
            <div>
              <h1 className="text-lg font-heading font-bold text-white">
                Platform Rules & Dynamic Configuration
              </h1>
              <p className="text-xs text-slate-400">
                Configure Trust weights, badge thresholds, certificate rules, identity e-KYC payload limits, AI quotas, and maintenance mode.
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-2 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
            <Lock size={12} />
            <span>SECRETS HELD IN ENV VARS ONLY</span>
          </div>
        </div>

        {/* Category Tabs Bar */}
        <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
          {SETTING_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl border flex items-center space-x-1.5 transition-all ${
                activeCategory === cat.id
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <cat.icon size={13} />
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Settings List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-slate-500 font-mono text-xs animate-pulse">Loading platform settings...</div>
          ) : settings?.length === 0 ? (
            <div className="text-center py-8 text-slate-500 font-mono text-xs">No settings found in category.</div>
          ) : (
            settings?.map((s: any) => (
              <div
                key={s.key}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800/80 gap-4"
              >
                <div className="space-y-1">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono uppercase">
                    {s.category}
                  </span>
                  <h4 className="font-mono text-sm text-white font-semibold">{s.key}</h4>
                  <p className="text-xs text-slate-400">{s.description}</p>
                </div>

                <div className="flex items-center space-x-3">
                  {editingKey === s.key ? (
                    <div className="flex items-center space-x-2">
                      {s.type === 'boolean' ? (
                        <select
                          value={String(editValue)}
                          onChange={(e) => setEditValue(e.target.value === 'true')}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                        >
                          <option value="true">True (Enabled)</option>
                          <option value="false">False (Disabled)</option>
                        </select>
                      ) : (
                        <input
                          type={s.type === 'number' ? 'number' : 'text'}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                        />
                      )}

                      <button
                        onClick={() => handleSave(s.key, s.type)}
                        className="p-2 rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                        title="Save Setting"
                      >
                        <Check size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3 font-mono">
                      <span className="text-xs font-bold text-slate-200 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                        {String(s.value)}
                      </span>
                      <button
                        onClick={() => handleEditClick(s)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs"
                      >
                        Modify
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminPlatformSettingsPage;
