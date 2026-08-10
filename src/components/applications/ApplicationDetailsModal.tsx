import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  Briefcase,
  MapPin,
  Calendar,
  IndianRupee,
  Phone,
  Mail,
  Star,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  LogOut,
  Ban,
  Building,
  Award,
} from 'lucide-react';
import { ApplicationStatusTimeline } from './ApplicationStatusTimeline';
import type { JobApplication } from '../../types/application';

interface ApplicationDetailsModalProps {
  application: JobApplication | null;
  isOpen: boolean;
  onClose: () => void;
  isFarmerView?: boolean;
  onAccept?: (app: JobApplication) => void;
  onReject?: (app: JobApplication) => void;
  onShortlist?: (app: JobApplication) => void;
  onCancelHiring?: (app: JobApplication) => void;
  onWithdraw?: (app: JobApplication) => void;
}

const fmtDate = (d?: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const ApplicationDetailsModal: React.FC<ApplicationDetailsModalProps> = ({
  application,
  isOpen,
  onClose,
  isFarmerView = false,
  onAccept,
  onReject,
  onShortlist,
  onCancelHiring,
  onWithdraw,
}) => {
  if (!isOpen || !application) return null;

  const job = (application.job as any) || {};
  const worker = (application.worker as any) || {};
  const farmer = (application.farmer as any) || {};
  const workerProfile = worker.workerProfile || {};

  const canWithdraw = !isFarmerView && ['Pending', 'Shortlisted', 'Accepted'].includes(application.status);
  const canCancelHiring = isFarmerView && ['Accepted', 'Hired'].includes(application.status);
  const canManageCandidate = isFarmerView && !['Accepted', 'Hired', 'Withdrawn', 'Cancelled'].includes(application.status);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden z-10 my-8"
        >
          {/* Top Banner Header */}
          <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold shadow-md">
                {isFarmerView ? (worker.name?.charAt(0) || 'W') : (farmer.name?.charAt(0) || 'F')}
              </div>
              <div>
                <h2 className="text-base font-bold leading-tight truncate max-w-md">
                  {job.title || 'Job Application Details'}
                </h2>
                <p className="text-xs text-slate-300">
                  Applied on {fmtDate(application.createdAt)}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">

            {/* 1. Status Timeline Widget */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Application Progress</p>
              <ApplicationStatusTimeline application={application} compact={false} />
            </div>

            {/* 2. Main Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Applicant / Candidate Info with System A & B Verification Breakdown */}
              <div className="bg-white dark:bg-slate-800/60 rounded-2xl p-5 border border-slate-100 dark:border-slate-700/60 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                    <User className="w-4 h-4" /> Candidate & Verification Profile
                  </p>

                  {/* System B Identity Badge */}
                  {worker.identityVerified ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center gap-1 font-mono">
                      <span>🪪</span> Identity Verified
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-400 font-mono">
                      Identity Not Verified
                    </span>
                  )}
                </div>

                {/* Profile Header */}
                <div className="flex items-center gap-3">
                  {worker.profileImage ? (
                    <img
                      src={worker.profileImage}
                      alt={worker.name}
                      className="w-12 h-12 rounded-2xl object-cover border-2 border-emerald-500/30 shadow-md"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                      {worker.name?.charAt(0) || 'W'}
                    </div>
                  )}

                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      {worker.name || 'Anonymous Worker'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {workerProfile.title || 'Agricultural Worker'}
                    </p>
                  </div>
                </div>

                {/* System A Trust & Skills Summary Bar */}
                {worker.trustVerificationId || worker.trustProfile ? (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                        {worker.trustVerificationId?.trustScore || worker.trustProfile?.trustScore || 0}/100 Trust Score
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                        🟢 {worker.trustVerificationId?.trustLevel || worker.trustProfile?.trustLevel || 'BASIC'} WORKER
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-600 dark:text-slate-300 pt-1">
                      <div className="flex items-center gap-1">
                        <span>⭐</span>
                        <span>{(worker.trustVerificationId?.averageRating || workerProfile.rating || 0).toFixed(1)} / 5.0 Rating</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>💼</span>
                        <span>{worker.trustVerificationId?.completedJobs || workerProfile.completedJobs || 0} Jobs Completed</span>
                      </div>
                      {(worker.trustVerificationId?.certificateVerified || workerProfile.certificateVerified) && (
                        <div className="col-span-2 flex items-center gap-1 text-amber-500">
                          <span>🎓</span>
                          <span>Skill Verified</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  {worker.mobile && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{worker.mobile}</span>
                    </div>
                  )}
                  {worker.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{worker.email}</span>
                    </div>
                  )}
                  {(workerProfile.experience !== undefined || workerProfile.experienceYears !== undefined) && (
                    <div className="flex items-center gap-2">
                      <Award className="w-3.5 h-3.5 text-slate-400" />
                      <span>{workerProfile.experience || workerProfile.experienceYears || 0} Years Experience</span>
                    </div>
                  )}
                </div>

                {workerProfile.skills?.length > 0 && (
                  <div className="pt-1">
                    <p className="text-[11px] font-semibold text-slate-400 mb-1.5 font-mono">Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {workerProfile.skills.map((s: string) => (
                        <span key={s} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Job & Terms Info */}
              <div className="bg-white dark:bg-slate-800/60 rounded-2xl p-5 border border-slate-100 dark:border-slate-700/60 space-y-3">
                <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4" /> Job Terms & Pay
                </p>

                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {job.title || 'Farm Job'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Category: {job.category || 'General Agriculture'}
                  </p>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  {job.jobAddress?.district && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{job.jobAddress.district}, {job.jobAddress.state}</span>
                    </div>
                  )}
                  {application.expectedDailyWage && (
                    <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-400">
                      <IndianRupee className="w-3.5 h-3.5" />
                      <span>Expected: ₹{application.expectedDailyWage}/day</span>
                    </div>
                  )}
                  {application.expectedJoiningDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Expected Joining: {fmtDate(application.expectedJoiningDate)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Cover Letter */}
            {application.coverLetter && (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <FileText className="w-4 h-4" /> Cover Letter / Proposal
                </p>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {application.coverLetter}
                </p>
              </div>
            )}

            {/* 4. Farmer Notes / Feedback */}
            {application.farmerFeedback && (
              <div className="bg-amber-50/60 dark:bg-amber-950/30 rounded-2xl p-5 border border-amber-200/60 dark:border-amber-800/50">
                <p className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-widest mb-1">
                  Farmer Feedback
                </p>
                <p className="text-xs text-amber-900 dark:text-amber-200 italic">
                  "{application.farmerFeedback}"
                </p>
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Close
            </button>

            <div className="flex items-center gap-2 flex-wrap">
              {canWithdraw && onWithdraw && (
                <button
                  onClick={() => { onWithdraw(application); onClose(); }}
                  className="px-4 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" /> Withdraw Application
                </button>
              )}

              {canCancelHiring && onCancelHiring && (
                <button
                  onClick={() => { onCancelHiring(application); onClose(); }}
                  className="px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Ban className="w-3.5 h-3.5" /> Cancel Hiring
                </button>
              )}

              {canManageCandidate && (
                <>
                  {onShortlist && (
                    <button
                      onClick={() => { onShortlist(application); onClose(); }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                        application.shortlisted
                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                          : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                      }`}
                    >
                      <Star className="w-3.5 h-3.5 fill-current" />
                      {application.shortlisted ? 'Shortlisted' : 'Shortlist'}
                    </button>
                  )}

                  {onReject && (
                    <button
                      onClick={() => { onReject(application); onClose(); }}
                      className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  )}

                  {onAccept && (
                    <button
                      onClick={() => { onAccept(application); onClose(); }}
                      className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Accept Candidate
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
