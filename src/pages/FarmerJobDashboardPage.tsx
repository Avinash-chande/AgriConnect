import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Briefcase,
  PlusCircle,
  Users,
  Eye,
  Bookmark,
  CheckCircle2,
  XCircle,
  Sparkles,
  TrendingUp,
  BarChart3,
  Edit,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  MapPin,
  IndianRupee,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { jobService } from '../services/jobService';
import type { JobData, FarmerDashboardStats, PaginationMeta } from '../services/jobService';
import { DeleteJobModal } from '../components/common/DeleteJobModal';

export const FarmerJobDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState<JobData[]>([]);
  const [stats, setStats] = useState<FarmerDashboardStats>({
    totalJobs: 0,
    openJobs: 0,
    closedJobs: 0,
    totalApplications: 0,
    totalViews: 0,
    totalSaved: 0,
    featuredJobs: 0,
    applicationsChart: [],
    viewsTrendChart: [],
  });

  const [pagination, setPagination] = useState<PaginationMeta>({
    totalJobs: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const [deletingJobTitle, setDeletingJobTitle] = useState<string>('');

  useEffect(() => {
    fetchDashboardData(1, statusFilter);
  }, [statusFilter]);

  const fetchDashboardData = async (page: number, status: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await jobService.getFarmerDashboardJobs({ page, limit: 10, status });
      setJobs(res.jobs);
      setStats(res.stats);
      setPagination(res.pagination);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load Farmer Job Dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSuccess = () => {
    setDeletingJobId(null);
    fetchDashboardData(pagination.page, statusFilter);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchDashboardData(newPage, statusFilter);
    }
  };

  return (
    <div className="min-h-screen bg-agri-bg text-slate-800 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header & Navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="space-y-1">
            <button
              onClick={() => navigate('/farmer/profile')}
              className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors text-xs font-medium mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Farmer Profile</span>
            </button>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 tracking-tight flex items-center space-x-3">
              <div className="p-2.5 bg-emerald-100 rounded-2xl border border-emerald-200 text-agri-primary">
                <Briefcase className="w-6 h-6" />
              </div>
              <span>Farmer Job Management Dashboard</span>
            </h1>
            <p className="text-xs text-slate-600">
              Monitor active vacancies, worker applications, view statistics, and manage your job listings.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => fetchDashboardData(pagination.page, statusFilter)}
              className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center space-x-1.5 shadow-soft-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <Link
              to="/farmer/jobs/create"
              className="px-5 py-2.5 bg-agri-primary hover:bg-agri-hover text-white font-bold rounded-xl text-xs transition-all shadow-agri-glow flex items-center space-x-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Post New Vacancy</span>
            </Link>
          </div>
        </div>

        {/* Top 7 Dashboard Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          {/* Card 1: Total Jobs */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-soft-sm">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Jobs</span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-slate-900">{stats.totalJobs}</span>
              <div className="p-2 bg-slate-100 rounded-xl text-slate-700">
                <Briefcase className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Card 2: Open Jobs */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-soft-sm">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Open Vacancies</span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-agri-primary">{stats.openJobs}</span>
              <div className="p-2 bg-emerald-50 rounded-xl text-agri-primary">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Card 3: Closed Jobs */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-soft-sm">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Closed Jobs</span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-rose-600">{stats.closedJobs}</span>
              <div className="p-2 bg-rose-50 rounded-xl text-rose-600">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Card 4: Applications */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-soft-sm">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Applications</span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-amber-600">{stats.totalApplications}</span>
              <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Card 5: Views */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-soft-sm">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Views</span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-sky-600">{stats.totalViews}</span>
              <div className="p-2 bg-sky-50 rounded-xl text-sky-600">
                <Eye className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Card 6: Saved */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-soft-sm">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Saved Count</span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-purple-600">{stats.totalSaved}</span>
              <div className="p-2 bg-purple-50 rounded-xl text-purple-600">
                <Bookmark className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Card 7: Featured Jobs */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-soft-sm">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Featured</span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-amber-600">{stats.featuredJobs}</span>
              <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Graphical Analytics Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Applications per Job (Bar Chart) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-soft-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-agri-primary" />
                <h3 className="font-bold font-heading text-slate-900 text-base">Applications per Job Vacancy</h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">Recent Top Postings</span>
            </div>

            {stats.applicationsChart.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-xs text-slate-400">
                No job postings data available yet.
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                {stats.applicationsChart.map((item, idx) => {
                  const maxApps = Math.max(...stats.applicationsChart.map((c) => c.applications), 1);
                  const percentage = Math.min(100, Math.max(15, (item.applications / maxApps) * 100));
                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-slate-700 truncate max-w-[200px]">{item.title}</span>
                        <span className="text-agri-primary font-bold">{item.applications} Applicants</span>
                      </div>
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
                        <div
                          style={{ width: `${percentage}%` }}
                          className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-500"
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Chart 2: Views per Day Trend (Area / Line Chart) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-soft-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold font-heading text-slate-900 text-base">Views per Day (7-Day Trend)</h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">Daily Visitor Engagement</span>
            </div>

            <div className="h-52 flex items-end justify-between gap-3 pt-6 px-2">
              {stats.viewsTrendChart.map((item, idx) => {
                const maxViews = Math.max(...stats.viewsTrendChart.map((v) => v.views), 1);
                const heightPercent = Math.min(100, Math.max(20, (item.views / maxViews) * 100));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                    <span className="text-[10px] font-bold text-sky-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.views}
                    </span>
                    <div className="w-full bg-slate-100 h-36 rounded-2xl flex items-end p-1 border border-slate-200">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full bg-gradient-to-t from-sky-600 to-cyan-400 rounded-xl transition-all duration-500 group-hover:from-sky-500 group-hover:to-cyan-300"
                      ></div>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-600">{item.day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Jobs Management Table */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-soft-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <h3 className="font-bold font-heading text-slate-900 text-lg">Manage Recent Job Listings</h3>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-600">Filter Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-agri-primary"
              >
                <option value="all">All Statuses</option>
                <option value="Active">Active Only</option>
                <option value="Closed">Closed Only</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-slate-100 rounded-2xl border border-slate-200"></div>
              ))}
            </div>
          ) : error ? (
            <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs text-center font-semibold">
              {error}
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-xs text-slate-500">You haven't posted any job vacancies matching this filter.</p>
              <Link
                to="/farmer/jobs/create"
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-agri-primary text-white font-semibold text-xs rounded-xl hover:bg-agri-hover transition-colors shadow-soft-sm"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Your First Job Posting</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="pb-3 px-3">Job Title & Crop</th>
                    <th className="pb-3 px-3">Location</th>
                    <th className="pb-3 px-3">Wage</th>
                    <th className="pb-3 px-3">Status</th>
                    <th className="pb-3 px-3">Applicants</th>
                    <th className="pb-3 px-3">Views</th>
                    <th className="pb-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobs.map((job) => {
                    const jobId = job._id || (job as any).id || '';
                    return (
                      <tr key={jobId} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-3">
                          <Link to={`/jobs/${jobId}`} className="font-bold text-slate-900 hover:text-agri-primary transition-colors">
                            {job.title}
                          </Link>
                          <span className="text-[11px] text-slate-500 block mt-0.5">
                            {job.category} {job.cropType ? `• ${job.cropType}` : ''}
                          </span>
                        </td>

                        <td className="py-4 px-3 text-slate-700">
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-3.5 h-3.5 text-agri-primary flex-shrink-0" />
                            <span>
                              {job.jobAddress?.district}, {job.jobAddress?.state}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-3 font-bold text-agri-primary">
                          <div className="flex items-center">
                            <IndianRupee className="w-3 h-3 mr-0.5" />
                            <span>{job.dailyWage ? `${job.dailyWage}/Day` : `${job.monthlySalary}/Mo`}</span>
                          </div>
                        </td>

                        <td className="py-4 px-3">
                          <span
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-full border ${
                              job.status === 'Active'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            {job.status}
                          </span>
                        </td>

                        <td className="py-4 px-3 font-bold text-slate-900">
                          {job.totalApplications || 0}
                        </td>

                        <td className="py-4 px-3 text-slate-600">
                          {job.totalViews || 0}
                        </td>

                        <td className="py-4 px-3 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Link
                              to={`/jobs/${jobId}`}
                              title="View Details"
                              className="p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>

                            <Link
                              to={`/jobs/${jobId}/edit`}
                              title="Edit Job"
                              className="p-2 bg-white hover:bg-emerald-50 text-agri-primary rounded-xl border border-slate-200 transition-colors"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Link>

                            <button
                              onClick={() => {
                                setDeletingJobId(jobId);
                                setDeletingJobTitle(job.title);
                              }}
                              title="Delete Job"
                              className="p-2 bg-white hover:bg-rose-50 text-rose-600 rounded-xl border border-slate-200 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center space-x-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.hasPrevPage}
                className="p-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl disabled:opacity-50 text-xs transition-colors flex items-center space-x-1 shadow-soft-sm"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev</span>
              </button>

              <span className="text-xs text-slate-600">
                Page <span className="text-slate-900 font-bold">{pagination.page}</span> of {pagination.totalPages}
              </span>

              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.hasNextPage}
                className="p-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl disabled:opacity-50 text-xs transition-colors flex items-center space-x-1 shadow-soft-sm"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Job Confirmation Modal */}
      {deletingJobId && (
        <DeleteJobModal
          isOpen={!!deletingJobId}
          jobId={deletingJobId}
          jobTitle={deletingJobTitle}
          onClose={() => setDeletingJobId(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
};
