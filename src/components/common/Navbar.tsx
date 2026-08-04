import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sprout, Menu, X, ArrowRight, User as UserIcon, LogOut, CheckCircle2 } from 'lucide-react';

import { Button } from './Button';
import { useAuth } from '../../context/AuthContext';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-700">
            <a href="#how-it-works" className="hover:text-agri-primary transition-colors">
              How It Works
            </a>
            <a href="#ai-matching" className="hover:text-agri-primary transition-colors flex items-center gap-1">
              <span>AgriMatch AI</span>
              <span className="bg-emerald-100 text-agri-dark text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                PRO
              </span>
            </a>
            <a href="#worker-directory" className="hover:text-agri-primary transition-colors">
              Find Labor
            </a>
            <a href="#categories" className="hover:text-agri-primary transition-colors">
              Farm Services
            </a>
          </div>

          <div className="hidden md:flex items-center space-x-3">
            {isAuthenticated && user ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 px-3 py-1.5 rounded-2xl bg-slate-100 border border-slate-200 text-xs">
                  <UserIcon className="w-4 h-4 text-agri-primary" />
                  <span className="font-bold text-agri-text">{user.fullName}</span>
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
                    Sign In
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
          <a
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-medium text-slate-700 hover:text-agri-primary"
          >
            How It Works
          </a>
          <a
            href="#ai-matching"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-medium text-slate-700 hover:text-agri-primary"
          >
            AgriMatch AI
          </a>
          <a
            href="#worker-directory"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-medium text-slate-700 hover:text-agri-primary"
          >
            Find Labor
          </a>
          <a
            href="#categories"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-medium text-slate-700 hover:text-agri-primary"
          >
            Farm Services
          </a>

          <div className="pt-4 border-t border-slate-100 flex flex-col space-y-2.5">
            {isAuthenticated && user ? (
              <>
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 pb-2">
                  <UserIcon className="w-4 h-4 text-agri-primary" />
                  <span>{user.fullName} ({user.role})</span>
                </div>
                <Button variant="outline" size="sm" fullWidth onClick={handleLogout} leftIcon={<LogOut className="w-4 h-4" />}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="sm" fullWidth>
                    Sign In
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
