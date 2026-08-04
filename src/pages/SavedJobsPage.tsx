import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bookmark,
  Search,
  MapPin,
  IndianRupee,
  Users,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { jobService } from '../services/jobService';
import type { JobData, PaginationMeta } from '../services/jobService';

export const SavedJobsPage: React.FC = () => {
  const navigate = useNavigate();

  const [savedJobs, setSavedJobs] = useState<JobData[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    totalJobs: 0,
    page: 1,
    limit: 9,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    fetchSavedJobs(1, searchTerm);
  }, [searchTerm]);

  const fetchSavedJobs = async (page: number, query: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await jobService.getSavedJobs({ page, limit: 9, q: query });
      setSavedJobs(res.jobs);
      setPagination(res.pagination);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load saved jobs.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (jobId: string) => {
    try {
      // Optimistic removal
      setSavedJobs((prev) => prev.filter((j) => (j._id || (j as any).id) !== jobId));
      setPagination((prev) => ({ ...prev, totalJobs: Math.max(0, prev.totalJobs - 1) }));
      await jobService.toggleSaveJob(jobId);
    } catch {
      // Revert if API fails
      fetchSavedJobs(pagination.page, searchTerm);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchSavedJobs(newPage, searchTerm);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors text-xs font-medium mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-3">
              <div className="p-2.5 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-400">
                <Bookmark className="w-6 h-6 fill-amber-400/20" />
              </div>
              <span>Saved Job Vacancies</span>
            </h1>
            <p className="text-xs text-slate-400">
              Manage your bookmarked agricultural jobs and active applications.
            </p>
          </div>

          <span className="self-start sm:self-auto px-4 py-2 bg-slate-900 border border-slate-800 rounded-2xl text-xs font-semibold text-amber-400">
            {pagination.totalJobs} Saved Listing{pagination.totalJobs === 1 ? '' : 's'}
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-xl">
          <div className="absolute left-4 top-3.5 text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search within saved jobs by title, crop, district..."
            className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-2xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-xl transition-all"
          />
        </div>

        {/* Saved Jobs Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-56 bg-slate-900 border border-slate-800 rounded-3xl p-6"></div>
            ))}
          </div>
        ) : error ? (
          <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs text-center font-semibold">
            {error}
          </div>
        ) : savedJobs.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-3xl space-y-4">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-400 mx-auto">
              <Bookmark className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white">No Saved Jobs Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              You haven't bookmarked any job vacancies yet. Click the bookmark icon on any job card to save it for quick access.
            </p>
            <button
              onClick={() => navigate('/jobs')}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-emerald-600/20"
            >
              Browse All Jobs
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedJobs.map((job) => {
              const jobId = job._id || (job as any).id || '';
              return (
                <div
                  key={jobId}
                  className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 rounded-3xl p-6 space-y-4 flex flex-col justify-between shadow-xl transition-all duration-300 hover:border-amber-500/40 relative group"
                >
                  <div className="space-y-3">
                    {/* Header Badges */}
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 bg-slate-800 text-slate-300 text-xs font-medium rounded-full">
                        {job.category}
                      </span>

                      <button
                        onClick={() => handleUnsave(jobId)}
                        title="Remove from saved"
                        className="p-2 bg-slate-950/80 hover:bg-rose-500/20 text-amber-400 hover:text-rose-400 rounded-xl border border-slate-800 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Title & Location */}
                    <div>
                      <Link
                        to={`/jobs/${jobId}`}
                        className="text-base font-bold text-white hover:text-emerald-400 transition-colors line-clamp-1 block"
                      >
                        {job.title}
                      </Link>
                      <p className="text-xs text-slate-400 flex items-center space-x-1.5 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span>
                          {job.jobAddress?.district}, {job.jobAddress?.state}
                        </span>
                      </p>
                    </div>

                    {/* Details Row */}
                    <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                      <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/60">
                        <span className="text-slate-500 block text-[10px] uppercase">Wage</span>
                        <span className="font-bold text-emerald-400 flex items-center mt-0.5">
                          <IndianRupee className="w-3 h-3 mr-0.5" />
                          {job.dailyWage ? `${job.dailyWage}/Day` : `${job.monthlySalary}/Mo`}
                        </span>
                      </div>

                      <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/60">
                        <span className="text-slate-500 block text-[10px] uppercase">Workers</span>
                        <span className="font-bold text-white flex items-center mt-0.5">
                          <Users className="w-3 h-3 mr-1 text-emerald-400" />
                          {job.numberOfWorkers} Needed
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">
                      Farmer: <span className="text-white">{job.farmer?.name || 'Verified Farmer'}</span>
                    </span>

                    <Link
                      to={`/jobs/${jobId}`}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition-all shadow-md shadow-emerald-600/20"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center space-x-3 pt-6 border-t border-slate-800">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.hasPrevPage}
              className="p-2.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed text-xs transition-colors flex items-center space-x-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <span className="text-xs font-semibold text-slate-400 px-3">
              Page <span className="text-white">{pagination.page}</span> of {pagination.totalPages}
            </span>

            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasNextPage}
              className="p-2.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed text-xs transition-colors flex items-center space-x-1"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
