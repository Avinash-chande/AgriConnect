import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: React.JSX.Element;
  allowedRoles?: ('farmer' | 'worker' | 'admin' | 'Farmer' | 'Worker' | 'Admin' | string)[];
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

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRoleLower = (user.role || '').trim().toLowerCase();
    const hasRole = allowedRoles.some((r) => (r || '').trim().toLowerCase() === userRoleLower);
    if (!hasRole) {
      // If the authenticated user is an Admin, never redirect them to the farmer/worker home page "/"
      if (userRoleLower === 'admin') {
        return <Navigate to="/admin/dashboard" replace />;
      }
      // Non-admins attempting to access admin or other unauthorized pages go to "/"
      return <Navigate to="/" replace />;
    }
  }

  return children;
};
