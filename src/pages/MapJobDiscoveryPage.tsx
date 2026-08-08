import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Map as MapIcon,
  List,
  Layers,
  Compass,
  Navigation,
  MapPin,
  Search,
  Filter,
  SlidersHorizontal,
  IndianRupee,
  Briefcase,
  Users,
  Clock,
  Sparkles,
  Award,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Bookmark,
  Share2,
  Calendar,
  Zap,
} from 'lucide-react';
import { getNearbyJobsApi, NearbyJobItem } from '../services/jobService';
import { useCurrentLocation } from '../hooks/useCurrentLocation';
import { LocationMap } from '../components/map/LocationMap';
import { JobMarkerCluster } from '../components/map/JobMarkerCluster';
import { UserLocationMarker } from '../components/map/UserLocationMarker';
import { AgriLocationPickerModal } from '../components/location/AgriLocationPickerModal';
import { ApplyJobModal } from '../components/applications/ApplyJobModal';
import { isValidCoordinate } from '../components/map/mapConfig';
import axios from 'axios';

const RADIUS_OPTIONS = [5, 10, 25, 50, 100];
const CROP_CATEGORY_OPTIONS = [
  'All Categories',
  'Plowing / Tillage',
  'Sowing / Planting',
  'Crop Protection / Spraying',
  'Irrigation Management',
  'Harvesting',
  'Threshing & Processing',
  'Tractor & Machinery',
  'General Farm Labor',
];
const WORK_TYPE_OPTIONS = ['All Work Types', 'Daily Basis', 'Monthly Contract', 'Task / Piece Rate'];

