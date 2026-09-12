import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  Clock,
  CheckCircle2,
  XCircle,
  LogOut,
  Bookmark,
  Star,
  User,
  MapPin,
  IndianRupee,
  TrendingUp,
  RefreshCw,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Eye,
  Activity,
  Loader2,
  AlertCircle,
  Calendar,
  Search,
  Zap,
  Award,
  Ban,
  Bell,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getMyApplications, withdrawApplication } from '../services/applicationService';
import { jobService } from '../services/jobService';
import { getMyProfileApi } from '../services/profileService';
import { ApplicationStatusTimeline } from '../components/applications/ApplicationStatusTimeline';
import { WithdrawApplicationModal } from '../components/applications/WithdrawApplicationModal';
import type { JobApplication, ApplicationStatus } from '../types/application';
import type { JobData } from '../services/jobService';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface WorkerStats {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
  withdrawn: number;
  hired: number;
  shortlisted: number;
  cancelled: number;
}

interface ProfileCompletion {
  pct: number;
  missing: string[];
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function fmtDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function computeStats(apps: JobApplication[]): WorkerStats {
  return apps.reduce(
    (acc, a) => {
      acc.total++;
      const s = a.status.toLowerCase() as keyof WorkerStats;
      if (s in acc) (acc as any)[s]++;
      return acc;
    },
    { total: 0, pending: 0, accepted: 0, rejected: 0, withdrawn: 0, hired: 0, shortlisted: 0, cancelled: 0 }
  );
}

function computeProfileCompletion(profile: any, user: any): ProfileCompletion {
  const wp = profile?.workerProfile || profile;
  const missing: string[] = [];
  if (!wp?.title) missing.push('Add a professional title');
  if (!wp?.bio || wp.bio.length < 30) missing.push('Write a short bio (30+ chars)');
  if (!wp?.skills?.length) missing.push('Add your skills');
  if (!wp?.experienceYears && wp?.experienceYears !== 0) missing.push('Enter years of experience');
  if (!wp?.dailyRate && !wp?.expectedDailyWage) missing.push('Set expected daily wage');
  if (!wp?.location && !wp?.preferredDistrict) missing.push('Set your preferred location');
  if (!wp?.availability) missing.push('Set availability status');
  if (!(user?.isVerified || user?.isPhoneVerified)) missing.push('Verify your phone/email');
  const total = 8;
  const pct = Math.round(((total - missing.length) / total) * 100);
  return { pct, missing };
}

// ─────────────────────────────────────────────────────────────
// Animated Count-Up
// ─────────────────────────────────────────────────────────────
const CountUp: React.FC<{ target: number }> = ({ target }) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!target) { setN(0); return; }
    const step = Math.max(1, Math.ceil(target / 40));
    let cur = 0;
    const t = setInterval(() => {
      cur = Math.min(cur + step, target);
      setN(cur);
      if (cur >= target) clearInterval(t);
    }, 20);
    return () => clearInterval(t);
  }, [target]);
  return <>{n}</>;
};

// ─────────────────────────────────────────────────────────────
// Stat Card
// ─────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: number;
  icon: React.FC<{ className?: string }>;
  gradient: string;
  iconBg: string;
  iconColor: string;
  accent: string;
  delay: number;
  onClick?: () => void;
  active?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  label, value, icon: Icon, gradient, iconBg, iconColor, accent, delay, onClick, active,
}) => (
  <motion.button
    type="button"
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.35 }}
    onClick={onClick}
    className={`relative w-full text-left overflow-hidden rounded-2xl border shadow-sm hover:shadow-md transition-all group ${
      active
        ? `${gradient} text-white border-transparent shadow-lg`
        : 'bg-white border-slate-100 hover:border-slate-200'
    }`}
  >
    {/* top gradient strip when inactive */}
    {!active && <div className={`absolute inset-x-0 top-0 h-0.5 ${gradient} opacity-70`} />}

    <div className="p-4 flex items-center gap-3">
      <div className={`p-2.5 rounded-xl shrink-0 transition-transform group-hover:scale-105 ${
        active ? 'bg-white/20' : iconBg
      }`}>
        <Icon className={`w-4 h-4 ${active ? 'text-white' : iconColor}`} />
      </div>
      <div className="min-w-0">
        <div className={`text-2xl font-black tabular-nums ${active ? 'text-white' : 'text-slate-900'}`}>
          <CountUp target={value} />
        </div>
        <div className={`text-[11px] font-semibold mt-0.5 truncate ${active ? 'text-white/80' : 'text-slate-500'}`}>
          {label}
        </div>
      </div>
    </div>
    {active && (
      <div className="absolute inset-0 rounded-2xl ring-2 ring-white/30 pointer-events-none" />
    )}
  </motion.button>
);

