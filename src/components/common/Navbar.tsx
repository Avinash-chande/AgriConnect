import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sprout, Menu, X, ArrowRight, User as UserIcon, LogOut, CheckCircle2, MessageSquare } from 'lucide-react';

import { Button } from './Button';
import { useAuth } from '../../context/AuthContext';
import { NotificationDropdown } from './NotificationDropdown';
import { checkChatEligibility } from '../../services/chatService';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: chatEligibility } = useQuery({
    queryKey: ['chatEligibility', user?._id || (user as any)?.id],
    queryFn: checkChatEligibility,
    enabled: !!isAuthenticated && !!user,
    staleTime: 10000,
  });

  const canChat = chatEligibility?.canChat ?? false;

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActive = (pathKey: 'home' | 'jobs' | 'about' | 'profile' | 'dashboard' | 'chat') => {
    const currentPath = location.pathname;
    switch (pathKey) {
      case 'home':
        return currentPath === '/';
      case 'jobs':
        return (
          currentPath === '/jobs' ||
          currentPath.startsWith('/jobs/') ||
          currentPath === '/worker/feed' ||
          currentPath === '/nearby-jobs' ||
          currentPath === '/map-discovery'
        );
      case 'about':
        return currentPath === '/' && location.hash === '#how-it-works';
      case 'profile':
        return (
          currentPath === '/farmer/profile' ||
          currentPath === '/worker/profile' ||
          currentPath.startsWith('/profile/')
        );
      case 'dashboard':
        return (
          (currentPath.startsWith('/farmer/dashboard') ||
            currentPath.startsWith('/farmer/applications') ||
            currentPath.startsWith('/farmer/nearby') ||
            currentPath.startsWith('/farmer/worker-map') ||
            currentPath.startsWith('/worker/dashboard') ||
            currentPath.startsWith('/worker/applications') ||
            currentPath.startsWith('/saved-jobs') ||
            currentPath.startsWith('/my-applications') ||
            currentPath.startsWith('/worker/verification')) &&
          currentPath !== '/farmer/profile' &&
          currentPath !== '/worker/profile'
        );
      case 'chat':
        return (
          currentPath.startsWith('/chat') ||
          currentPath.startsWith('/farmer/chat') ||
          currentPath.startsWith('/worker/communication')
        );
      default:
        return false;
    }
  };

  return (
    <nav
      className={`
        fixed top-0 left-0 right-0 z-40 transition-all duration-300
        ${isScrolled 
          ? 'bg-white/90 backdrop-blur-md shadow-soft border-b border-agri-border py-3.5' 
          : 'bg-transparent py-5'
        }
      `}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          
          <Link to="/" className="flex items-center space-x-2.5 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-agri-primary to-agri-dark flex items-center justify-center text-white shadow-agri-glow transition-transform duration-300 group-hover:scale-105">
              <Sprout className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold font-heading tracking-tight text-agri-text">
                Agri<span className="text-agri-primary">Connect</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-600 tracking-wider uppercase -mt-1">
                AI Labor Exchange
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center space-x-8 text-sm font-medium">
            <Link
              to="/"
              className={`transition-colors py-1 ${
                isActive('home')
                  ? 'text-agri-primary font-bold border-b-2 border-agri-primary'
                  : 'text-slate-700 hover:text-agri-primary font-medium'
              }`}
            >
              Home
            </Link>

            <Link
              to="/jobs"
              className={`transition-colors py-1 ${
                isActive('jobs')
                  ? 'text-agri-primary font-bold border-b-2 border-agri-primary'
                  : 'text-slate-700 hover:text-agri-primary font-medium'
              }`}
            >
              Jobs
            </Link>

            <a
              href="/#how-it-works"
              className={`transition-colors py-1 ${
                isActive('about')
                  ? 'text-agri-primary font-bold border-b-2 border-agri-primary'
                  : 'text-slate-700 hover:text-agri-primary font-medium'
              }`}
            >
              About
            </a>

            {isAuthenticated && user && (
              <>
                <Link
                  to={user.role.toLowerCase() === 'farmer' ? '/farmer/profile' : '/worker/profile'}
                  className={`transition-colors py-1 ${
                    isActive('profile')
                      ? 'text-agri-primary font-bold border-b-2 border-agri-primary'
                      : 'text-slate-700 hover:text-agri-primary font-medium'
                  }`}
                >
                  Profile
                </Link>

                {user.role.toLowerCase() === 'farmer' ? (
                  <Link
                    to="/farmer/dashboard"
                    className={`transition-colors py-1 ${
                      isActive('dashboard')
                        ? 'text-agri-primary font-bold border-b-2 border-agri-primary'
                        : 'text-slate-700 hover:text-agri-primary font-medium'
                    }`}
                  >
                    Farmer Hub
                  </Link>
                ) : user.role.toLowerCase() === 'worker' ? (
                  <Link
                    to="/worker/dashboard"
                    className={`transition-colors py-1 ${
                      isActive('dashboard')
                        ? 'text-agri-primary font-bold border-b-2 border-agri-primary'
                        : 'text-slate-700 hover:text-agri-primary font-medium'
                    }`}
                  >
                    Worker Hub
                  </Link>
                ) : null}

                {canChat && (
                  <Link
                    to={user.role.toLowerCase() === 'farmer' ? '/farmer/chat-dashboard' : '/chat'}
                    className={`transition-colors py-1 ${
                      isActive('chat')
                        ? 'text-agri-primary font-bold border-b-2 border-agri-primary'
                        : 'text-slate-700 hover:text-agri-primary font-medium'
                    }`}
                  >
                    Chat
                  </Link>
                )}
              </>
            )}
          </div>

          <div className="hidden md:flex items-center space-x-3">
            {isAuthenticated && user ? (
              <div className="flex items-center space-x-3">
                <NotificationDropdown />

                <div className="flex items-center space-x-2 px-3 py-1.5 rounded-2xl bg-slate-100 border border-slate-200 text-xs">
                  <UserIcon className="w-4 h-4 text-agri-primary" />
                  <span className="font-bold text-agri-text">{user.fullName || user.email}</span>
                  <span className="text-[10px] uppercase font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border">
                    {user.role}
                  </span>
                  {user.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-agri-primary" />}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  leftIcon={<LogOut className="w-3.5 h-3.5" />}
                >
                  Logout
                </Button>
              </div>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="font-semibold text-agri-text">
                    Login
                  </Button>
                </Link>

                <Link to="/register-farmer">
                  <Button 
                    variant="primary" 
                    size="sm" 
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                    className="shadow-agri-glow"
                  >
                    Post Farm Job
                  </Button>
                </Link>
              </>
            )}
          </div>

          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-agri-border px-4 pt-2 pb-6 space-y-3 shadow-soft-lg animate-in slide-in-from-top-2">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className={`block py-2 text-sm transition-colors ${
              isActive('home')
                ? 'font-bold text-agri-primary bg-emerald-50 px-3 rounded-lg border border-emerald-200'
                : 'font-medium text-slate-700 hover:text-agri-primary'
            }`}
          >
            Home
          </Link>
          <Link
            to="/jobs"
            onClick={() => setMobileMenuOpen(false)}
            className={`block py-2 text-sm transition-colors ${
              isActive('jobs')
                ? 'font-bold text-agri-primary bg-emerald-50 px-3 rounded-lg border border-emerald-200'
                : 'font-medium text-slate-700 hover:text-agri-primary'
            }`}
          >
            Jobs
          </Link>
          <a
            href="/#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className={`block py-2 text-sm transition-colors ${
              isActive('about')
                ? 'font-bold text-agri-primary bg-emerald-50 px-3 rounded-lg border border-emerald-200'
                : 'font-medium text-slate-700 hover:text-agri-primary'
            }`}
          >
            About
          </a>

          {isAuthenticated && user && (
            <>
              <Link
                to={user.role.toLowerCase() === 'farmer' ? '/farmer/profile' : '/worker/profile'}
                onClick={() => setMobileMenuOpen(false)}
                className={`block py-2 text-sm transition-colors ${
                  isActive('profile')
                    ? 'font-bold text-agri-primary bg-emerald-50 px-3 rounded-lg border border-emerald-200'
                    : 'font-medium text-slate-700 hover:text-agri-primary'
                }`}
              >
                Profile
              </Link>
              {user.role.toLowerCase() === 'farmer' ? (
                <Link
                  to="/farmer/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block py-2 text-sm transition-colors ${
                    isActive('dashboard')
                      ? 'font-bold text-agri-primary bg-emerald-50 px-3 rounded-lg border border-emerald-200'
                      : 'font-medium text-slate-700 hover:text-agri-primary'
                  }`}
                >
                  Farmer Hub
                </Link>
              ) : user.role.toLowerCase() === 'worker' ? (
                <Link
                  to="/worker/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block py-2 text-sm transition-colors ${
                    isActive('dashboard')
                      ? 'font-bold text-agri-primary bg-emerald-50 px-3 rounded-lg border border-emerald-200'
                      : 'font-medium text-slate-700 hover:text-agri-primary'
                  }`}
                >
                  Worker Hub
                </Link>
              ) : null}

              {canChat && (
                <Link
                  to={user.role.toLowerCase() === 'farmer' ? '/farmer/chat-dashboard' : '/chat'}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block py-2 text-sm transition-colors ${
                    isActive('chat')
                      ? 'font-bold text-agri-primary bg-emerald-50 px-3 rounded-lg border border-emerald-200'
                      : 'font-medium text-slate-700 hover:text-agri-primary'
                  }`}
                >
                  Chat
                </Link>
              )}
            </>
          )}

          <div className="pt-4 border-t border-slate-100 flex flex-col space-y-2.5">
            {isAuthenticated && user ? (
              <>
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 pb-2">
                  <UserIcon className="w-4 h-4 text-agri-primary" />
                  <span>{user.fullName || user.email} ({user.role})</span>
                </div>
                <Button variant="outline" size="sm" fullWidth onClick={handleLogout} leftIcon={<LogOut className="w-4 h-4" />}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="sm" fullWidth>
                    Login
                  </Button>
                </Link>
                <Link to="/register-farmer" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="sm" fullWidth>
                    Post Farm Job
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
