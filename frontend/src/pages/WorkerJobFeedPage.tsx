import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  MapPin,
  IndianRupee,
  Users,
  Filter,
  Sparkles,
  Bookmark,
  Share2,
  CheckCircle2,
  Send,
  RefreshCw,
  Home,
  Utensils,
  Truck,
  Flame,
  Navigation,
} from 'lucide-react';
import { jobService } from '../services/jobService';
import type { JobData, PaginationMeta } from '../services/jobService';
import { SmartSearchBar } from '../components/common/SmartSearchBar';
import { AdvancedJobFilterDrawer } from '../components/jobs/AdvancedJobFilterDrawer';
import type { JobFilterParams } from '../components/jobs/AdvancedJobFilterDrawer';
import { ShareJobModal } from '../components/common/ShareJobModal';
import { QuickApplyModal } from '../components/jobs/QuickApplyModal';

export const WorkerJobFeedPage: React.FC = () => {
  const [jobs, setJobs] = useState<JobData[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    totalJobs: 0,
    page: 1,
    limit: 9,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Active Filter state
  const [activeTab, setActiveTab] = useState<'all' | 'nearby' | 'urgent' | 'featured' | 'highWage'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [appliedFilters, setAppliedFilters] = useState<JobFilterParams>({});
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState<boolean>(false);

  // Modals state
  const [shareJobId, setShareJobId] = useState<string | null>(null);
  const [shareJobTitle, setShareJobTitle] = useState<string>('');
  const [applyJob, setApplyJob] = useState<JobData | null>(null);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());

  // Infinite Scroll Sentinel Ref
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Initial Fetch & Filter Changes
  useEffect(() => {
    fetchJobs(1, true);
  }, [activeTab, searchQuery, appliedFilters]);

  const fetchJobs = async (pageToFetch: number, resetList = false) => {
    try {
      if (resetList) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      // Build query params
      const params: Record<string, any> = {
        page: pageToFetch,
        limit: 9,
        q: searchQuery,
        ...appliedFilters,
      };

      if (activeTab === 'nearby') {
        params.radiusKm = 50;
        // Default Punjab center lat/lng fallback if geolocation not granted
        params.lat = params.lat || 31.634;
        params.lng = params.lng || 74.8723;
        params.sort = 'nearby';
      } else if (activeTab === 'urgent') {
        params.isUrgent = true;
      } else if (activeTab === 'featured') {
        params.isFeatured = true;
      } else if (activeTab === 'highWage') {
        params.sort = 'wageHighToLow';
      }

      const res = await jobService.getAllJobs(params);

      if (resetList) {
        setJobs(res.jobs);
      } else {
        setJobs((prev) => [...prev, ...res.jobs]);
      }

      setPagination(res.pagination);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load job postings.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Infinite Scroll Observer Callback
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && pagination.hasNextPage && !loading && !loadingMore) {
        fetchJobs(pagination.page + 1, false);
      }
    },
    [pagination, loading, loadingMore]
  );

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '200px',
      threshold: 0.1,
    });

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [handleObserver]);

  // Save Bookmark Toggle
  const handleToggleSave = (jobId: string) => {
    setSavedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
    jobService.toggleSaveJob(jobId).catch(() => {});
  };

  const handleQuickApplySuccess = (jobId: string) => {
    setAppliedJobIds((prev) => new Set(prev).add(jobId));
  };

  const handleResetAllFilters = () => {
    setActiveTab('all');
    setSearchQuery('');
    setAppliedFilters({});
  };

  return (
    <div className="min-h-screen bg-agri-bg text-slate-800 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-800 via-emerald-700 to-agri-primary border border-emerald-600 rounded-3xl p-6 sm:p-8 shadow-soft-lg relative overflow-hidden text-white">
          <div className="space-y-2 z-10">
            <span className="px-3 py-1 bg-white/10 text-emerald-100 border border-white/20 text-xs font-bold rounded-full inline-flex items-center space-x-1.5 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              <span>Worker Opportunity Portal</span>
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold font-heading text-white tracking-tight">
              Explore Agricultural Job Openings
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100 max-w-xl">
              Discover harvesting, plowing, machine operating, and seasonal farm vacancies across top agricultural districts.
            </p>
          </div>

          <Link
            to="/saved-jobs"
            className="self-start md:self-auto px-5 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-2xl text-xs transition-all flex items-center space-x-2 shadow-soft-sm backdrop-blur-sm"
          >
            <Bookmark className="w-4 h-4 fill-amber-300 text-amber-300" />
            <span>My Saved Bookmarks</span>
          </Link>
        </div>

        {/* Search & Filter Controls Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1">
            <SmartSearchBar
              initialValue={searchQuery}
              onSearch={(query: string) => setSearchQuery(query)}
              placeholder="Search by crop, title, skill, district, village..."
            />
          </div>

          <button
            onClick={() => setIsFilterDrawerOpen(true)}
            className="px-5 py-3.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-all shadow-soft-sm flex items-center justify-center space-x-2 flex-shrink-0"
          >
            <Filter className="w-4 h-4 text-agri-primary" />
            <span>Advanced Filters</span>
            {Object.keys(appliedFilters).length > 0 && (
              <span className="w-2 h-2 rounded-full bg-agri-primary"></span>
            )}
          </button>
        </div>

        {/* Quick Category Filter Tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-1.5 flex-shrink-0 ${
              activeTab === 'all'
                ? 'bg-agri-primary text-white shadow-agri-glow'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-soft-sm'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>All Vacancies</span>
          </button>

          <button
            onClick={() => setActiveTab('nearby')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-1.5 flex-shrink-0 ${
              activeTab === 'nearby'
                ? 'bg-agri-primary text-white shadow-agri-glow'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-soft-sm'
            }`}
          >
            <Navigation className="w-3.5 h-3.5 text-sky-600" />
            <span>Nearby (Within 50km)</span>
          </button>

          <button
            onClick={() => setActiveTab('urgent')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-1.5 flex-shrink-0 ${
              activeTab === 'urgent'
                ? 'bg-rose-600 text-white shadow-soft-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-soft-sm'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-rose-500" />
            <span>Urgent Hiring</span>
          </button>

          <button
            onClick={() => setActiveTab('featured')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-1.5 flex-shrink-0 ${
              activeTab === 'featured'
                ? 'bg-amber-600 text-white shadow-soft-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-soft-sm'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Featured Listings</span>
          </button>

          <button
            onClick={() => setActiveTab('highWage')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-1.5 flex-shrink-0 ${
              activeTab === 'highWage'
                ? 'bg-agri-primary text-white shadow-agri-glow'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-soft-sm'
            }`}
          >
            <IndianRupee className="w-3.5 h-3.5 text-agri-primary" />
            <span>High Daily Wage</span>
          </button>
        </div>

        {/* Main Job Cards Feed Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <JobFeedCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs text-center font-semibold">
            {error}
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl space-y-4 shadow-soft-sm">
            <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center text-agri-primary mx-auto">
              <Briefcase className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold font-heading text-slate-900">No Matching Job Openings Found</h3>
            <p className="text-xs text-slate-600 max-w-sm mx-auto">
              Try adjusting your search keywords, clearing specific filters, or selecting a different location tab.
            </p>
            <button
              onClick={handleResetAllFilters}
              className="px-6 py-2.5 bg-agri-primary hover:bg-agri-hover text-white text-xs font-semibold rounded-xl transition-all shadow-agri-glow"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => {
              const jobId = job._id || (job as any).id || '';
              const isSaved = savedJobIds.has(jobId);
              const isApplied = appliedJobIds.has(jobId);

              return (
                <div
                  key={jobId}
                  className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 flex flex-col justify-between shadow-soft-sm hover:shadow-soft-md transition-all duration-300 hover:border-emerald-300 relative group"
                >
                  <div className="space-y-3">
                    {/* Header Badges & Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded-full">
                          {job.category}
                        </span>

                        {job.isUrgent && (
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold rounded-full flex items-center space-x-0.5">
                            <Flame className="w-3 h-3 text-rose-600" />
                            <span>Urgent</span>
                          </span>
                        )}

                        {job.isFeatured && (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold rounded-full">
                            Featured
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            setShareJobId(jobId);
                            setShareJobTitle(job.title);
                          }}
                          className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-agri-primary rounded-xl border border-slate-200 transition-colors"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleToggleSave(jobId)}
                          className={`p-2 rounded-xl border transition-all ${
                            isSaved
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-slate-50 text-slate-600 hover:text-amber-600 border-slate-200'
                          }`}
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-amber-500 text-amber-500' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Job Title & Location */}
                    <div>
                      <Link
                        to={`/jobs/${jobId}`}
                        className="text-base font-bold font-heading text-slate-900 hover:text-agri-primary transition-colors line-clamp-1 block"
                      >
                        {job.title}
                      </Link>
                      <p className="text-xs text-slate-600 flex items-center space-x-1.5 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-agri-primary flex-shrink-0" />
                        <span>
                          {job.jobAddress?.district}, {job.jobAddress?.state} {job.jobAddress?.village ? `• ${job.jobAddress.village}` : ''}
                        </span>
                      </p>
                    </div>

                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-slate-500 block text-[10px] uppercase font-medium">Wage / Salary</span>
                        <span className="font-bold text-agri-primary flex items-center mt-0.5">
                          <IndianRupee className="w-3 h-3 mr-0.5" />
                          {job.dailyWage ? `${job.dailyWage}/Day` : `${job.monthlySalary}/Mo`}
                        </span>
                      </div>

                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-slate-500 block text-[10px] uppercase font-medium">Workers Needed</span>
                        <span className="font-bold text-slate-900 flex items-center mt-0.5">
                          <Users className="w-3 h-3 mr-1 text-agri-primary" />
                          {job.numberOfWorkers} Workers
                        </span>
                      </div>
                    </div>

                    {/* Facilities Chips */}
                    <div className="flex items-center space-x-3 text-[11px] text-slate-600 pt-1">
                      {job.accommodationProvided && (
                        <span className="flex items-center space-x-1 text-agri-primary font-medium">
                          <Home className="w-3 h-3" />
                          <span>Stay</span>
                        </span>
                      )}
                      {job.foodProvided && (
                        <span className="flex items-center space-x-1 text-agri-primary font-medium">
                          <Utensils className="w-3 h-3" />
                          <span>Food</span>
                        </span>
                      )}
                      {job.transportProvided && (
                        <span className="flex items-center space-x-1 text-agri-primary font-medium">
                          <Truck className="w-3 h-3" />
                          <span>Pickup</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom Action Bar */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Link
                      to={`/jobs/${jobId}`}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors border border-slate-200"
                    >
                      Details
                    </Link>

                    <button
                      onClick={() => setApplyJob(job)}
                      disabled={isApplied}
                      className={`flex-1 py-2 font-bold rounded-xl text-xs transition-all flex items-center justify-center space-x-1.5 ${
                        isApplied
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-agri-primary hover:bg-agri-hover text-white shadow-agri-glow'
                      }`}
                    >
                      {isApplied ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-agri-primary" />
                          <span>Applied</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Quick Apply</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Infinite Scroll Sentinel Element & Loading Spinner */}
        <div ref={sentinelRef} className="py-6 text-center">
          {loadingMore && (
            <div className="inline-flex items-center space-x-2 text-xs font-semibold text-agri-primary bg-white border border-slate-200 px-4 py-2 rounded-full shadow-soft-sm">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Loading more jobs...</span>
            </div>
          )}
        </div>

        {/* Filter Drawer */}
        <AdvancedJobFilterDrawer
          isOpen={isFilterDrawerOpen}
          filters={appliedFilters}
          onClose={() => setIsFilterDrawerOpen(false)}
          onApplyFilters={(filters) => {
            setAppliedFilters(filters);
            setIsFilterDrawerOpen(false);
          }}
          onResetFilters={() => setAppliedFilters({})}
        />

        {/* Share Modal */}
        {shareJobId && (
          <ShareJobModal
            isOpen={!!shareJobId}
            jobId={shareJobId}
            jobTitle={shareJobTitle}
            onClose={() => setShareJobId(null)}
          />
        )}

        {/* Quick Apply Modal */}
        {applyJob && (
          <QuickApplyModal
            isOpen={!!applyJob}
            job={applyJob}
            onClose={() => setApplyJob(null)}
            onSuccess={handleQuickApplySuccess}
          />
        )}
      </div>
    </div>
  );
};

/**
 * Skeleton Loader Component for Feed Cards
 */
const JobFeedCardSkeleton: React.FC = () => (
  <div className="h-64 bg-white border border-slate-200 rounded-3xl p-6 space-y-4 animate-pulse shadow-soft-sm">
    <div className="flex items-center justify-between">
      <div className="h-4 w-20 bg-slate-200 rounded-full"></div>
      <div className="h-6 w-12 bg-slate-200 rounded-xl"></div>
    </div>
    <div className="h-6 w-3/4 bg-slate-200 rounded-xl"></div>
    <div className="h-4 w-1/2 bg-slate-200 rounded-lg"></div>
    <div className="grid grid-cols-2 gap-2 pt-2">
      <div className="h-10 bg-slate-100 rounded-xl"></div>
      <div className="h-10 bg-slate-100 rounded-xl"></div>
    </div>
    <div className="h-9 bg-slate-200 rounded-xl mt-4"></div>
  </div>
);
