import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMyTrustProfileApi, getAadhaarKycStatusApi } from '../services/verificationService';
import { WorkerVerificationProfileCard } from '../components/verification/WorkerVerificationProfileCard';
import { ShieldCheck, Award } from 'lucide-react';

export const WorkerVerificationPage: React.FC = () => {
  const { data: profileData, isLoading: isProfileLoading, refetch: refetchProfile } = useQuery({
    queryKey: ['myTrustProfile'],
    queryFn: getMyTrustProfileApi,
  });

  const { data: kycData, isLoading: isKycLoading, refetch: refetchKyc } = useQuery({
    queryKey: ['myAadhaarKycStatus'],
    queryFn: getAadhaarKycStatusApi,
  });

  const handleRefresh = () => {
    refetchProfile();
    refetchKyc();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Page Title Header */}
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-extrabold text-white">
                Worker Verification Profile
              </h1>
              <p className="text-xs text-slate-400">
                View your AgriConnect Trust Score, Skill Verification, and Official Aadhaar e-KYC status.
              </p>
            </div>
          </div>
        </div>

        {/* Verification Card Component */}
        {isProfileLoading || isKycLoading ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 animate-pulse font-mono text-xs">
            Loading verification profile...
          </div>
        ) : (
          <WorkerVerificationProfileCard
            trustProfile={profileData?.data}
            kycStatus={kycData}
            onRefresh={handleRefresh}
          />
        )}
      </div>
    </div>
  );
};

export default WorkerVerificationPage;
