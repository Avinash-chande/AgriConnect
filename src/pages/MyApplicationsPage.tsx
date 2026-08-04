import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  Clock,
  MapPin,
  IndianRupee,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Undo2,
  ChevronDown,
  Loader2,
  Eye,
} from 'lucide-react';
import { JobApplication, ApplicationStatus } from '../types/application';
import { getMyApplications } from '../services/applicationService';
import { WithdrawApplicationModal } from '../components/applications/WithdrawApplicationModal';
import { ApplicationStatusTimeline } from '../components/applications/ApplicationStatusTimeline';
import { ApplicationDetailsModal } from '../components/applications/ApplicationDetailsModal';
import { CardSkeleton } from '../components/common/SkeletonLoader';
import { ErrorState } from '../components/common/ErrorState';

export const MyApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [expandedTimelineId, setExpandedTimelineId] = useState<string | null>(null);

  // Modal State
  const [selectedAppToWithdraw, setSelectedAppToWithdraw] = useState<JobApplication | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppForDetails, setSelectedAppForDetails] = useState<JobApplication | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const fetchApplications = async (statusFilter?: string) => {
    try {
      setLoading(true);
      setError(null);
      const filter = statusFilter && statusFilter !== 'ALL' ? { status: statusFilter } : {};
      const response = await getMyApplications(filter);
      setApplications(response.applications);
    } catch (err: any) {
      setError(err.message || 'Failed to load job applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications(selectedStatus);
  }, [selectedStatus]);

  const handleWithdrawClick = (app: JobApplication) => {
    setSelectedAppToWithdraw(app);
    setIsModalOpen(true);
  };

  const handleWithdrawSuccess = (updatedApp: JobApplication) => {
    setApplications((prev) =>
      prev.map((app) => (app._id === updatedApp._id ? updatedApp : app))
    );
  };

  const toggleTimeline = (appId: string) => {
    setExpandedTimelineId((prev) => (prev === appId ? null : appId));
  };

  const getStatusBadge = (status: ApplicationStatus) => {
    const map: Record<ApplicationStatus, { bg: string; text: string; border: string; label: string }> = {
      Pending:    { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   label: 'Under Review' },
      Shortlisted:{ bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    label: 'Shortlisted' },
      Accepted:   { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Accepted' },
      Hired:      { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300', label: 'Hired 🎉' },
      Withdrawn:  { bg: 'bg-slate-50',   text: 'text-slate-600',   border: 'border-slate-200',   label: 'Withdrawn' },
      Rejected:   { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',    label: 'Not Selected' },
      Cancelled:  { bg: 'bg-amber-50',   text: 'text-amber-800',   border: 'border-amber-300',   label: 'Cancelled' },
    };
    const s = map[status] ?? { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', label: status };
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${s.bg} ${s.text} ${s.border}`}>
        {s.label}
      </span>
    );
  };

  const filterTabs = [
    { key: 'ALL',         label: 'All' },
    { key: 'Pending',     label: 'Pending' },
    { key: 'Shortlisted', label: 'Shortlisted' },
    { key: 'Accepted',    label: 'Accepted' },
    { key: 'Hired',       label: 'Hired' },
    { key: 'Withdrawn',   label: 'Withdrawn' },
    { key: 'Rejected',    label: 'Rejected' },
    { key: 'Cancelled',   label: 'Cancelled' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── Page Header ─────────────────────────────── */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-7 h-7 text-emerald-600" />
                My Job Applications
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Track your active farm applications, interview updates, and status changes.
              </p>
            </div>

            {/* Stats Row */}
            {!loading && applications.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {[
                  { label: 'Total', count: applications.length, color: 'text-slate-700 bg-slate-100' },
                  { label: 'Active', count: applications.filter(a => ['Pending','Shortlisted','Accepted'].includes(a.status)).length, color: 'text-emerald-700 bg-emerald-50' },
                  { label: 'Hired', count: applications.filter(a => a.status === 'Hired').length, color: 'text-emerald-800 bg-emerald-100' },
                ].map(s => (
                  <span key={s.label} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${s.color}`}>
                    {s.count} {s.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="mt-5 flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200/60">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedStatus(tab.key)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  selectedStatus === tab.key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Content Section ──────────────────────────── */}
        {loading ? (
          <CardSkeleton count={4} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => fetchApplications(selectedStatus)} />
        ) : applications.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
            <Briefcase className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white">No applications found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              You haven't applied for any jobs matching this filter yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app, i) => {
              const canWithdraw =
                app.status !== 'Hired' &&
                app.status !== 'Withdrawn' &&
                app.status !== 'Rejected' &&
                app.status !== 'Cancelled';
              const isTimelineOpen = expandedTimelineId === app._id;

              return (
                <motion.div
                  key={app._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow overflow-hidden"
                >
                  {/* Card Body */}
                  <div className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      {/* Job Details */}
                      <div className="flex-1 space-y-2.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {getStatusBadge(app.status)}
                          <span className="text-xs text-slate-400 font-medium">
                            Applied{' '}
                            {new Date(app.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-slate-900 truncate">
                          {app.job?.title || 'Job Posting'}
                        </h3>

                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600">
                          {app.farmer?.name && (
                            <span className="font-medium text-slate-700">
                              Farmer: {app.farmer.name}
                            </span>
                          )}
                          {app.job?.jobAddress?.district && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              {app.job.jobAddress.district}, {app.job.jobAddress.state}
                            </span>
                          )}
                          {app.expectedDailyWage && (
                            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                              <IndianRupee className="w-3.5 h-3.5" />
                              {app.expectedDailyWage} / day
                            </span>
                          )}
                        </div>

                        {app.coverLetter && (
                          <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 line-clamp-2">
                            <span className="font-semibold text-slate-700">Cover Letter: </span>
                            "{app.coverLetter}"
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 shrink-0">
                        {canWithdraw && (
                          <button
                            type="button"
                            onClick={() => handleWithdrawClick(app)}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 transition-colors"
                          >
                            <Undo2 className="w-3.5 h-3.5" />
                            Withdraw
                          </button>
                        )}
                        {app.status === 'Hired' && (
                          <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Hired
                          </span>
                        )}
                        {app.status === 'Rejected' && (
                          <span className="text-xs font-medium text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" />
                            Rejected
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ── Timeline & Details Toggle Button ── */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => toggleTimeline(app._id)}
                        aria-expanded={isTimelineOpen}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
                          isTimelineOpen
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {isTimelineOpen ? 'Hide Status Timeline' : 'View Status Timeline'}
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-300 ${
                            isTimelineOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAppForDetails(app);
                          setIsDetailsModalOpen(true);
                        }}
                        className="px-4 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1 transition-colors"
                      >
                        Full Details →
                      </button>
                    </div>
                  </div>

                  {/* ── Collapsible Timeline Panel ── */}
                  <AnimatePresence initial={false}>
                    {isTimelineOpen && (
                      <motion.div
                        key="timeline"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-6">
                          <div className="h-px bg-slate-100 mb-4" />
                          <ApplicationStatusTimeline application={app} compact={false} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Application Details Modal */}
      <ApplicationDetailsModal
        application={selectedAppForDetails}
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        isFarmerView={false}
        onWithdraw={(app) => {
          setSelectedAppToWithdraw(app);
          setIsModalOpen(true);
        }}
      />

      {/* Withdraw Modal */}
      <WithdrawApplicationModal
        application={selectedAppToWithdraw}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleWithdrawSuccess}
      />
    </div>
  );
};

export default MyApplicationsPage;
