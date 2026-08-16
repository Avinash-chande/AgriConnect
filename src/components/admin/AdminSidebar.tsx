import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileCheck,
  ShieldCheck,
  Award,
  IdCard,
  AlertTriangle,
  CreditCard,
  Crown,
  KeyRound,
  Sliders,
  History,
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface AdminSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const NAV_ITEMS = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/users', label: 'User Management', icon: Users },
  { path: '/admin/jobs', label: 'Job Moderation', icon: Briefcase },
  { path: '/admin/applications', label: 'Application Monitor', icon: FileCheck },
  { path: '/admin/trust', label: 'Trust Verification', icon: ShieldCheck },
  { path: '/admin/certificates', label: 'Certificate Verification', icon: Award },
  { path: '/admin/aadhaar-kyc', label: 'Aadhaar e-KYC', icon: IdCard },
  { path: '/admin/reports', label: 'Reports & Complaints', icon: AlertTriangle },
  { path: '/admin/payments', label: 'Payment Management', icon: CreditCard },
  { path: '/admin/premium', label: 'Premium Management', icon: Crown },
  { path: '/admin/roles', label: 'Roles & Permissions', icon: KeyRound },
  { path: '/admin/settings', label: 'Platform Settings', icon: Sliders },
  { path: '/admin/audit-logs', label: 'Audit Logs', icon: History },
  { path: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/admin/notifications', label: 'Notifications', icon: Bell },
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ collapsed, onToggleCollapse }) => {
  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 z-40 bg-white border-r border-slate-200 transition-all duration-300 flex flex-col shadow-soft-sm ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 bg-slate-50">
        {!collapsed ? (
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-agri-primary flex items-center justify-center text-white font-bold text-lg shadow-agri-glow">
              A
            </div>
            <div>
              <span className="font-heading font-bold text-slate-900 text-base tracking-wide">
                Agri<span className="text-agri-primary">Admin</span>
              </span>
              <span className="block text-[10px] text-slate-500 uppercase tracking-widest font-mono">
                Control Panel
              </span>
            </div>
          </div>
        ) : (
          <div className="w-10 h-10 mx-auto rounded-xl bg-agri-primary flex items-center justify-center text-white font-bold text-lg shadow-agri-glow">
            A
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="hidden md:flex p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-emerald-50 text-agri-primary border border-emerald-200 font-bold shadow-soft-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                } ${collapsed ? 'justify-center' : 'space-x-3'}`
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon size={20} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      {!collapsed && (
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/30 text-center">
          <p className="text-[11px] text-slate-500 font-mono">AgriConnect v1.0 • Phase 10</p>
        </div>
      )}
    </aside>
  );
};
