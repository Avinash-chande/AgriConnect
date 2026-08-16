import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { AdminSidebar, NAV_ITEMS } from './AdminSidebar';
import { useAuth } from '../../context/AuthContext';
import { Search, ShieldAlert, LogOut } from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  const currentNav = NAV_ITEMS.find((n) => location.pathname.startsWith(n.path)) || NAV_ITEMS[0];

  return (
    <div className="min-h-screen bg-agri-bg text-slate-800 font-sans flex">
      {/* Sidebar */}
      <AdminSidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-64'}`}>
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between shadow-soft-sm">
          {/* Left Title & Breadcrumbs */}
          <div className="flex items-center space-x-3">
            <h1 className="text-lg font-heading font-bold text-slate-900 tracking-wide">
              {currentNav.label}
            </h1>
            <span className="text-slate-300">/</span>
            <span className="text-xs text-slate-500 font-mono">AgriConnect Admin</span>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-4">
            {/* Search Input */}
            <div className="relative hidden sm:block w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search admin system..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-agri-primary"
              />
            </div>

            {/* System Status Pill */}
            <div className="hidden lg:flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-agri-primary text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-agri-primary animate-pulse"></span>
              <span>System Live</span>
            </div>

            {/* User Profile Dropdown */}
            <div className="flex items-center space-x-3 pl-2 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <span className="block text-xs font-semibold text-slate-900">{user?.fullName || user?.email}</span>
                <span className="block text-[10px] text-agri-primary font-mono font-medium uppercase">
                  {user?.role || 'Admin'}
                </span>
              </div>

              <button
                onClick={logout}
                className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-slate-100 transition-colors"
                title="Logout Admin Session"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Page Body Container */}
        <main className="flex-1 p-6 space-y-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
};
