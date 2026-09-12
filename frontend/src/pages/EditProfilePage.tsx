import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FarmerProfilePage } from './FarmerProfilePage';
import { WorkerProfilePage } from './WorkerProfilePage';
import type { ToastMessage } from '../types';

interface EditProfilePageProps {
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
}

export const EditProfilePage: React.FC<EditProfilePageProps> = ({ addToast }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-agri-bg">
        <div className="w-10 h-10 border-4 border-agri-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const roleLower = user.role.toLowerCase();
  if (roleLower === 'farmer') {
    return <FarmerProfilePage addToast={addToast} />;
  } else if (roleLower === 'worker') {
    return <WorkerProfilePage addToast={addToast} />;
  }

  return <Navigate to="/" replace />;
};