// ─────────────────────────────────────────────────────────────
// Status Badge
// ─────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  Pending:     { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   label: 'Under Review' },
  Shortlisted: { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    label: 'Shortlisted' },
  Accepted:    { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Accepted' },
  Hired:       { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', label: 'Hired 🎉' },
  Rejected:    { bg: 'bg-rose-50',    text: 'text-rose-600',    border: 'border-rose-200',    label: 'Not Selected' },
  Withdrawn:   { bg: 'bg-slate-50',   text: 'text-slate-500',   border: 'border-slate-200',   label: 'Withdrawn' },
  Cancelled:   { bg: 'bg-amber-50',   text: 'text-amber-800',   border: 'border-amber-300',   label: 'Cancelled' },
};

const StatusBadge: React.FC<{ status: ApplicationStatus }> = ({ status }) => {
  const s = STATUS_STYLES[status] ?? { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', label: status };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${s.bg} ${s.text} ${s.border}`}>
      {s.label}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────
// Application Card
// ─────────────────────────────────────────────────────────────
interface AppCardProps {
  app: JobApplication;
  index: number;
  onWithdraw: (app: JobApplication) => void;
  onToggleTimeline: (id: string) => void;
  timelineOpen: boolean;
}

const ApplicationCard: React.FC<AppCardProps> = ({
  app, index, onWithdraw, onToggleTimeline, timelineOpen,
}) => {
  const canWithdraw = ['Pending', 'Shortlisted', 'Accepted'].includes(app.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
    >
      {/* Card header stripe */}
      <div className={`h-1 w-full ${
        app.status === 'Hired' ? 'bg-gradient-to-r from-emerald-500 to-green-600'
        : app.status === 'Accepted' ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
        : app.status === 'Shortlisted' ? 'bg-gradient-to-r from-blue-400 to-indigo-500'
        : app.status === 'Rejected' ? 'bg-gradient-to-r from-rose-400 to-red-500'
        : app.status === 'Withdrawn' ? 'bg-gradient-to-r from-slate-300 to-slate-400'
        : app.status === 'Cancelled' ? 'bg-gradient-to-r from-amber-400 to-orange-500'
        : 'bg-gradient-to-r from-amber-300 to-amber-400'
      }`} />

      <div className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Left: details */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={app.status} />
              <span className="text-[10px] text-slate-400 font-medium">{fmtDate(app.createdAt)}</span>
              {app.shortlisted && app.status !== 'Shortlisted' && (
                <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <Star className="w-2.5 h-2.5 fill-amber-400" /> Shortlisted
                </span>
              )}
            </div>

            <h3 className="text-base font-bold text-slate-900 leading-tight truncate">
              {(app.job as any)?.title || 'Job Posting'}
            </h3>

            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
              {app.farmer?.name && (
                <span className="flex items-center gap-1 font-medium text-slate-600">
                  <User className="w-3 h-3 text-slate-400" />{app.farmer.name}
                </span>
              )}
              {(app.job as any)?.jobAddress?.district && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  {(app.job as any).jobAddress.district}
                </span>
              )}
              {app.expectedDailyWage && (
                <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                  <IndianRupee className="w-3 h-3" />{app.expectedDailyWage}/day
                </span>
              )}
            </div>

            {app.farmerFeedback && (
              <p className="text-xs text-slate-600 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100 italic line-clamp-2">
                "{app.farmerFeedback}"
              </p>
            )}
          </div>

          {/* Right: actions */}
          <div className="flex sm:flex-col gap-2 items-center sm:items-end shrink-0">
            {canWithdraw && (
              <button
                onClick={() => onWithdraw(app)}
                className="text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200 transition-colors flex items-center gap-1"
              >
                <LogOut className="w-3 h-3" /> Withdraw
              </button>
            )}
            {(app.job as any)?._id && (
              <Link
                to={`/jobs/${(app.job as any)._id}`}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors"
              >
                <ExternalLink className="w-3 h-3" /> Job
              </Link>
            )}
          </div>
        </div>

        {/* Timeline toggle */}
        <div className="mt-4 pt-3 border-t border-slate-50">
          <button
            type="button"
            onClick={() => onToggleTimeline(app._id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              timelineOpen
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            {timelineOpen ? 'Hide Timeline' : 'View Status Timeline'}
            <ChevronRight className={`w-3 h-3 transition-transform duration-300 ${timelineOpen ? 'rotate-90' : ''}`} />
          </button>
        </div>
      </div>

      {/* Collapsible timeline */}
      <AnimatePresence initial={false}>
        {timelineOpen && (
          <motion.div
            key="tl"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1">
              <div className="h-px bg-slate-100 mb-4" />
              <ApplicationStatusTimeline application={app} compact={false} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────
// Profile Completion Widget (Worker-specific)
// ─────────────────────────────────────────────────────────────
const WorkerProfileCard: React.FC<{ pct: number; missing: string[]; name: string }> = ({ pct, missing, name }) => {
  const navigate = useNavigate();
  const isComplete = pct >= 85;
  const circumference = 2 * Math.PI * 28;
  const dashoffset = circumference - (pct / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.15 }}
      className={`rounded-2xl p-5 border ${
        isComplete
          ? 'bg-gradient-to-br from-emerald-600 to-teal-700 border-transparent text-white shadow-lg shadow-emerald-900/20'
          : 'bg-white border-slate-100 shadow-sm'
      }`}
    >
      <div className="flex items-center gap-4 mb-4">
        {/* Circular progress */}
        <div className="relative w-16 h-16 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" strokeWidth="6"
              className={isComplete ? 'stroke-emerald-800' : 'stroke-slate-100'} />
            <motion.circle
              cx="32" cy="32" r="28" fill="none" strokeWidth="6"
              strokeLinecap="round"
              stroke={isComplete ? '#6EE7B7' : '#10B981'}
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: dashoffset }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
          </svg>
          <span className={`absolute inset-0 flex items-center justify-center text-sm font-black ${isComplete ? 'text-white' : 'text-slate-800'}`}>
            {pct}%
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${isComplete ? 'text-emerald-300' : 'text-slate-400'}`}>
            Profile
          </p>
          <h3 className={`font-bold text-sm ${isComplete ? 'text-white' : 'text-slate-900'}`}>
            {isComplete ? `${name.split(' ')[0]}'s profile is complete!` : 'Complete Your Profile'}
          </h3>
          <p className={`text-xs mt-0.5 ${isComplete ? 'text-emerald-200' : 'text-slate-500'}`}>
            {isComplete ? 'You\'re visible to farmers searching for workers.' : 'Higher completion = more job visibility'}
          </p>
        </div>
      </div>

      {!isComplete && missing.length > 0 && (
        <div className="space-y-1.5 mb-4">
          {missing.slice(0, 3).map((m, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
              <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
              <span className="truncate">{m}</span>
            </div>
          ))}
          {missing.length > 3 && (
            <p className="text-[10px] text-slate-400 pl-1">+{missing.length - 3} more items</p>
          )}
        </div>
      )}

      <button
        onClick={() => navigate('/worker/profile')}
        className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
          isComplete
            ? 'bg-white/20 text-white hover:bg-white/30 border border-white/20'
            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/30'
        }`}
      >
        <Sparkles className="w-3.5 h-3.5" />
        {isComplete ? 'View Profile' : 'Complete Profile'}
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────
// Recommended Job Card
// ─────────────────────────────────────────────────────────────
const RecommendedJobCard: React.FC<{ job: JobData; index: number }> = ({ job, index }) => (
  <motion.div
    initial={{ opacity: 0, x: 12 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.07 }}
    className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden group"
  >
    {job.isUrgent && (
      <div className="bg-gradient-to-r from-rose-500 to-red-500 text-white text-[10px] font-bold px-3 py-1 flex items-center gap-1">
        <Zap className="w-3 h-3" /> URGENT REQUIREMENT
      </div>
    )}
    <div className="p-4">
      <div className="flex items-start gap-3">
        {/* Category avatar */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-base shrink-0 shadow-sm">
          {job.category?.charAt(0) ?? 'J'}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-slate-900 leading-tight line-clamp-1 group-hover:text-emerald-700 transition-colors">
            {job.title}
          </h4>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
            <MapPin className="w-3 h-3 shrink-0" />
            {job.jobAddress?.district}, {job.jobAddress?.state}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {job.dailyWage && (
          <span className="flex items-center gap-1 text-emerald-700 font-semibold">
            <IndianRupee className="w-3 h-3" />₹{job.dailyWage}/day
          </span>
        )}
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3 text-slate-400" />
          {job.startDate ? fmtDate(job.startDate) : '—'}
        </span>
        {job.numberOfWorkers && (
          <span className="flex items-center gap-1 text-slate-500">
            <User className="w-3 h-3 text-slate-400" />
            {job.numberOfWorkers} needed
          </span>
        )}
      </div>

      {job.requiredSkills?.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {job.requiredSkills.slice(0, 3).map((sk) => (
            <span key={sk} className="text-[10px] font-medium bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
              {sk}
            </span>
          ))}
        </div>
      )}

      <Link
        to={`/jobs/${job._id}`}
        className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-100 transition-all"
      >
        View & Apply <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  </motion.div>
);

// ─────────────────────────────────────────────────────────────
// Saved Job Row
// ─────────────────────────────────────────────────────────────
const SavedJobRow: React.FC<{ job: JobData; index: number }> = ({ job, index }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: index * 0.05 }}
    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group"
  >
    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
      {job.category?.charAt(0) ?? 'J'}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-emerald-700 transition-colors">
        {job.title}
      </p>
      <p className="text-xs text-slate-500 flex items-center gap-1">
        <MapPin className="w-3 h-3" />{job.jobAddress?.district}
        {job.dailyWage && <><span className="mx-1 text-slate-300">·</span><IndianRupee className="w-3 h-3 text-emerald-600" /><span className="text-emerald-700 font-semibold">{job.dailyWage}/day</span></>}
      </p>
    </div>
    <Link
      to={`/jobs/${job._id}`}
      className="shrink-0 p-2 rounded-xl bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 transition-colors text-slate-400"
    >
      <ExternalLink className="w-3.5 h-3.5" />
    </Link>
  </motion.div>
);

// ─────────────────────────────────────────────────────────────
// Quick Actions Panel
// ─────────────────────────────────────────────────────────────
const QuickActions: React.FC = () => {
  const actions = [
    { label: 'Browse Jobs', desc: 'Find new farm job openings', icon: Search, to: '/jobs', bg: 'bg-emerald-50', border: 'border-emerald-100', icon_bg: 'from-emerald-500 to-teal-600', text: 'text-emerald-700' },
    { label: 'My Applications', desc: 'Track all submitted applications', icon: Briefcase, to: '/my-applications', bg: 'bg-blue-50', border: 'border-blue-100', icon_bg: 'from-blue-500 to-indigo-600', text: 'text-blue-700' },
    { label: 'Saved Jobs', desc: 'View your bookmarked listings', icon: Bookmark, to: '/saved-jobs', bg: 'bg-amber-50', border: 'border-amber-100', icon_bg: 'from-amber-400 to-orange-500', text: 'text-amber-700' },
    { label: 'Edit Profile', desc: 'Update skills, wage & availability', icon: User, to: '/worker/profile', bg: 'bg-violet-50', border: 'border-violet-100', icon_bg: 'from-violet-500 to-purple-600', text: 'text-violet-700' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Quick Actions</p>
      <div className="space-y-2">
        {actions.map((a, i) => (
          <motion.div key={a.label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}>
            <Link
              to={a.to}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl border ${a.bg} ${a.border} hover:shadow-sm transition-all group`}
            >
              <div className={`p-2 rounded-xl bg-gradient-to-br ${a.icon_bg} shadow-sm shrink-0`}>
                <a.icon className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-bold ${a.text}`}>{a.label}</p>
                <p className="text-xs text-slate-400">{a.desc}</p>
              </div>
              <ChevronRight className={`w-4 h-4 shrink-0 ml-auto ${a.text} opacity-0 group-hover:opacity-100 transition-opacity`} />
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Main Worker Dashboard Page
// ─────────────────────────────────────────────────────────────
type TabKey = 'all' | 'Pending' | 'Accepted' | 'Hired' | 'Shortlisted' | 'Rejected' | 'Withdrawn' | 'Cancelled';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all',         label: 'All' },
  { key: 'Pending',     label: 'Pending' },
  { key: 'Shortlisted', label: 'Shortlisted' },
  { key: 'Accepted',    label: 'Accepted' },
  { key: 'Hired',       label: 'Hired' },
  { key: 'Rejected',    label: 'Rejected' },
  { key: 'Withdrawn',   label: 'Withdrawn' },
  { key: 'Cancelled',   label: 'Cancelled' },
];

export const WorkerDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [savedJobs, setSavedJobs] = useState<JobData[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<JobData[]>([]);
  const [profile, setProfile] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTimelineId, setExpandedTimelineId] = useState<string | null>(null);

  // Withdraw modal
  const [withdrawApp, setWithdrawApp] = useState<JobApplication | null>(null);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);

  // ── Data Fetching ──────────────────────────────────────────
  const fetchAll = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [appsRes, savedRes, jobsRes, profileRes] = await Promise.allSettled([
        getMyApplications({ limit: 50 }),
        jobService.getSavedJobs({ limit: 5 }),
        jobService.getAllJobs({ limit: 6, status: 'Active' }),
        getMyProfileApi(),
      ]);

      if (appsRes.status === 'fulfilled') setApplications(appsRes.value.applications);
      if (savedRes.status === 'fulfilled') setSavedJobs(savedRes.value.jobs);
      if (jobsRes.status === 'fulfilled') setRecommendedJobs(jobsRes.value.jobs);
      if (profileRes.status === 'fulfilled') setProfile(profileRes.value?.data || profileRes.value);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Derived Data ────────────────────────────────────────────
  const stats = useMemo(() => computeStats(applications), [applications]);
  const completion = useMemo(() => computeProfileCompletion(profile, user), [profile, user]);

  const filteredApps = useMemo(() => {
    let apps = activeTab === 'all' ? applications : applications.filter(a => a.status === activeTab);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      apps = apps.filter(a =>
        ((a.job as any)?.title ?? '').toLowerCase().includes(q) ||
        (a.farmer?.name ?? '').toLowerCase().includes(q)
      );
    }
    return apps;
  }, [applications, activeTab, searchQuery]);

  // ── Handlers ────────────────────────────────────────────────
  const handleWithdrawSuccess = (updated: JobApplication) => {
    setApplications(prev => prev.map(a => a._id === updated._id ? updated : a));
  };

  const handleToggleTimeline = (id: string) => {
    setExpandedTimelineId(prev => prev === id ? null : id);
  };

  const userName = (user as any)?.name || (user as any)?.fullName || 'Worker';

  // ── Loading State ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-100" />
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
          </div>
          <p className="text-sm font-semibold text-slate-500">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  // ── Stat Card Config ─────────────────────────────────────────
  const statCards: Omit<StatCardProps, 'delay' | 'onClick' | 'active'>[] = [
    { label: 'Total Applied',  value: stats.total,       icon: Briefcase,   gradient: 'bg-gradient-to-r from-slate-700 to-slate-800', iconBg: 'bg-slate-100', iconColor: 'text-slate-600', accent: 'slate' },
    { label: 'Pending',        value: stats.pending,     icon: Clock,       gradient: 'bg-gradient-to-r from-amber-400 to-orange-500', iconBg: 'bg-amber-50',  iconColor: 'text-amber-600', accent: 'amber' },
    { label: 'Shortlisted',    value: stats.shortlisted, icon: Star,        gradient: 'bg-gradient-to-r from-blue-500 to-indigo-600',  iconBg: 'bg-blue-50',   iconColor: 'text-blue-600',  accent: 'blue' },
    { label: 'Accepted',       value: stats.accepted,    icon: CheckCircle2,gradient: 'bg-gradient-to-r from-emerald-400 to-teal-500', iconBg: 'bg-emerald-50',iconColor: 'text-emerald-600',accent: 'emerald' },
    { label: 'Hired 🎉',       value: stats.hired,       icon: Award,       gradient: 'bg-gradient-to-r from-emerald-600 to-green-700',iconBg: 'bg-emerald-100',iconColor: 'text-emerald-700',accent: 'emerald' },
    { label: 'Rejected',       value: stats.rejected,    icon: XCircle,     gradient: 'bg-gradient-to-r from-rose-400 to-red-500',    iconBg: 'bg-rose-50',   iconColor: 'text-rose-600',  accent: 'rose' },
    { label: 'Withdrawn',      value: stats.withdrawn,   icon: LogOut,      gradient: 'bg-gradient-to-r from-slate-400 to-slate-500', iconBg: 'bg-slate-50',  iconColor: 'text-slate-500', accent: 'slate' },
    { label: 'Cancelled',      value: stats.cancelled,   icon: Ban,         gradient: 'bg-gradient-to-r from-amber-600 to-orange-700',iconBg: 'bg-amber-50',  iconColor: 'text-amber-700', accent: 'amber' },
  ];

  const tabToStatKey: Record<TabKey, keyof WorkerStats | 'total'> = {
    all: 'total', Pending: 'pending', Accepted: 'accepted', Hired: 'hired',
    Shortlisted: 'shortlisted', Rejected: 'rejected', Withdrawn: 'withdrawn', Cancelled: 'cancelled',
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Sticky Header ─────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600 rounded-xl shadow-sm">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-tight">My Dashboard</h1>
                <p className="text-xs text-slate-400 hidden sm:block">Track applications, jobs & profile</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {completion.pct < 85 && (
                <button
                  onClick={() => navigate('/worker/profile')}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-700 bg-amber-50 rounded-xl border border-amber-200 hover:bg-amber-100 transition-colors"
                >
                  <Bell className="w-3.5 h-3.5" />
                  Profile {completion.pct}% done
                </button>
              )}
              <button
                onClick={() => fetchAll(true)}
                disabled={refreshing}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <Link
                to="/jobs"
                className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <Search className="w-3.5 h-3.5" /> Browse Jobs
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-5 flex items-center gap-3 px-4 py-3 bg-rose-50 rounded-2xl border border-rose-200 text-rose-700 text-sm"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
              <button onClick={() => fetchAll(true)} className="ml-auto text-xs font-semibold underline">Retry</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Welcome Banner ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 rounded-2xl p-6 text-white shadow-lg shadow-emerald-900/20 mb-6"
        >
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/5 rounded-full" />
          <div className="absolute -bottom-10 -left-4 w-48 h-48 bg-white/5 rounded-full" />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                Worker Dashboard
              </div>
              <h2 className="text-xl sm:text-2xl font-black mb-1">
                Welcome back, {userName.split(' ')[0]}! 👋
              </h2>
              <p className="text-emerald-200 text-sm">
                {stats.total === 0
                  ? 'Start your farming career — browse and apply to jobs today.'
                  : `${stats.total} applications · ${stats.hired} hired · ${stats.pending} pending review`}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Link
                to="/jobs"
                className="flex items-center gap-1.5 px-4 py-2.5 bg-white text-emerald-700 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-all shadow-sm"
              >
                <Search className="w-4 h-4" /> Browse Jobs
              </Link>
              <Link
                to="/my-applications"
                className="flex items-center gap-1.5 px-4 py-2.5 bg-white/15 border border-white/25 text-white rounded-xl text-sm font-semibold hover:bg-white/25 transition-all"
              >
                <Eye className="w-4 h-4" /> My Applications
              </Link>
            </div>
          </div>
        </motion.div>

        {/* ── Stat Cards ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          {statCards.map((c, i) => {
            const tabKey = TABS[i]?.key ?? 'all';
            return (
              <StatCard
                key={c.label}
                {...c}
                delay={i * 0.05}
                active={activeTab === tabKey}
                onClick={() => setActiveTab(activeTab === tabKey ? 'all' : tabKey)}
              />
            );
          })}
        </div>

        {/* ── Main 2-column layout ────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT: Applications (2/3 width) */}
          <div className="lg:col-span-2 space-y-5">

            {/* Applications Panel */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Panel Header */}
              <div className="px-5 pt-5 pb-3 border-b border-slate-50">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Applied Jobs</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {filteredApps.length} application{filteredApps.length !== 1 ? 's' : ''}
                      {activeTab !== 'all' ? ` · ${activeTab}` : ''}
                    </p>
                  </div>
                  <Link to="/my-applications" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5">
                    Full View <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Filter tabs */}
                <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                  {TABS.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                        activeTab === tab.key
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {tab.label}
                      {tab.key !== 'all' && stats[tab.key.toLowerCase() as keyof WorkerStats] > 0 && (
                        <span className={`ml-1.5 font-black ${activeTab === tab.key ? 'text-white/80' : 'text-slate-500'}`}>
                          {stats[tab.key.toLowerCase() as keyof WorkerStats]}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="mt-3 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search job title or farmer name…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
                  />
                </div>
              </div>

              {/* Applications List */}
              <div className="p-4 space-y-3 max-h-[680px] overflow-y-auto">
                {filteredApps.length === 0 ? (
                  <div className="text-center py-14">
                    <Briefcase className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-slate-700">No applications found</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                      {activeTab !== 'all' ? `You have no ${activeTab.toLowerCase()} applications.` : 'Start applying to agricultural jobs.'}
                    </p>
                    {activeTab === 'all' && (
                      <Link to="/jobs" className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors">
                        Browse Jobs <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                ) : (
                  filteredApps.map((app, i) => (
                    <ApplicationCard
                      key={app._id}
                      app={app}
                      index={i}
                      onWithdraw={a => { setWithdrawApp(a); setWithdrawModalOpen(true); }}
                      onToggleTimeline={handleToggleTimeline}
                      timelineOpen={expandedTimelineId === app._id}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Recommended Jobs */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-slate-50">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" /> Recommended Jobs
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Active openings matching your profile</p>
                </div>
                <Link to="/jobs" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5">
                  View all <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recommendedJobs.length === 0 ? (
                  <div className="col-span-2 text-center py-8 text-slate-400 text-xs">No recommendations available</div>
                ) : (
                  recommendedJobs.slice(0, 4).map((job, i) => (
                    <RecommendedJobCard key={(job as any)._id ?? i} job={job} index={i} />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Sidebar (1/3 width) */}
          <div className="space-y-5">

            {/* Profile Completion */}
            <WorkerProfileCard
              pct={completion.pct}
              missing={completion.missing}
              name={userName}
            />

            {/* Quick Actions */}
            <QuickActions />

            {/* Saved Jobs */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-slate-50">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-blue-500" /> Saved Jobs
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">{savedJobs.length} bookmarked listings</p>
                </div>
                <Link to="/saved-jobs" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
                  All <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="px-3 py-2">
                {savedJobs.length === 0 ? (
                  <div className="text-center py-8">
                    <Bookmark className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">No saved jobs yet.</p>
                    <Link to="/jobs" className="mt-2 inline-block text-xs font-semibold text-emerald-600 hover:underline">Browse Jobs</Link>
                  </div>
                ) : (
                  savedJobs.map((job, i) => (
                    <SavedJobRow key={(job as any)._id ?? i} job={job} index={i} />
                  ))
                )}
              </div>
            </div>

            {/* Application Activity Summary */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Activity Summary</p>
              <div className="space-y-2.5">
                {[
                  { label: 'Applied',     value: stats.total,       color: 'bg-slate-400' },
                  { label: 'Shortlisted', value: stats.shortlisted, color: 'bg-blue-500' },
                  { label: 'Accepted',    value: stats.accepted,    color: 'bg-emerald-400' },
                  { label: 'Hired',       value: stats.hired,       color: 'bg-emerald-700' },
                  { label: 'Rejected',    value: stats.rejected,    color: 'bg-rose-400' },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-slate-600">{label}</span>
                      <span className="font-bold text-slate-800 tabular-nums">{value}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: stats.total > 0 ? `${(value / stats.total) * 100}%` : '0%' }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={`h-full rounded-full ${color}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Withdraw Modal */}
      <WithdrawApplicationModal
        application={withdrawApp}
        isOpen={withdrawModalOpen}
        onClose={() => setWithdrawModalOpen(false)}
        onSuccess={handleWithdrawSuccess}
      />
    </div>
  );
};

export default WorkerDashboardPage;
