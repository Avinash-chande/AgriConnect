import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Clock,
  Star,
  CheckCircle2,
  XCircle,
  LogOut,
  Briefcase,
  Ban,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ChevronRight,
  Calendar,
  MapPin,
  BarChart2,
  Activity,
  Loader2,
  AlertCircle,
  Eye,
  ArrowRight,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { getFarmerDashboardStats } from '../services/applicationService';
import type { JobApplication } from '../types/application';

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────
interface DashboardData {
  overview: {
    total: number;
    pending: number;
    shortlisted: number;
    accepted: number;
    hired: number;
    rejected: number;
    withdrawn: number;
    cancelled: number;
  };
  perJob: Array<{
    jobId: string;
    jobTitle: string;
    category: string;
    status: string;
    total: number;
    pending: number;
    shortlisted: number;
    accepted: number;
    hired: number;
    rejected: number;
  }>;
  perDay: Array<{ date: string; count: number }>;
  recentApplicants: JobApplication[];
}

// ────────────────────────────────────────────────────────────────
// Micro helpers
// ────────────────────────────────────────────────────────────────
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function fmtShort(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ────────────────────────────────────────────────────────────────
// Animated Count-Up
// ────────────────────────────────────────────────────────────────
const CountUp: React.FC<{ target: number; duration?: number }> = ({ target, duration = 1200 }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    const step = Math.ceil(target / (duration / 16));
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      setCount(current);
      if (current >= target) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return <>{count}</>;
};

// ────────────────────────────────────────────────────────────────
// Stat Card
// ────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: number;
  icon: React.FC<{ className?: string }>;
  gradient: string;
  ringColor: string;
  delay: number;
  linkTo?: string;
  total?: number;
}

const StatCard: React.FC<StatCardProps> = ({
  label, value, icon: Icon, gradient, ringColor, delay, linkTo, total,
}) => {
  const pct = total && total > 0 ? Math.round((value / total) * 100) : 0;
  const Card = (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className={`relative overflow-hidden bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group ${linkTo ? 'cursor-pointer' : ''}`}
    >
      {/* Top gradient strip */}
      <div className={`absolute inset-x-0 top-0 h-1 ${gradient} rounded-t-2xl`} />

      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
            <div className="text-3xl font-black text-slate-900 tabular-nums">
              <CountUp target={value} />
            </div>
          </div>
          <div className={`p-3 rounded-2xl ${ringColor} bg-opacity-10 group-hover:scale-105 transition-transform`}>
            <Icon className={`w-5 h-5 ${ringColor.replace('bg-', 'text-')}`} />
          </div>
        </div>

        {total !== undefined && total > 0 && (
          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Share of total</span>
              <span className="font-semibold text-slate-600">{pct}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ delay: delay + 0.3, duration: 0.8, ease: 'easeOut' }}
                className={`h-full ${gradient} rounded-full`}
              />
            </div>
          </div>
        )}
      </div>

      {linkTo && (
        <div className="px-5 py-3 border-t border-slate-50 bg-slate-50/50">
          <span className="text-xs font-semibold text-slate-500 group-hover:text-emerald-600 flex items-center gap-1 transition-colors">
            View all <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      )}
    </motion.div>
  );

  return linkTo ? <Link to={linkTo}>{Card}</Link> : Card;
};

// ────────────────────────────────────────────────────────────────
// Inline Bar Chart (no external lib needed)
// ────────────────────────────────────────────────────────────────
interface InlineBarChartProps {
  data: Array<{ label: string; value: number; color: string }>;
  title: string;
  subtitle?: string;
}

