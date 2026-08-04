import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  User, MapPin, Edit3, ShieldCheck, Moon, Sun, Tractor, Briefcase, Award, Phone, Mail
} from 'lucide-react';
import { motion } from 'framer-motion';

import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { getMyProfileApi } from '../services/profileService';
import { ProfileCardSkeleton } from '../components/common/SkeletonLoader';
import { ErrorState } from '../components/common/ErrorState';
import { ProfileCompletionCard } from '../components/profile/ProfileCompletionCard';
import type { ToastMessage } from '../types';

interface ViewProfilePageProps {
  addToast?: (toast: Omit<ToastMessage, 'id'>) => void;
}

export const ViewProfilePage: React.FC<ViewProfilePageProps> = () => {
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [userData, setUserData] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [completionPercentage, setCompletionPercentage] = useState<number>(75);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getMyProfileApi();
      if (response.data) {
        setUserData(response.data.user);
        setProfileData(response.data.profile);
        setCompletionPercentage(response.data.completionPercentage || 75);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load profile data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const isFarmer = userData?.role?.toLowerCase() === 'farmer';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-agri-bg flex flex-col justify-between pt-24">
        <Navbar />
        <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full">
          <ProfileCardSkeleton />
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-agri-bg flex flex-col justify-between pt-24">
        <Navbar />
        <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full">
          <ErrorState message={error} onRetry={loadData} />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 flex flex-col justify-between pt-24 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-agri-bg text-agri-text'}`}>
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full">
        
        {/* Dark Mode Toggle Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold font-heading uppercase tracking-wider text-agri-primary">
              Personal Account Overview
            </span>
          </div>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold font-heading flex items-center space-x-2 transition-colors cursor-pointer ${
              darkMode ? 'bg-slate-900 border-slate-800 text-amber-300' : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
            <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>

        {/* Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-3xl border p-6 sm:p-10 text-left shadow-soft-lg mb-8 relative overflow-hidden ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-agri-border'
          }`}
        >
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6 text-center md:text-left">
              <div className="w-24 h-24 rounded-3xl overflow-hidden bg-emerald-100 text-agri-primary flex items-center justify-center border-2 border-agri-primary/30 shrink-0 shadow-md">
                {userData?.profileImage ? (
                  <img src={userData.profileImage} alt={userData.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12" />
                )}
              </div>

              <div className="space-y-1">
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-agri-dark border border-emerald-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-agri-primary" />
                  <span>{userData?.role} Account</span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold font-heading">
                  {userData?.name}
                </h1>

                <p className="text-xs sm:text-sm text-slate-500 flex items-center justify-center md:justify-start space-x-2">
                  {isFarmer ? <Tractor className="w-4 h-4 text-agri-primary" /> : <Briefcase className="w-4 h-4 text-agri-primary" />}
                  <span>
                    {isFarmer
                      ? (profileData?.farmName || 'Organic Wheat Estate')
                      : (profileData?.title || 'Agricultural Specialist')}
                  </span>
                </p>

                <p className="text-xs text-slate-400 flex items-center justify-center md:justify-start space-x-3 pt-1">
                  <span className="flex items-center space-x-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{userData?.mobile}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{userData?.email}</span>
                  </span>
                </p>
              </div>
            </div>

            <Link
              to="/edit-profile"
              className="px-5 py-2.5 rounded-2xl bg-agri-primary text-white font-bold font-heading text-xs hover:bg-agri-hover transition-colors shadow-agri-glow flex items-center space-x-2 shrink-0"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Profile</span>
            </Link>
          </div>
        </motion.div>

        {/* Completion Card */}
        <div className="mb-8">
          <ProfileCompletionCard percentage={completionPercentage} />
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          
          {/* Key Specifications */}
          <div className={`p-6 rounded-3xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-agri-border'} space-y-4`}>
            <h3 className="text-sm font-bold font-heading uppercase text-agri-primary flex items-center space-x-2">
              <Award className="w-4 h-4" />
              <span>{isFarmer ? 'Farm Details' : 'Skill Mastery'}</span>
            </h3>

            {isFarmer ? (
              <div className="space-y-2 text-xs text-slate-600">
                <p><strong>Farm Size:</strong> {profileData?.farmSize || 10} {profileData?.farmSizeUnit || 'Acres'}</p>
                <p><strong>Irrigation:</strong> {profileData?.irrigationType || 'Drip Irrigation'}</p>
                <p><strong>Primary Crops:</strong> {profileData?.cropTypes?.join(', ') || 'Wheat, Basmati Rice'}</p>
              </div>
            ) : (
              <div className="space-y-2 text-xs text-slate-600">
                <p><strong>Daily Wage:</strong> ₹{profileData?.expectedDailyWage || 650}/day</p>
                <p><strong>Experience:</strong> {profileData?.experience || 3} Years</p>
                <p><strong>Primary Skills:</strong> {profileData?.skills?.join(', ') || 'Combine Operator, Tractor Driver'}</p>
              </div>
            )}
          </div>

          {/* Location Details */}
          <div className={`p-6 rounded-3xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-agri-border'} space-y-4`}>
            <h3 className="text-sm font-bold font-heading uppercase text-agri-primary flex items-center space-x-2">
              <MapPin className="w-4 h-4" />
              <span>Registered Location</span>
            </h3>

            <div className="space-y-2 text-xs text-slate-600">
              <p><strong>District:</strong> {isFarmer ? profileData?.farmAddress?.district : profileData?.preferredDistrict || 'Amritsar'}</p>
              <p><strong>State:</strong> {isFarmer ? profileData?.farmAddress?.state : profileData?.preferredState || 'Punjab'}</p>
              <p><strong>Status:</strong> Active in Regional Labor Network</p>
            </div>
          </div>

        </div>

      </main>

      <Footer />
    </div>
  );
};