export const MapJobDiscoveryPage: React.FC = () => {
  const navigate = useNavigate();

  // Search Center Coordinates (Default: Amritsar 31.634, 75.8573)
  const [latitude, setLatitude] = useState<number>(31.634);
  const [longitude, setLongitude] = useState<number>(75.8573);
  const [addressLabel, setAddressLabel] = useState<string>('Detecting location...');

  // Filters State
  const [radius, setRadius] = useState<number>(10);
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [minWage, setMinWage] = useState<number>(0);
  const [minExperience, setMinExperience] = useState<number>(0);
  const [workType, setWorkType] = useState<string>('All Work Types');
  const [isUrgentOnly, setIsUrgentOnly] = useState<boolean>(false);
  const [isFeaturedOnly, setIsFeaturedOnly] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>('');
  const [sort, setSort] = useState<'distance' | 'newest' | 'wage'>('distance');
  const [page, setPage] = useState<number>(1);

  // View Mode: 'split' | 'grid' | 'map'
  const [viewMode, setViewMode] = useState<'split' | 'grid' | 'map'>('split');

  // Data & State
  const [jobs, setJobs] = useState<NearbyJobItem[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals State
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState<boolean>(false);
  const [selectedJobForApply, setSelectedJobForApply] = useState<any | null>(null);

  // Debounce Ref for Map Movement
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // GPS Location Hook
  const { coordinates: userGps, refetchLocation: getGpsLocation, loading: isGpsLoading } = useCurrentLocation({
    autoFetch: true,
  });

  useEffect(() => {
    if (userGps) {
      setLatitude(userGps.latitude);
      setLongitude(userGps.longitude);
      reverseGeocode(userGps.latitude, userGps.longitude);
    }
  }, [userGps]);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await axios.get('/api/v1/location/reverse', {
        params: { lat, lng },
        timeout: 4000,
      });
      if (res.data?.success && res.data?.data) {
        const d = res.data.data;
        setAddressLabel([d.village, d.district, d.state].filter(Boolean).join(', ') || 'Custom Center');
      }
    } catch {
      setAddressLabel(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  };

  // Fetch Nearby Jobs Service with debouncing
  const fetchNearbyJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getNearbyJobsApi({
        latitude,
        longitude,
        radius,
        category: selectedCategory !== 'All Categories' ? selectedCategory : undefined,
        minWage: minWage > 0 ? minWage : undefined,
        minExperience: minExperience > 0 ? minExperience : undefined,
        workType: workType !== 'All Work Types' ? workType : undefined,
        isUrgent: isUrgentOnly ? true : undefined,
        isFeatured: isFeaturedOnly ? true : undefined,
        startDate: startDate || undefined,
        sort,
        page,
        limit: 10,
      });

      if (response?.data && Array.isArray(response.data)) {
        setJobs(response.data);
        if (response.meta?.pagination) {
          setPagination(response.meta.pagination);
        }
      } else {
        setJobs([]);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to search nearby farm jobs.');
    } finally {
      setLoading(false);
    }
  }, [
    latitude,
    longitude,
    radius,
    selectedCategory,
    minWage,
    minExperience,
    workType,
    isUrgentOnly,
    isFeaturedOnly,
    startDate,
    sort,
    page,
  ]);

  useEffect(() => {
    fetchNearbyJobs();
  }, [fetchNearbyJobs]);

  // Debounced Map Center Update Handler (Prevents API spam on map movement)
  const handleMapMoveCenter = (newLat: number, newLng: number) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      setLatitude(newLat);
      setLongitude(newLng);
      setPage(1);
      reverseGeocode(newLat, newLng);
    }, 600);
  };

  const handleLocationPick = (sel: { latitude: number; longitude: number; district?: string; state?: string; village?: string }) => {
    setLatitude(sel.latitude);
    setLongitude(sel.longitude);
    setPage(1);
    setAddressLabel(
      [sel.village, sel.district, sel.state].filter(Boolean).join(', ') ||
        `${sel.latitude.toFixed(4)}, ${sel.longitude.toFixed(4)}`
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pb-16">
      {/* Top Banner Header */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/60 border-b border-slate-800 pt-8 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 font-bold text-xs mb-2">
                <MapIcon className="w-3.5 h-3.5" />
                <span>Geospatial Interactive Job Map</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
                Map-Based Job Discovery
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Explore nearby agricultural vacancies with interactive map pins & spatial clustering
              </p>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center space-x-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 self-start md:self-auto">
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all ${
                  viewMode === 'split'
                    ? 'bg-emerald-500 text-slate-950 shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span className="hidden sm:inline">Split View</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all ${
                  viewMode === 'grid'
                    ? 'bg-emerald-500 text-slate-950 shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <List className="w-4 h-4" />
                <span>Job Cards</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all ${
                  viewMode === 'map'
                    ? 'bg-emerald-500 text-slate-950 shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <MapIcon className="w-4 h-4" />
                <span>Interactive Map</span>
              </button>
            </div>
          </div>

          {/* Search Area & Radius Toolbar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              {/* Location Bar */}
              <div className="md:col-span-6 bg-slate-950/80 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-3 truncate">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Current Search Center
                    </span>
                    <span className="font-bold text-xs text-white truncate block">{addressLabel}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={() => getGpsLocation()}
                    disabled={isGpsLoading}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1"
                  >
                    {isGpsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Compass className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">GPS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsLocationPickerOpen(true)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    Change Pin
                  </button>
                </div>
              </div>

              {/* Radius Options */}
              <div className="md:col-span-6 flex items-center justify-start md:justify-end space-x-2 overflow-x-auto pb-1 md:pb-0">
                <span className="text-xs font-bold text-slate-400 shrink-0 mr-1 flex items-center space-x-1">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Search Radius:</span>
                </span>
                {RADIUS_OPTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setRadius(r);
                      setPage(1);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all shrink-0 ${
                      radius === r
                        ? 'bg-emerald-500 text-slate-950 shadow-md ring-2 ring-emerald-400/30'
                        : 'bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-300'
                    }`}
                  >
                    {r} km
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Bar Row */}
            <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
              {/* Category Filter */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Crop Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {CROP_CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Work Type */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Work Type</label>
                <select
                  value={workType}
                  onChange={(e) => {
                    setWorkType(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {WORK_TYPE_OPTIONS.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>

              {/* Min Wage */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Min Daily Wage</label>
                <select
                  value={minWage}
                  onChange={(e) => {
                    setMinWage(Number(e.target.value));
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value={0}>Any Wage</option>
                  <option value={400}>₹400 / day+</option>
                  <option value={600}>₹600 / day+</option>
                  <option value={800}>₹800 / day+</option>
                  <option value={1000}>₹1000 / day+</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Toggles (Urgent / Featured) */}
              <div className="flex items-center space-x-2 pt-4">
                <label className="inline-flex items-center space-x-1 cursor-pointer text-[11px] font-semibold text-rose-300">
                  <input
                    type="checkbox"
                    checked={isUrgentOnly}
                    onChange={(e) => {
                      setIsUrgentOnly(e.target.checked);
                      setPage(1);
                    }}
                    className="rounded bg-slate-950 border-slate-800 text-rose-500 focus:ring-rose-500"
                  />
                  <span>Urgent Hiring</span>
                </label>
              </div>

              {/* Sort Selection */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Sort Order</label>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="distance">Nearest Distance</option>
                  <option value="newest">Recently Posted</option>
                  <option value="wage">Highest Wage Rate</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {error && (
          <div className="p-4 mb-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-sm flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mx-auto" />
            <p className="text-sm font-semibold text-slate-400">Loading map markers and nearby farm vacancies within {radius}km...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-16 text-center bg-slate-900/40 border border-slate-800 rounded-3xl p-8 space-y-4 max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Briefcase className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white">No Vacancies Found Within {radius} km</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              No active farm jobs match your filter criteria in this region. Try expanding the search radius or selecting a different crop category.
            </p>
            <div className="flex justify-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setRadius(25)}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow-lg"
              >
                Expand Radius to 25 km
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('All Categories');
                  setWorkType('All Work Types');
                  setMinWage(0);
                  setIsUrgentOnly(false);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors"
              >
                Reset Filters
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Split View */}
            {viewMode === 'split' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Job Cards List */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
                    <span>Showing {jobs.length} active vacancies within {radius}km</span>
                    <span>Page {pagination.page} of {pagination.totalPages}</span>
                  </div>

                  {jobs.map((item) => (
                    <JobDiscoveryCard
                      key={item.job._id}
                      item={item}
                      onApply={() => setSelectedJobForApply(item.job)}
                    />
                  ))}
                </div>

                {/* Right Column: Sticky Leaflet Map with Marker Clustering */}
                <div className="lg:col-span-5 sticky top-6">
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-3 shadow-2xl">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 text-xs mb-2">
                      <span className="font-bold text-white flex items-center space-x-1.5">
                        <MapIcon className="w-4 h-4 text-emerald-400" />
                        <span>Interactive Clustered Map</span>
                      </span>
                      <span className="text-[10px] text-slate-400">{jobs.length} Job Pins</span>
                    </div>

                    <div className="rounded-2xl overflow-hidden h-[560px] border border-slate-800">
                      <LocationMap center={[latitude, longitude]} zoom={11} height="h-[560px]">
                        <UserLocationMarker position={[latitude, longitude]} popupText="Search Center Location" />
                        <JobMarkerCluster
                          jobs={jobs}
                          onJobSelect={(jobId) => navigate(`/jobs/${jobId}`)}
                        />
                      </LocationMap>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {jobs.map((item) => (
                  <JobDiscoveryCard
                    key={item.job._id}
                    item={item}
                    onApply={() => setSelectedJobForApply(item.job)}
                  />
                ))}
              </div>
            )}

            {/* Fullscreen Map View */}
            {viewMode === 'map' && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl">
                <div className="rounded-2xl overflow-hidden h-[640px] border border-slate-800">
                  <LocationMap center={[latitude, longitude]} zoom={11} height="h-[640px]">
                    <UserLocationMarker position={[latitude, longitude]} popupText="Search Center Location" />
                    <JobMarkerCluster
                      jobs={jobs}
                      onJobSelect={(jobId) => navigate(`/jobs/${jobId}`)}
                    />
                  </LocationMap>
                </div>
              </div>
            )}

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center space-x-3 pt-6 border-t border-slate-800">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 rounded-xl text-xs font-bold flex items-center space-x-1 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <span className="text-xs font-bold text-slate-400">
                  Page {pagination.page} of {pagination.totalPages}
                </span>

                <button
                  type="button"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 rounded-xl text-xs font-bold flex items-center space-x-1 transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Location Picker Modal */}
      <AgriLocationPickerModal
        isOpen={isLocationPickerOpen}
        onClose={() => setIsLocationPickerOpen(false)}
        initialLatitude={latitude}
        initialLongitude={longitude}
        onConfirm={handleLocationPick}
        title="Set Search Center for Map Job Discovery"
      />

      {/* Apply Job Modal */}
      {selectedJobForApply && (
        <ApplyJobModal
          job={selectedJobForApply}
          isOpen={!!selectedJobForApply}
          onClose={() => setSelectedJobForApply(null)}
          onSuccess={() => setSelectedJobForApply(null)}
        />
      )}
    </div>
  );
};

// Subcomponent: Individual Job Discovery Card Component
const JobDiscoveryCard: React.FC<{ item: NearbyJobItem; onApply: () => void }> = ({ item, onApply }) => {
  const navigate = useNavigate();
  const { job, distanceKm } = item;

  return (
    <div className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-3xl p-5 shadow-xl transition-all duration-300 space-y-4 group text-left">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 truncate">
          <div className="flex flex-wrap items-center gap-1.5">
            {job.isUrgent && (
              <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full text-[10px] font-bold flex items-center space-x-1">
                <Sparkles className="w-3 h-3" />
                <span>Urgent</span>
              </span>
            )}
            <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold">
              {job.category}
            </span>
          </div>

          <h3 className="font-heading font-extrabold text-base text-white group-hover:text-emerald-400 transition-colors truncate">
            {job.title}
          </h3>
          <p className="text-xs text-slate-400 truncate">
            📍 {job.jobAddress?.village ? `${job.jobAddress.village}, ` : ''}
            {job.jobAddress?.district}, {job.jobAddress?.state}
          </p>
        </div>

        {distanceKm !== undefined && (
          <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs font-bold shrink-0 flex items-center space-x-1">
            <Navigation className="w-3 h-3" />
            <span>{distanceKm} km</span>
          </div>
        )}
      </div>

      {/* Wage & Work Type Stats */}
      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 text-center">
        <div>
          <span className="text-[10px] text-slate-500 uppercase font-bold block">Wage Rate</span>
          <span className="font-extrabold text-emerald-400 text-sm block">
            ₹{job.dailyWage || job.monthlySalary || 0}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 uppercase font-bold block">Work Type</span>
          <span className="font-bold text-white block truncate">{job.workType}</span>
        </div>
      </div>

      {/* Skill Tags */}
      {job.requiredSkills && job.requiredSkills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {job.requiredSkills.slice(0, 3).map((skill, i) => (
            <span key={i} className="px-2 py-0.5 rounded-md bg-slate-800/60 text-slate-300 text-[10px]">
              {skill}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center space-x-2 pt-1">
        <button
          type="button"
          onClick={onApply}
          className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center space-x-1.5"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Apply Now</span>
        </button>

        <Link
          to={`/jobs/${job._id}`}
          className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-colors"
        >
          View Map & Details
        </Link>
      </div>
    </div>
  );
};