const InlineBarChart: React.FC<InlineBarChartProps> = ({ data, title, subtitle }) => {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 h-full">
      <div className="mb-5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{title}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="space-y-3">
        {data.map((item, i) => (
          <div key={item.label}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium text-slate-600 truncate max-w-[60%]">{item.label}</span>
              <span className="text-xs font-bold text-slate-800 tabular-nums">{item.value}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(item.value / max) * 100}%` }}
                transition={{ delay: i * 0.08, duration: 0.7, ease: 'easeOut' }}
                className={`h-full rounded-full ${item.color}`}
              />
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-6">No data available</p>
        )}
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────
// Sparkline (per-day trend)
// ────────────────────────────────────────────────────────────────
interface SparklineProps {
  data: Array<{ date: string; count: number }>;
  daysBack: number;
}

const Sparkline: React.FC<SparklineProps> = ({ data, daysBack }) => {
  const width = 600;
  const height = 120;
  const padding = { top: 12, right: 12, bottom: 28, left: 32 };

  // Fill sparse data into a dense day array
  const filled: Array<{ date: string; count: number }> = [];
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const found = data.find((x) => x.date.startsWith(key));
    filled.push({ date: key, count: found?.count ?? 0 });
  }

  const maxVal = Math.max(...filled.map((d) => d.count), 1);
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const pts = filled.map((d, i) => ({
    x: padding.left + (i / (filled.length - 1 || 1)) * chartW,
    y: padding.top + chartH - (d.count / maxVal) * chartH,
    count: d.count,
    date: d.date,
  }));

  const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ');
  const area =
    `M ${pts[0]?.x},${padding.top + chartH} ` +
    pts.map((p) => `L ${p.x},${p.y}`).join(' ') +
    ` L ${pts[pts.length - 1]?.x},${padding.top + chartH} Z`;

  const total = filled.reduce((s, d) => s + d.count, 0);
  const recent7 = filled.slice(-7).reduce((s, d) => s + d.count, 0);
  const prev7 = filled.slice(-14, -7).reduce((s, d) => s + d.count, 0);
  const trend = prev7 === 0 ? (recent7 > 0 ? 100 : 0) : Math.round(((recent7 - prev7) / prev7) * 100);

  // Only show every Nth label to avoid crowding
  const labelStep = daysBack <= 14 ? 1 : daysBack <= 30 ? 5 : 10;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Applications per Day</p>
          <p className="text-xs text-slate-400 mt-0.5">Last {daysBack} days · {total} total</p>
        </div>
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
          trend >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
        }`}>
          {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {trend >= 0 ? '+' : ''}{trend}% vs prior week
        </div>
      </div>

      {total === 0 ? (
        <div className="flex items-center justify-center h-24 text-slate-400 text-xs">
          No applications in this period
        </div>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: 120 }}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
            <line
              key={pct}
              x1={padding.left} y1={padding.top + chartH * (1 - pct)}
              x2={padding.left + chartW} y2={padding.top + chartH * (1 - pct)}
              stroke="#F1F5F9" strokeWidth="1"
            />
          ))}

          {/* Area fill */}
          <motion.path
            d={area}
            fill="url(#areaGrad)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          />

          {/* Line */}
          <motion.polyline
            points={polyline}
            fill="none"
            stroke="#10B981"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
          />

          {/* Data points */}
          {pts.map((p, i) => p.count > 0 && (
            <circle key={i} cx={p.x} cy={p.y} r="3" fill="#10B981" stroke="white" strokeWidth="1.5" />
          ))}

          {/* X-axis labels */}
          {pts.map((p, i) => i % labelStep === 0 && (
            <text
              key={i}
              x={p.x} y={height - 4}
              textAnchor="middle"
              fontSize="9"
              fill="#94A3B8"
            >
              {new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </text>
          ))}

          {/* Y-axis label */}
          <text x={8} y={padding.top} textAnchor="start" fontSize="9" fill="#94A3B8">{maxVal}</text>
          <text x={8} y={padding.top + chartH} textAnchor="start" fontSize="9" fill="#94A3B8">0</text>
        </svg>
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────
// Per-Job Table
// ────────────────────────────────────────────────────────────────
interface PerJobTableProps {
  jobs: DashboardData['perJob'];
}

const JOB_STATUS_COLORS: Record<string, string> = {
  Active:  'bg-emerald-100 text-emerald-700',
  Filled:  'bg-blue-100 text-blue-700',
  Closed:  'bg-slate-100 text-slate-500',
  Paused:  'bg-amber-100 text-amber-700',
  Draft:   'bg-slate-100 text-slate-500',
  Expired: 'bg-rose-100 text-rose-600',
};

const PerJobTable: React.FC<PerJobTableProps> = ({ jobs }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
    <div className="px-5 pt-5 pb-3 flex items-center justify-between">
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Applications per Job</p>
        <p className="text-xs text-slate-400 mt-0.5">Top {jobs.length} postings by volume</p>
      </div>
      <BarChart2 className="w-4 h-4 text-slate-300" />
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 border-y border-slate-100">
            {['Job Title', 'Status', 'Total', 'Pending', 'Shortlisted', 'Accepted', 'Hired', 'Rejected'].map((h) => (
              <th key={h} className="px-4 py-2.5 text-left font-semibold text-slate-500 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {jobs.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-slate-400">No job data available</td>
            </tr>
          ) : (
            jobs.map((job, i) => (
              <motion.tr
                key={job.jobId}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
              >
                <td className="px-4 py-3 font-semibold text-slate-800 max-w-[180px] truncate">{job.jobTitle || 'Untitled Job'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${JOB_STATUS_COLORS[job.status] ?? 'bg-slate-100 text-slate-500'}`}>
                    {job.status || '—'}
                  </span>
                </td>
                <td className="px-4 py-3 font-black text-slate-900">{job.total}</td>
                <td className="px-4 py-3 text-amber-600 font-semibold">{job.pending}</td>
                <td className="px-4 py-3 text-blue-600 font-semibold">{job.shortlisted}</td>
                <td className="px-4 py-3 text-emerald-600 font-semibold">{job.accepted}</td>
                <td className="px-4 py-3 text-emerald-800 font-semibold">{job.hired}</td>
                <td className="px-4 py-3 text-rose-500 font-semibold">{job.rejected}</td>
              </motion.tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
);

// ────────────────────────────────────────────────────────────────
// Status Badge
// ────────────────────────────────────────────────────────────────
const STATUS_BADGE: Record<string, string> = {
  Pending:     'bg-amber-50 text-amber-700 border-amber-200',
  Shortlisted: 'bg-blue-50 text-blue-700 border-blue-200',
  Accepted:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  Hired:       'bg-emerald-100 text-emerald-800 border-emerald-300',
  Rejected:    'bg-rose-50 text-rose-600 border-rose-200',
  Withdrawn:   'bg-slate-50 text-slate-500 border-slate-200',
  Cancelled:   'bg-amber-50 text-amber-800 border-amber-300',
};

// ────────────────────────────────────────────────────────────────
// Recent Applicants Feed
// ────────────────────────────────────────────────────────────────
const RecentApplicants: React.FC<{ applicants: JobApplication[] }> = ({ applicants }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
    <div className="px-5 pt-5 pb-3 flex items-center justify-between">
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Recent Applicants</p>
        <p className="text-xs text-slate-400 mt-0.5">Latest {applicants.length} received applications</p>
      </div>
      <Link
        to="/farmer/applications"
        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
      >
        View all <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </div>

    <div className="divide-y divide-slate-50">
      {applicants.length === 0 ? (
        <div className="px-5 py-10 text-center text-slate-400 text-xs">No recent applicants</div>
      ) : (
        applicants.map((app, i) => (
          <motion.div
            key={app._id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.05 }}
            className="px-5 py-3.5 flex items-center gap-4 hover:bg-slate-50/70 transition-colors"
          >
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
              {app.worker?.name?.charAt(0).toUpperCase() ?? 'W'}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">
                {app.worker?.name ?? 'Unknown Worker'}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {(app.job as any)?.title ?? 'Job Posting'}
              </p>
            </div>

            {/* Status + Date */}
            <div className="shrink-0 flex flex-col items-end gap-1">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_BADGE[app.status] ?? 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                {app.status}
              </span>
              <span className="text-[10px] text-slate-400">{fmtDate(app.createdAt)}</span>
            </div>
          </motion.div>
        ))
      )}
    </div>
  </div>
);

// ────────────────────────────────────────────────────────────────
// Quick Actions
// ────────────────────────────────────────────────────────────────
const QuickActions: React.FC = () => {
  const actions = [
    {
      label: 'Manage Candidates',
      description: 'Review, shortlist, accept or reject received applications',
      icon: Users,
      to: '/farmer/applications',
      gradient: 'from-emerald-500 to-teal-600',
      textColor: 'text-emerald-700',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
    },
    {
      label: 'Post New Job',
      description: 'Create a new job listing to attract qualified farm workers',
      icon: Briefcase,
      to: '/farmer/dashboard',
      gradient: 'from-blue-500 to-indigo-600',
      textColor: 'text-blue-700',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
    },
    {
      label: 'View Shortlisted',
      description: 'Review workers you\'ve shortlisted across all job postings',
      icon: Star,
      to: '/farmer/applications?status=Shortlisted',
      gradient: 'from-amber-400 to-orange-500',
      textColor: 'text-amber-700',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
    },
    {
      label: 'Hired Workers',
      description: 'Check all workers who have been successfully hired',
      icon: UserCheck,
      to: '/farmer/applications?status=Hired',
      gradient: 'from-violet-500 to-purple-600',
      textColor: 'text-violet-700',
      bg: 'bg-violet-50',
      border: 'border-violet-100',
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Quick Actions</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {actions.map((action, i) => (
          <motion.div
            key={action.label}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08 }}
          >
            <Link
              to={action.to}
              className={`flex items-start gap-3 p-4 rounded-xl border ${action.bg} ${action.border} hover:shadow-sm transition-all group`}
            >
              <div className={`p-2 rounded-xl bg-gradient-to-br ${action.gradient} shadow-sm shrink-0`}>
                <action.icon className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-bold ${action.textColor}`}>{action.label}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{action.description}</p>
              </div>
              <ChevronRight className={`w-4 h-4 shrink-0 mt-0.5 ${action.textColor} opacity-0 group-hover:opacity-100 transition-opacity`} />
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────
// Main Dashboard Page
// ────────────────────────────────────────────────────────────────
export const FarmerApplicationDashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [daysBack, setDaysBack] = useState(30);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (days: number, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const res = await getFarmerDashboardStats(days);
      setData(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(daysBack); }, [daysBack, fetchData]);

  // Stat cards config
  const statCards = data ? [
    { label: 'Total Applications', value: data.overview.total, icon: Users, gradient: 'bg-gradient-to-r from-slate-600 to-slate-700', ringColor: 'bg-slate-600', delay: 0.0, linkTo: '/farmer/applications' },
    { label: 'Pending Review',      value: data.overview.pending, icon: Clock, gradient: 'bg-gradient-to-r from-amber-400 to-orange-500', ringColor: 'bg-amber-500', delay: 0.06, total: data.overview.total },
    { label: 'Shortlisted',         value: data.overview.shortlisted, icon: Star, gradient: 'bg-gradient-to-r from-blue-500 to-indigo-600', ringColor: 'bg-blue-500', delay: 0.12, total: data.overview.total },
    { label: 'Accepted',            value: data.overview.accepted, icon: CheckCircle2, gradient: 'bg-gradient-to-r from-emerald-400 to-teal-500', ringColor: 'bg-emerald-500', delay: 0.18, total: data.overview.total },
    { label: 'Hired',               value: data.overview.hired, icon: Briefcase, gradient: 'bg-gradient-to-r from-emerald-600 to-green-700', ringColor: 'bg-emerald-700', delay: 0.24, total: data.overview.total },
    { label: 'Rejected',            value: data.overview.rejected, icon: XCircle, gradient: 'bg-gradient-to-r from-rose-400 to-red-500', ringColor: 'bg-rose-500', delay: 0.30, total: data.overview.total },
    { label: 'Withdrawn',           value: data.overview.withdrawn, icon: LogOut, gradient: 'bg-gradient-to-r from-slate-400 to-slate-500', ringColor: 'bg-slate-400', delay: 0.36, total: data.overview.total },
    { label: 'Cancelled Hirings',   value: data.overview.cancelled, icon: Ban, gradient: 'bg-gradient-to-r from-amber-600 to-orange-700', ringColor: 'bg-amber-600', delay: 0.42, total: data.overview.total },
  ] : [];

  const statusDistData = data ? [
    { label: 'Pending',     value: data.overview.pending,     color: 'bg-amber-400' },
    { label: 'Shortlisted', value: data.overview.shortlisted, color: 'bg-blue-500' },
    { label: 'Accepted',    value: data.overview.accepted,    color: 'bg-emerald-400' },
    { label: 'Hired',       value: data.overview.hired,       color: 'bg-emerald-700' },
    { label: 'Rejected',    value: data.overview.rejected,    color: 'bg-rose-400' },
    { label: 'Withdrawn',   value: data.overview.withdrawn,   color: 'bg-slate-400' },
    { label: 'Cancelled',   value: data.overview.cancelled,   color: 'bg-amber-600' },
  ] : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-100" />
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
          </div>
          <p className="text-sm font-semibold text-slate-500">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600 rounded-xl shadow-sm">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-tight">Application Dashboard</h1>
                <p className="text-xs text-slate-400 hidden sm:block">Farmer recruitment analytics & insights</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Days Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {[7, 14, 30, 90].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDaysBack(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      daysBack === d
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>

              {/* Refresh */}
              <button
                onClick={() => fetchData(daysBack, true)}
                disabled={refreshing}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                title="Refresh dashboard"
              >
                <RefreshCw className={`w-4 h-4 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
              </button>

              {/* Navigate to full applications */}
              <Link
                to="/farmer/applications"
                className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-600/20"
              >
                <Eye className="w-3.5 h-3.5" />
                Manage Candidates
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3 p-4 bg-rose-50 rounded-2xl border border-rose-200 text-rose-700 text-sm"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
              <button onClick={() => fetchData(daysBack, true)} className="ml-auto text-xs font-semibold underline">
                Retry
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 rounded-2xl p-6 text-white shadow-lg shadow-emerald-900/20"
        >
          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/5 rounded-full" />
          <div className="absolute -bottom-12 -right-4 w-56 h-56 bg-white/5 rounded-full" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                Recruitment Overview · Last {daysBack} Days
              </div>
              <h2 className="text-2xl font-black mb-1">
                {data?.overview.total ?? 0} Total Applications
              </h2>
              <p className="text-emerald-200 text-sm">
                {data?.overview.hired ?? 0} hired ·{' '}
                {data?.overview.pending ?? 0} pending review ·{' '}
                {data?.overview.shortlisted ?? 0} shortlisted
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                to="/farmer/applications"
                className="flex items-center gap-1.5 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-semibold border border-white/20 backdrop-blur-sm transition-all"
              >
                Manage All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </motion.div>

        {/* ── Stat Cards Grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>

        {/* ── Charts Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend chart spans 2/3 */}
          <div className="lg:col-span-2">
            {data && <Sparkline data={data.perDay} daysBack={daysBack} />}
          </div>

          {/* Status Distribution */}
          <div>
            <InlineBarChart
              data={statusDistData}
              title="Status Distribution"
              subtitle="Applications by current status"
            />
          </div>
        </div>

        {/* ── Per-Job Table ── */}
        {data && <PerJobTable jobs={data.perJob} />}

        {/* ── Bottom Row: Recent Applicants + Quick Actions ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            {data && <RecentApplicants applicants={data.recentApplicants} />}
          </div>
          <div className="lg:col-span-2">
            <QuickActions />
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-slate-400 pb-4">
          Dashboard reflects real-time data · refreshed {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
};

export default FarmerApplicationDashboardPage;
