import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Award,
  CheckCircle2,
  XCircle,
  Star,
  Briefcase,
  Smartphone,
  Mail,
  UserCheck,
  Lock,
  IdCard,
  ChevronRight,
  Info,
  Sparkles,
} from 'lucide-react';
import type { TrustProfileResponse, AadhaarKycStatusResponse } from '../../services/verificationService';
import { AadhaarKycUploadModal } from './AadhaarKycUploadModal';

interface Props {
  trustProfile?: TrustProfileResponse | null;
  kycStatus?: AadhaarKycStatusResponse | null;
  onRefresh?: () => void;
}

export const WorkerVerificationProfileCard: React.FC<Props> = ({
  trustProfile,
  kycStatus,
  onRefresh,
}) => {
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);

  const trustScore = trustProfile?.trustScore || 0;
  const trustLevel = trustProfile?.trustLevel || 'BASIC';

  const isIdentityVerified = kycStatus?.status === 'VERIFIED' || kycStatus?.identityVerified;
  const kycStatusText = kycStatus?.status || 'NOT_STARTED';

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Visual Disclaimer Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center space-x-2">
          <Info size={16} className="text-amber-400 shrink-0" />
          <span>
            AgriConnect maintains <strong>TWO separate verification systems</strong>: Trust & Skills (System A) and Identity e-KYC (System B).
          </span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION 1: TRUST & SKILLS (System A) */}
      {/* ============================================================ */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-emerald-500/20 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 overflow-hidden"
      >
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none" />

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Award size={24} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-heading font-bold text-white">Trust & Skills Verification</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[10px] uppercase font-semibold">
                  System A
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluates platform activity, mobile/email validation, skill certificates, and worker performance.
              </p>
            </div>
          </div>

          {/* Trust Score Hero Pill */}
          <div className="flex items-center space-x-3 bg-slate-950/80 border border-emerald-500/30 rounded-2xl px-5 py-3 shadow-lg">
            <div className="text-right">
              <p className="text-[10px] uppercase font-mono text-slate-400">Trust Level</p>
              <p className="text-xs font-bold font-mono text-emerald-400">{trustLevel}</p>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div className="text-center">
              <span className="text-2xl font-extrabold font-heading text-white">{trustScore}</span>
              <span className="text-xs text-slate-400 font-mono">/100</span>
            </div>
          </div>
        </div>

        {/* Core Signals Checklist Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Mobile Verified */}
          <div className={`p-3.5 rounded-2xl border flex items-center space-x-3 ${
            trustProfile?.mobileVerified
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-slate-950/50 border-slate-800 text-slate-500'
          }`}>
            <Smartphone size={18} className={trustProfile?.mobileVerified ? 'text-emerald-400' : 'text-slate-600'} />
            <div>
              <p className="font-semibold text-white">Mobile</p>
              <p className="text-[11px] font-mono">{trustProfile?.mobileVerified ? '✓ Verified' : 'Unverified'}</p>
            </div>
          </div>

          {/* Email Verified */}
          <div className={`p-3.5 rounded-2xl border flex items-center space-x-3 ${
            trustProfile?.emailVerified
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-slate-950/50 border-slate-800 text-slate-500'
          }`}>
            <Mail size={18} className={trustProfile?.emailVerified ? 'text-emerald-400' : 'text-slate-600'} />
            <div>
              <p className="font-semibold text-white">Email</p>
              <p className="text-[11px] font-mono">{trustProfile?.emailVerified ? '✓ Verified' : 'Unverified'}</p>
            </div>
          </div>

          {/* Profile Complete */}
          <div className={`p-3.5 rounded-2xl border flex items-center space-x-3 ${
            trustProfile?.profileCompleted
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-slate-950/50 border-slate-800 text-slate-500'
          }`}>
            <UserCheck size={18} className={trustProfile?.profileCompleted ? 'text-emerald-400' : 'text-slate-600'} />
            <div>
              <p className="font-semibold text-white">Profile Complete</p>
              <p className="text-[11px] font-mono">{trustProfile?.profileCompleted ? '✓ Completed' : 'Incomplete'}</p>
            </div>
          </div>

          {/* Skill Verified */}
          <div className={`p-3.5 rounded-2xl border flex items-center space-x-3 ${
            trustProfile?.certificateVerified
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : 'bg-slate-950/50 border-slate-800 text-slate-500'
          }`}>
            <Award size={18} className={trustProfile?.certificateVerified ? 'text-amber-400' : 'text-slate-600'} />
            <div>
              <p className="font-semibold text-white">Skill Verified</p>
              <p className="text-[11px] font-mono">{trustProfile?.certificateVerified ? '✓ Verified' : 'No Certificate'}</p>
            </div>
          </div>
        </div>

        {/* Work Metrics Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80 text-xs">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Briefcase size={18} />
            </div>
            <div>
              <p className="text-slate-400 font-mono text-[10px]">Completed Jobs</p>
              <p className="text-sm font-bold text-white font-mono">{trustProfile?.completedJobs || 0} Jobs</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Star size={18} />
            </div>
            <div>
              <p className="text-slate-400 font-mono text-[10px]">Farmer Rating</p>
              <p className="text-sm font-bold text-white font-mono">⭐ {(trustProfile?.averageRating || 0).toFixed(1)} / 5.0</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="text-slate-400 font-mono text-[10px]">Verified Experience</p>
              <p className="text-sm font-bold text-emerald-400 font-mono">
                {trustProfile?.verifiedExperience ? '✓ Verified' : 'Unverified'}
              </p>
            </div>
          </div>
        </div>

        {/* Active System A Badges */}
        <div className="space-y-2">
          <p className="text-xs font-mono uppercase text-slate-400">Earned System A Trust Badges:</p>
          {trustProfile?.badges && trustProfile.badges.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {trustProfile.badges.map((b) => (
                <div
                  key={b._id}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium"
                >
                  <ShieldCheck size={14} className="text-emerald-400" />
                  <span>🛡️ {b.title || b.type}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">Complete profile actions, submit skill certificates, or complete farm jobs to earn trust badges.</p>
          )}
        </div>
      </motion.div>

      {/* ============================================================ */}
      {/* SECTION 2: IDENTITY VERIFICATION (System B) */}
      {/* ============================================================ */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative bg-gradient-to-br from-slate-900 via-slate-900/90 to-blue-950/40 border border-blue-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 overflow-hidden"
      >
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-3xl rounded-full pointer-events-none" />

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <IdCard size={24} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-heading font-bold text-white">Identity Verification</h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono text-[10px] uppercase font-semibold">
                  System B — Aadhaar e-KYC
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Official UIDAI Paperless Offline e-KYC digital signature verification. Completely isolated from System A Trust Score.
              </p>
            </div>
          </div>

          {/* Identity Verified Badge Pill */}
          <div>
            {isIdentityVerified ? (
              <div className="flex items-center space-x-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-2xl px-4 py-2 shadow-lg font-bold text-xs font-mono">
                <IdCard size={18} className="text-emerald-400" />
                <span>🪪 Identity Verified</span>
              </div>
            ) : (
              <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 border border-slate-700 font-mono text-xs">
                Status: {kycStatusText.replace(/_/g, ' ')}
              </span>
            )}
          </div>
        </div>

        {/* Status Content */}
        {isIdentityVerified ? (
          <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl text-xs space-y-2 text-emerald-300">
            <div className="flex items-center space-x-2 font-semibold text-emerald-200">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span>Official UIDAI Offline e-KYC Signature Verified</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Your official identity signature match was verified.
              {kycStatus?.referenceId && (
                <span className="block font-mono text-slate-400 mt-1">Masked Ref ID: {kycStatus.referenceId}</span>
              )}
            </p>
          </div>
        ) : (
          <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl text-xs space-y-3">
            <div className="space-y-1">
              <p className="font-semibold text-white">Get Official "Identity Verified" Status</p>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Upload your official UIDAI Offline e-KYC ZIP file to verify your identity.
                We perform in-memory digital signature validation with <strong>zero storage of raw XML, Aadhaar numbers, OTPs, or biometrics</strong>.
              </p>
            </div>

            <button
              onClick={() => setIsKycModalOpen(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-blue-500/20 flex items-center space-x-2 transition-all font-mono text-xs"
            >
              <IdCard size={16} />
              <span>Upload Aadhaar Offline e-KYC ZIP</span>
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Compliance Footer */}
        <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 text-[11px] text-slate-400 flex items-center space-x-2">
          <Lock size={14} className="text-blue-400 shrink-0" />
          <span>
            <strong>Data Minimization Compliance</strong>: No Aadhaar numbers, Share Codes, OTPs, or biometrics are displayed or retained.
          </span>
        </div>
      </motion.div>

      {/* Aadhaar Upload Modal */}
      <AadhaarKycUploadModal
        isOpen={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
        onSuccess={() => {
          if (onRefresh) onRefresh();
        }}
      />
    </div>
  );
};
