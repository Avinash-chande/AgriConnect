import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Search,
  Star,
  CheckCircle,
  XCircle,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  AlertCircle,
  ChevronDown,
  Sparkles,
  Eye,
} from 'lucide-react';
import {
  getFarmerApplications,
  toggleShortlistApplication,
  acceptApplication,
  rejectApplication,
} from '../services/applicationService';
import type { JobApplication, ApplicationStatus } from "../types/application";
import { ApplicationStatusTimeline } from '../components/applications/ApplicationStatusTimeline';
import { ApplicationDetailsModal } from '../components/applications/ApplicationDetailsModal';
import { CardSkeleton } from '../components/common/SkeletonLoader';
import { ErrorState } from '../components/common/ErrorState';

export const FarmerApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    shortlisted: 0,
    hired: 0,
    rejected: 0,
    withdrawn: 0,
  });

  // Action Modals State
  const [acceptModalApp, setAcceptModalApp] = useState<JobApplication | null>(null);
  const [rejectModalApp, setRejectModalApp] = useState<JobApplication | null>(null);
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [rejectOthers, setRejectOthers] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [expandedTimelineId, setExpandedTimelineId] = useState<string | null>(null);
  const [selectedAppForDetails, setSelectedAppForDetails] = useState<JobApplication | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);

  const toggleTimeline = (appId: string) =>
    setExpandedTimelineId((prev) => (prev === appId ? null : appId));

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await getFarmerApplications({
        status: selectedStatus as any,
        search: searchQuery || undefined,
        limit: 50,
      });
      setApplications(res.applications);
      if (res.statistics) {
        setStats(res.statistics);
      }
    } catch (err: any) {
      console.error('Error loading received applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchApplications();
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedStatus, searchQuery]);

  const handleToggleShortlist = async (appId: string) => {
    try {
      const res = await toggleShortlistApplication(appId);
      setApplications((prev) =>
        prev.map((app) =>
          app._id === appId
            ? {
                ...app,
                shortlisted: res.shortlisted,
                status: res.shortlisted
                  ? ('Shortlisted' as ApplicationStatus)
                  : ('Pending' as ApplicationStatus),
              }
            : app
        )
      );
      if (res.statistics) setStats(res.statistics);
    } catch (err: any) {
      console.error('Failed to toggle shortlist status:', err);
    }
  };

  const handleAcceptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptModalApp) return;

    try {
      setActionLoading(true);
      const res = await acceptApplication(acceptModalApp._id, {
        farmerFeedback: feedbackInput,
        rejectOthers,
      });
      setApplications((prev) =>
        prev.map((app) =>
          app._id === acceptModalApp._id
            ? { ...app, status: 'Accepted' as ApplicationStatus, farmerFeedback: feedbackInput }
            : rejectOthers && app.job?._id === acceptModalApp.job?._id && app.status === 'Pending'
            ? { ...app, status: 'Rejected' as ApplicationStatus }
            : app
        )
      );
      if (res.statistics) setStats(res.statistics);
      setAcceptModalApp(null);
      setFeedbackInput('');
      setRejectOthers(false);
    } catch (err: any) {
      console.error('Failed to accept application:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalApp) return;

    try {
      setActionLoading(true);
      const res = await rejectApplication(rejectModalApp._id, {
        reason: feedbackInput,
      });
      setApplications((prev) =>
        prev.map((app) =>
          app._id === rejectModalApp._id
            ? { ...app, status: 'Rejected' as ApplicationStatus, farmerFeedback: feedbackInput }
            : app
        )
      );
      if (res.statistics) setStats(res.statistics);
      setRejectModalApp(null);
      setFeedbackInput('');
    } catch (err: any) {
      console.error('Failed to reject application:', err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm mb-1">
              <Sparkles className="w-4 h-4" />
              Farmer Candidate Management
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Received Worker Applications
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Review candidates, shortlist profiles, and finalize hiring for your agricultural jobs.
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="text-center px-3 py-1">
              <span className="block text-xs font-semibold text-slate-400 uppercase">Total</span>
              <span className="text-lg font-bold text-slate-800">{stats.total}</span>
            </div>
            <div className="text-center px-3 py-1 border-l border-slate-200">
              <span className="block text-xs font-semibold text-amber-500 uppercase">Pending</span>
              <span className="text-lg font-bold text-amber-600">{stats.pending}</span>
            </div>
            <div className="text-center px-3 py-1 border-l border-slate-200">
              <span className="block text-xs font-semibold text-blue-500 uppercase font-medium">Shortlisted</span>
              <span className="text-lg font-bold text-blue-600">{stats.shortlisted}</span>
            </div>
            <div className="text-center px-3 py-1 border-l border-slate-200">
              <span className="block text-xs font-semibold text-emerald-500 uppercase">Hired</span>
              <span className="text-lg font-bold text-emerald-600">{stats.hired}</span>
            </div>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {['ALL', 'Pending', 'Shortlisted', 'Accepted', 'Rejected', 'Withdrawn'].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  selectedStatus === st
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {st === 'ALL' ? 'All Applicants' : st}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[280px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search worker or job title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
        </div>

        {/* Application Cards Grid */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent"></div>
            <p className="text-slate-500 text-sm mt-3 font-medium">Loading candidate applications...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 max-w-lg mx-auto shadow-sm">
            <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800">No applications found</h3>
            <p className="text-slate-500 text-sm mt-1">
              There are no received applications matching your current filter criteria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {applications.map((app) => (
              <div
                key={app._id}
                className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group"
              >
                {/* Shortlist Star Toggle */}
                <button
                  onClick={() => handleToggleShortlist(app._id)}
                  title={app.shortlisted ? 'Remove from Shortlist' : 'Add to Shortlist'}
                  className={`absolute top-5 right-5 p-2 rounded-full transition-all ${
                    app.shortlisted
                      ? 'bg-amber-50 text-amber-500 hover:bg-amber-100'
                      : 'bg-slate-100 text-slate-400 hover:text-amber-500 hover:bg-amber-50'
                  }`}
                >
                  <Star className={`w-5 h-5 ${app.shortlisted ? 'fill-amber-400 text-amber-400' : ''}`} />
                </button>

                <div>
                  {/* Job Badge */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg mb-4">
                    <Briefcase className="w-3.5 h-3.5" />
                    {app.job?.title || 'Job Posting'}
                  </div>

                  {/* Worker Information Header */}
                  <div className="flex items-start gap-3 mb-4">
                    {app.worker?.profileImage ? (
                      <img
                        src={app.worker.profileImage}
                        alt={app.worker.name}
                        className="w-12 h-12 rounded-2xl object-cover border-2 border-emerald-500/20 shadow-sm shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg border border-slate-200 shrink-0">
                        {app.worker?.name ? app.worker.name.charAt(0).toUpperCase() : 'W'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-base font-bold text-slate-900 leading-snug truncate">
                          {app.worker?.name || 'Worker Applicant'}
                        </h4>
                      </div>

                      {/* Verification Badges Row */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {/* System B Identity Verified */}
                        {app.worker?.identityVerified && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1 font-mono">
                            <span>🪪</span> Identity Verified
                          </span>
                        )}

                        {/* System A Trust Score Pill */}
                        {((app.worker as any)?.trustVerificationId || app.worker?.trustProfile) && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                            {(app.worker as any)?.trustVerificationId?.trustScore || app.worker?.trustProfile?.trustScore || 0}/100 Trust
                          </span>
                        )}

                        {/* System A Trust Level */}
                        {((app.worker as any)?.trustVerificationId?.trustLevel || app.worker?.trustProfile?.trustLevel) && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100/70 text-emerald-800 font-mono">
                            🟢 {(app.worker as any)?.trustVerificationId?.trustLevel || app.worker?.trustProfile?.trustLevel}
                          </span>
                        )}

                        {/* Skill Verified */}
                        {((app.worker as any)?.trustVerificationId?.certificateVerified || app.worker?.workerProfile?.certificateVerified) && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 font-mono">
                            🎓 Skill Verified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Trust & Work History Metrics Bar */}
                  <div className="space-y-2 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-700">
                      <div className="flex items-center gap-1">
                        <span>⭐</span>
                        <span>
                          {(
                            (app.worker as any)?.trustVerificationId?.averageRating ||
                            app.worker?.workerProfile?.rating ||
                            0
                          ).toFixed(1)} / 5.0 Rating
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>💼</span>
                        <span>
                          {(app.worker as any)?.trustVerificationId?.completedJobs ||
                            app.worker?.workerProfile?.completedJobs ||
                            0}{' '}
                          Jobs Completed
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200/60">
                      <span className="text-slate-400">Experience:</span>
                      <span className="font-semibold text-slate-700">
                        {app.worker?.workerProfile?.experience || app.worker?.workerProfile?.experienceYears || 0} Years
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span className="text-slate-400">Expected Wage:</span>
                      <span className="font-semibold text-emerald-600 font-mono">
                        ₹{app.expectedDailyWage || app.worker?.workerProfile?.dailyRate || 0}/day
                      </span>
                    </div>

                    {app.worker?.workerProfile?.skills && (
                      <div className="pt-1">
                        <span className="text-slate-400 block mb-1 text-[11px]">Skills:</span>
                        <div className="flex flex-wrap gap-1">
                          {app.worker.workerProfile.skills.map((sk: string, i: number) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-white border border-slate-200 text-slate-600 rounded text-[10px] font-medium"
                            >
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cover Letter Quote */}
                  {app.coverLetter && (
                    <p className="text-xs text-slate-600 italic bg-slate-50/70 p-3 rounded-xl border border-slate-100 mb-4 line-clamp-2">
                      "{app.coverLetter}"
                    </p>
                  )}
                </div>

                {/* Status Indicator & Action Buttons */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-slate-400">Status</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        app.status === 'Accepted' || app.status === 'Hired'
                          ? 'bg-emerald-100 text-emerald-700'
                          : app.status === 'Shortlisted'
                          ? 'bg-blue-100 text-blue-700'
                          : app.status === 'Rejected'
                          ? 'bg-rose-100 text-rose-700'
                          : app.status === 'Withdrawn'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  {app.status !== 'Accepted' && app.status !== 'Hired' && app.status !== 'Withdrawn' && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setAcceptModalApp(app);
                          setFeedbackInput('');
                        }}
                        className="w-full py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-all flex items-center justify-center gap-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Accept
                      </button>
                      <button
                        onClick={() => {
                          setRejectModalApp(app);
                          setFeedbackInput('');
                        }}
                        className="w-full py-2 bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-600 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1 border border-slate-200"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </div>
                  )}

                  {/* Timeline & Details Toggle */}
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => toggleTimeline(app._id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        expandedTimelineId === app._id
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {expandedTimelineId === app._id ? 'Hide Timeline' : 'View Timeline'}
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-300 ${
                          expandedTimelineId === app._id ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAppForDetails(app);
                        setIsDetailsModalOpen(true);
                      }}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all border border-slate-200"
                    >
                      Full Profile
                    </button>
                  </div>
                </div>

                {/* Collapsible Timeline */}
                <AnimatePresence initial={false}>
                  {expandedTimelineId === app._id && (
                    <motion.div
                      key="timeline"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 pt-2">
                        <div className="h-px bg-slate-100 mb-4" />
                        <ApplicationStatusTimeline application={app} compact />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Accept Application Modal */}
      {acceptModalApp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Accept Candidate</h3>
            <p className="text-xs text-slate-500 mb-4">
              Confirm hiring <strong>{acceptModalApp.worker?.name}</strong> for{' '}
              <strong>{acceptModalApp.job?.title}</strong>.
            </p>

            <form onSubmit={handleAcceptSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Note to Worker (Optional)
                </label>
                <textarea
                  rows={3}
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  placeholder="e.g. Reporting time is 7:00 AM at the farm main gate..."
                  className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rejectOthers"
                  checked={rejectOthers}
                  onChange={(e) => setRejectOthers(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="rejectOthers" className="text-xs text-slate-600">
                  Automatically reject all remaining pending applicants for this job
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAcceptModalApp(null)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50"
                >
                  {actionLoading ? 'Processing...' : 'Confirm Accept'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Application Modal */}
      {rejectModalApp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Reject Candidate</h3>
            <p className="text-xs text-slate-500 mb-4">
              Reject application from <strong>{rejectModalApp.worker?.name}</strong>.
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason / Feedback (Optional)
                </label>
                <textarea
                  rows={3}
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  placeholder="e.g. Position filled or experience requirement mismatch..."
                  className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalApp(null)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 transition-all disabled:opacity-50"
                >
                  {actionLoading ? 'Processing...' : 'Confirm Reject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Application Details Modal */}
      <ApplicationDetailsModal
        application={selectedAppForDetails}
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        isFarmerView={true}
        onAccept={(app) => {
          setAcceptModalApp(app);
          setFeedbackInput('');
        }}
        onReject={(app) => {
          setRejectModalApp(app);
          setFeedbackInput('');
        }}
        onShortlist={(app) => handleToggleShortlist(app._id)}
      />
    </div>
  );
};

export default FarmerApplicationsPage;
