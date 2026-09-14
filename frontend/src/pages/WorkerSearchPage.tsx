import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  MapPin,
  Filter,
  Star,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import { motion } from 'framer-motion';

import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { MOCK_JOB_CATEGORIES, MOCK_FARMS_LOCATIONS } from '../data/mockData';
import { searchWorkersApi } from '../services/workerService';
import { useAuth } from '../context/AuthContext';
import type { WorkerProfile, ToastMessage } from '../types';

interface WorkerSearchPageProps {
  addToast?: (toast: Omit<ToastMessage, 'id'>) => void;
}

export const WorkerSearchPage: React.FC<WorkerSearchPageProps> = ({ addToast }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();

  // URL query parameters
  const querySearch = searchParams.get('search') || searchParams.get('keyword') || '';
  const queryLocation = searchParams.get('location') || '';
  const queryCategory = searchParams.get('category') || '';
  const queryPage = parseInt(searchParams.get('page') || '1', 10) || 1;

  // Local Form Controls synced with URL
  const [keywordInput, setKeywordInput] = useState(querySearch);
  const [locationInput, setLocationInput] = useState(queryLocation);
  const [categoryInput, setCategoryInput] = useState(queryCategory);

  // Synchronize form controls when URL parameters change (e.g. Back/Forward button)
  useEffect(() => {
    setKeywordInput(querySearch);
    setLocationInput(queryLocation);
    setCategoryInput(queryCategory);
  }, [querySearch, queryLocation, queryCategory]);

  // Real Database Results State
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch real workers from MongoDB backend
  const fetchWorkers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await searchWorkersApi({
        search: querySearch,
        location: queryLocation,
        category: queryCategory,
        page: queryPage,
        limit: 12,
      });

      setWorkers(Array.isArray(data.workers) ? data.workers : []);
      if (data.pagination) {
        setPagination({
          page: data.pagination.page || 1,
          limit: data.pagination.limit || 12,
          total: data.pagination.total || 0,
          totalPages: data.pagination.totalPages || 1,
        });
      }
    } catch (err: any) {
      console.error('Failed to search workers:', err);
      setErrorMessage(err.response?.data?.message || err.message || 'Unable to load workers. Please try again.');
      setWorkers([]);
    } finally {
      setIsLoading(false);
    }
  }, [querySearch, queryLocation, queryCategory, queryPage]);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  // Update URL search parameters when form is submitted
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams();
    if (keywordInput.trim()) {
      newParams.set('search', keywordInput.trim());
    }
    if (locationInput && locationInput !== 'All Locations') {
      newParams.set('location', locationInput);
    }
    if (categoryInput && categoryInput !== 'All Categories') {
      newParams.set('category', categoryInput);
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setKeywordInput('');
    setLocationInput('');
    setCategoryInput('');
    setSearchParams(new URLSearchParams());
  };

  // Change page
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', newPage.toString());
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Quick Hire Click Handler (Enforces Authentication for Protected Action)
  const handleQuickHire = (worker: WorkerProfile) => {
    if (!isAuthenticated || !user) {
      if (addToast) {
        addToast({
          type: 'info',
          title: 'Sign In Required',
          message: `Please sign in as a Farmer to hire ${worker.name}.`,
        });
      }
      navigate('/login', {
        state: {
          from: {
            pathname: '/farmer/nearby-workers',
            search: `?targetWorkerId=${worker.id || worker._id}`,
          },
        },
      });
      return;
    }

    const userRole = (user?.role || '').trim().toUpperCase();
    if (userRole !== 'FARMER') {
      if (addToast) {
        addToast({
          type: 'warning',
          title: 'Farmer Account Required',
          message: 'Only registered Farmers can hire workers. Please sign in with a Farmer account.',
        });
      }
      return;
    }

    // Farmer is authenticated: navigate to applications or direct hiring
    navigate('/farmer/applications');
    if (addToast) {
      addToast({
        type: 'success',
        title: 'Continue Hiring',
        message: `You are signed in as a Farmer. Continue hiring ${worker.name} from your applications dashboard.`,
      });
    }
  };

  const hasActiveFilters = Boolean(
    querySearch ||
    (queryLocation && queryLocation !== 'All Locations') ||
    (queryCategory && queryCategory !== 'All Categories')
  );

  return (
    <div className="min-h-screen bg-agri-bg flex flex-col text-slate-800">
      <Navbar />

      <main className="flex-1 pt-28 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header & Breadcrumb */}
          <div className="mb-8">
            <div className="flex items-center space-x-2 text-xs text-slate-500 mb-2">
              <Link to="/" className="hover:text-agri-primary transition-colors">
                Home
              </Link>
              <span>/</span>
              <span className="text-slate-800 font-semibold">Worker Discovery</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold font-heading text-agri-text tracking-tight">
              Search Farm Workers & Operators
            </h1>
            <p className="mt-2 text-sm text-slate-600 max-w-2xl">
              Discover background-verified agricultural specialists, machinery operators, and harvesting crews ready for immediate deployment.
            </p>
          </div>

          {/* Search Controls Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-soft-md mb-8">
            <form
              onSubmit={handleFormSubmit}
              className="flex flex-col md:flex-row items-center gap-3"
            >
              {/* Keyword / Skill Input */}
              <div className="flex-1 w-full flex items-center bg-slate-50 px-4 py-3 rounded-2xl border border-slate-200 text-left space-x-3">
                <Search className="w-5 h-5 text-agri-primary shrink-0" />
                <input
                  type="text"
                  placeholder="Skill, crop type (e.g. Tractor, Harvesting, Wheat)..."
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  className="w-full text-sm outline-none placeholder-slate-400 bg-transparent text-slate-800"
                />
              </div>

              {/* Location Select */}
              <div className="w-full md:w-56 flex items-center bg-slate-50 px-3.5 py-3 rounded-2xl border border-slate-200 text-left space-x-2">
                <MapPin className="w-4 h-4 text-agri-primary shrink-0" />
                <select
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  className="w-full text-xs font-medium outline-none bg-transparent text-slate-700 cursor-pointer"
                >
                  <option value="">All Locations</option>
                  {MOCK_FARMS_LOCATIONS.map((loc, idx) => (
                    <option key={idx} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Select */}
              <div className="w-full md:w-56 flex items-center bg-slate-50 px-3.5 py-3 rounded-2xl border border-slate-200 text-left space-x-2">
                <Filter className="w-4 h-4 text-agri-primary shrink-0" />
                <select
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  className="w-full text-xs font-medium outline-none bg-transparent text-slate-700 cursor-pointer"
                >
                  <option value="All Categories">All Categories</option>
                  {MOCK_JOB_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.title}>
                      {cat.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Submit & Reset Buttons */}
              <div className="w-full md:w-auto flex items-center gap-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="flex-1 md:flex-initial whitespace-nowrap shadow-soft-sm"
                  leftIcon={<Search className="w-4 h-4" />}
                >
                  Search Workers
                </Button>

                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={handleClearFilters}
                    className="whitespace-nowrap border-slate-200 text-slate-600 hover:text-slate-800"
                    title="Reset Filters"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </form>

            {/* Active Filter Tags */}
            {hasActiveFilters && (
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="font-semibold text-slate-500">Active Filters:</span>
                {querySearch && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 text-agri-dark border border-emerald-200">
                    Keyword: "{querySearch}"
                  </span>
                )}
                {queryLocation && queryLocation !== 'All Locations' && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 text-agri-dark border border-emerald-200">
                    Location: {queryLocation}
                  </span>
                )}
                {queryCategory && queryCategory !== 'All Categories' && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 text-agri-dark border border-emerald-200">
                    Category: {queryCategory}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Results Status Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="text-xs sm:text-sm text-slate-600 font-medium">
              {!isLoading && !errorMessage && (
                <span>
                  Found <strong className="text-agri-text font-bold">{pagination.total}</strong> verified {pagination.total === 1 ? 'worker' : 'workers'}
                  {hasActiveFilters && ' matching your search'}
                </span>
              )}
            </div>

            {pagination.totalPages > 1 && (
              <div className="text-xs text-slate-500">
                Page {pagination.page} of {pagination.totalPages}
              </div>
            )}
          </div>

          {/* ------------------- LOADING STATE SKELETON ------------------- */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-soft-sm space-y-4 animate-pulse text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-14 h-14 rounded-2xl bg-slate-200" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-slate-200 rounded-lg w-2/3" />
                        <div className="h-3 bg-slate-100 rounded-md w-1/2" />
                      </div>
                    </div>
                    <div className="w-10 h-4 bg-slate-100 rounded" />
                  </div>
                  <div className="space-y-2 pt-2">
                    <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-full" />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <div className="h-5 bg-slate-100 rounded-md w-16" />
                    <div className="h-5 bg-slate-100 rounded-md w-20" />
                    <div className="h-5 bg-slate-100 rounded-md w-16" />
                  </div>
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="h-5 bg-slate-200 rounded w-20" />
                    <div className="h-8 bg-slate-200 rounded-xl w-24" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ------------------- ERROR STATE ------------------- */}
          {!isLoading && errorMessage && (
            <div className="py-16 px-6 text-center bg-rose-50/50 rounded-3xl border border-rose-200/80 shadow-soft-sm max-w-2xl mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-rose-800 font-heading">
                Unable to Load Workers
              </h3>
              <p className="text-xs sm:text-sm text-rose-600 mt-2 max-w-md mx-auto">
                {errorMessage}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchWorkers}
                className="mt-6 border-rose-300 text-rose-700 hover:bg-rose-100"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* ------------------- EMPTY STATE ------------------- */}
          {!isLoading && !errorMessage && workers.length === 0 && (
            <div className="py-16 px-6 text-center bg-white rounded-3xl border border-slate-200 shadow-soft-sm max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-agri-primary flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 font-heading">
                No Workers Found
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-md mx-auto">
                We couldn't find any verified workers matching your search criteria. Try adjusting your keyword, choosing another location, or clearing filters.
              </p>
              {hasActiveFilters && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleClearFilters}
                  className="mt-6"
                  leftIcon={<RotateCcw className="w-4 h-4" />}
                >
                  Reset All Filters
                </Button>
              )}
            </div>
          )}

          {/* ------------------- WORKER CARDS GRID ------------------- */}
          {!isLoading && !errorMessage && workers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workers.map((worker) => (
                <motion.div
                  key={worker.id || worker._id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="p-6 text-left flex flex-col justify-between h-full group hover:shadow-soft-md transition-shadow">
                    <div>
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            {worker.avatar || worker.profileImage ? (
                              <img
                                src={worker.avatar || worker.profileImage}
                                alt={worker.name}
                                className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-200 group-hover:border-agri-primary transition-colors"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-agri-primary font-bold text-lg flex items-center justify-center border-2 border-emerald-200 group-hover:border-agri-primary transition-colors uppercase">
                                {worker.name ? worker.name.charAt(0) : 'W'}
                              </div>
                            )}
                            {worker.isVerified && (
                              <div
                                className="absolute -bottom-1 -right-1 bg-agri-primary text-white p-0.5 rounded-full"
                                title="Verified Worker"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </div>
                          <div>
                            <h3 className="font-bold font-heading text-base text-agri-text group-hover:text-agri-primary transition-colors">
                              {worker.name}
                            </h3>
                            <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-0.5">
                              <MapPin className="w-3.5 h-3.5 text-agri-primary shrink-0" />
                              <span className="line-clamp-1">{worker.location || 'India'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end shrink-0">
                          <div className="flex items-center space-x-1 text-amber-500 text-xs font-bold">
                            <Star className="w-4 h-4 fill-current" />
                            <span>{(worker.rating || 5.0).toFixed(1)}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            ({worker.completedJobs ?? worker.totalJobsCompleted ?? worker.reviewsCount ?? 0} jobs)
                          </span>
                        </div>
                      </div>

                      {/* Title & Badges */}
                      <div className="mt-4">
                        <p className="text-xs font-semibold text-agri-dark font-heading">
                          {worker.title || 'Agricultural Specialist'}
                        </p>
                        {worker.badge && (
                          <div className="mt-1.5">
                            <Badge variant="amber" size="sm">
                              {worker.badge}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Bio */}
                      {worker.bio && (
                        <p className="mt-3 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {worker.bio}
                        </p>
                      )}

                      {/* Skills */}
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {(worker.skills || []).slice(0, 4).map((skill, sIdx) => (
                          <span
                            key={sIdx}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 text-agri-dark border border-emerald-200"
                          >
                            {skill}
                          </span>
                        ))}
                        {(worker.skills || []).length > 4 && (
                          <span className="text-[10px] text-slate-400 self-center">
                            +{(worker.skills || []).length - 4} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Wage & Actions */}
                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[11px] text-slate-400 block">Expected Wage</span>
                        <span className="text-base font-extrabold font-heading text-agri-text">
                          ₹{worker.dailyWage ?? worker.expectedDailyWage ?? 0}
                          <span className="text-xs font-normal text-slate-500"> / day</span>
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/profile/user/${worker.ownerId || worker.id || worker._id}`}
                          className="text-xs font-semibold text-slate-600 hover:text-agri-primary px-2.5 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                        >
                          View Profile
                        </Link>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleQuickHire(worker)}
                        >
                          Quick Hire
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {/* ------------------- PAGINATION CONTROLS ------------------- */}
          {!isLoading && !errorMessage && pagination.totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => handlePageChange(pagination.page - 1)}
                leftIcon={<ChevronLeft className="w-4 h-4" />}
              >
                Previous
              </Button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p)}
                    className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                      p === pagination.page
                        ? 'bg-agri-primary text-white shadow-soft-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => handlePageChange(pagination.page + 1)}
                rightIcon={<ChevronRight className="w-4 h-4" />}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};
