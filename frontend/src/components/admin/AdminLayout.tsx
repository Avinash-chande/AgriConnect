import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AdminSidebar, NAV_ITEMS } from './AdminSidebar';
import { useAuth } from '../../context/AuthContext';
import { Search, LogOut, Menu } from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Find current navigation item
  const currentNav =
    NAV_ITEMS.find((item) => location.pathname === item.path) ||
    NAV_ITEMS.find((item) => location.pathname.startsWith(item.path)) ||
    NAV_ITEMS[0];

  // Logout handler
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Display user name
  const displayName =
    user?.fullName ||
    user?.name ||
    user?.email ||
    'Admin';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex">

      {/* =====================================================
          SIDEBAR
      ====================================================== */}
      <AdminSidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* =====================================================
          MAIN CONTENT AREA
      ====================================================== */}
      <div
        className={`flex-1 min-w-0 flex flex-col transition-all duration-300 ${
          collapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >

        {/* ===================================================
            TOP HEADER
        ==================================================== */}
        <header className="h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">

          {/* LEFT SIDE */}
          <div className="flex items-center space-x-3 min-w-0">

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
              title="Open Navigation"
              aria-label="Open Navigation"
            >
              <Menu size={20} />
            </button>

            {/* Page Title */}
            <h1 className="text-base sm:text-lg font-heading font-semibold text-white tracking-wide truncate">
              {currentNav?.label || 'Dashboard'}
            </h1>

            {/* Separator */}
            <span className="text-slate-600 hidden sm:inline">
              /
            </span>

            {/* Breadcrumb */}
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              AgriConnect Admin
            </span>
          </div>

          {/* RIGHT SIDE */}
          <div className="flex items-center space-x-3 sm:space-x-4">

            {/* =================================================
                SEARCH
            ================================================== */}
            <div className="relative hidden lg:block w-64">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                placeholder="Search admin system..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* =================================================
                SYSTEM STATUS
            ================================================== */}
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>System Live</span>
            </div>

            {/* =================================================
                USER PROFILE
            ================================================== */}
            <div className="flex items-center space-x-3 pl-3 border-l border-slate-800">

              {/* User Information */}
              <div className="text-right hidden sm:block">
                <span className="block text-xs font-semibold text-slate-200 max-w-[140px] truncate">
                  {displayName}
                </span>

                <span className="block text-[10px] text-emerald-400 font-mono font-medium uppercase">
                  {user?.role || 'Admin'}
                </span>
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-900 transition-colors"
                title="Logout Admin Session"
                aria-label="Logout Admin Session"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* ===================================================
            PAGE CONTENT
        ==================================================== */}
        <main className="flex-1 p-4 sm:p-6 space-y-6 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;