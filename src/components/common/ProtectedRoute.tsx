import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: React.JSX.Element;
  allowedRoles?: ('farmer' | 'worker' | 'admin' | 'Farmer' | 'Worker' | 'Admin')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-agri-bg">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-agri-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-500 font-heading">
            Verifying AgriConnect Session...
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user) {
    const userRoleLower = user.role.toLowerCase();
    const hasRole = allowedRoles.some((r) => r.toLowerCase() === userRoleLower);
    if (!hasRole) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};
