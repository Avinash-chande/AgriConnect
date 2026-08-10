import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Compass,
  Navigation,
  Filter,
  Layers,
  Map as MapIcon,
  List,
  IndianRupee,
  Briefcase,
  Users,
  CheckCircle2,
  Star,
  Clock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  SlidersHorizontal,
  Search,
  Sparkles,
} from 'lucide-react';
import { jobService } from "../services/jobService";
import type { NearbyJobItem } from "../services/jobService";
import { useCurrentLocation } from '../hooks/useCurrentLocation';
import { LocationMap } from '../components/map/LocationMap';
import { JobMarker } from '../components/map/JobMarker';
import { UserLocationMarker } from '../components/map/UserLocationMarker';
import { AgriLocationPickerModal } from '../components/location/AgriLocationPickerModal';
import { ApplyJobModal } from '../components/applications/ApplyJobModal';
import { JOB_CATEGORIES } from '../constants/jobConstants';
import { isValidCoordinate } from '../components/map/mapConfig';
import axios from 'axios';

const RADIUS_OPTIONS = [5, 10, 25, 50, 100];

export const NearbyJobsPage: React.FC = () => {
  // Coordinates State (Default: Amritsar center 31.634, 75.8573)
  const [latitude, setLatitude] = useState<number>(31.634);
  const [longitude, setLongitude] = useState<number>(75.8573);
  const [addressPreview, setAddressPreview] = useState<string>('Detecting location...');
  
  // Filter & Pagination State
  const [radius, setRadius] = useState<number>(10);
  const [category, setCategory] = useState<string>('all');
  const [sort, setSort] = useState<'distance' | 'newest'>('distance');
  const [page, setPage] = useState<number>(1);

  // View Mode: 'split' | 'grid' | 'map'
  const [viewMode, setViewMode] = useState<'split' | 'grid' | 'map'>('split');

  // Data State
  const [nearbyItems, setNearbyItems] = useState<NearbyJobItem[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState<boolean>(false);
  const [selectedApplyJobId, setSelectedApplyJobId] = useState<string | null>(null);
  const [selectedApplyJobTitle, setSelectedApplyJobTitle] = useState<string>('');

  // Geolocation Hook
  const { coordinates: userGpsCoords, refetchLocation: getGpsLocation, loading: isGpsLoading } = useCurrentLocation({
    autoFetch: true,
  });

  // When browser GPS arrives, update coordinates
  useEffect(() => {
    if (userGpsCoords) {
      setLatitude(userGpsCoords.latitude);
      setLongitude(userGpsCoords.longitude);
      reverseGeocodeCoords(userGpsCoords.latitude, userGpsCoords.longitude);
    }
  }, [userGpsCoords]);

  // Reverse geocode label helper
  const reverseGeocodeCoords = async (lat: number, lng: number) => {
    try {
      const res = await axios.get('/api/v1/location/reverse', {
        params: { lat, lng },
        timeout: 4000,
      });
      if (res.data?.success && res.data?.data) {
        const addr = res.data.data;
        setAddressPreview(
          [addr.village, addr.district, addr.state].filter(Boolean).join(', ') || 'Custom Coordinates'
        );
      }
    } catch {
      setAddressPreview(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  };

  // Fetch Nearby Jobs API
  const fetchNearbyJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await jobService.getNearbyJobs({
        latitude,
        longitude,
        radius,
        page,
        limit: 10,
        sort,
        category: category !== 'all' ? category : undefined,
      });

      if (response?.data && Array.isArray(response.data)) {
        setNearbyItems(response.data);
        if (response.meta?.pagination) {
          setPagination(response.meta.pagination);
        }
      } else {
        setNearbyItems([]);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch nearby jobs.');
    } finally {
      setLoading(false);
    }
  }, [latitude, longitude, radius, page, sort, category]);

  useEffect(() => {
    fetchNearbyJobs();
  }, [fetchNearbyJobs]);

  const handleLocationPick = (selected: { latitude: number; longitude: number; district?: string; state?: string; village?: string }) => {
    setLatitude(selected.latitude);
    setLongitude(selected.longitude);
    setPage(1);
    setAddressPreview(
      [selected.village, selected.district, selected.state].filter(Boolean).join(', ') ||
        `${selected.latitude.toFixed(4)}, ${selected.longitude.toFixed(4)}`
    );
  };

  const handleGpsDetect = async () => {
    const res = await getGpsLocation();
    if (res?.coordinates) {
      setLatitude(res.coordinates.latitude);
      setLongitude(res.coordinates.longitude);
      setPage(1);
      reverseGeocodeCoords(res.coordinates.latitude, res.coordinates.longitude);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pb-16">
      {/* Header Banner */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/60 border-b border-slate-800 pt-8 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 font-bold text-xs mb-2">
                <Compass className="w-3.5 h-3.5" />
                <span>Geospatial Job Matching Engine</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
                Nearby Agricultural Vacancies
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Discover active farm work opportunities within your local radius
              </p>
            </div>

            {/* View Mode Switches */}
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

          {/* Location & Radius Control Bar */}
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
                      Search Center Location
                    </span>
                    <span className="font-bold text-xs text-white truncate block">{addressPreview}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={handleGpsDetect}
                    disabled={isGpsLoading}
                    title="Detect current GPS position"
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {isGpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
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

              {/* Radius Options Pills */}
              <div className="md:col-span-6 flex items-center justify-start md:justify-end space-x-2 overflow-x-auto pb-1 md:pb-0">
                <span className="text-xs font-bold text-slate-400 shrink-0 mr-1 flex items-center space-x-1">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Radius:</span>
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

            {/* Additional Filter Row */}
            <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-400 font-semibold">Category Filter:</span>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All Categories ({JOB_CATEGORIES.length})</option>
                  {JOB_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-slate-400 font-semibold">Sort By:</span>
                <button
                  type="button"
                  onClick={() => setSort('distance')}
                  className={`px-3 py-1 rounded-xl font-semibold transition-colors ${
                    sort === 'distance' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Nearest Distance
                </button>
                <button
                  type="button"
                  onClick={() => setSort('newest')}
                  className={`px-3 py-1 rounded-xl font-semibold transition-colors ${
                    sort === 'newest' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Recently Posted
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
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
            <p className="text-sm font-semibold text-slate-400">Querying 2dsphere index for active jobs within {radius}km...</p>
          </div>
        ) : nearbyItems.length === 0 ? (
          <div className="py-16 text-center bg-slate-900/40 border border-slate-800 rounded-3xl p-8 space-y-4 max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Compass className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white">No Vacancies Found Within {radius} km</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              We couldn't find active job postings near your current coordinates. Try expanding your search radius to 25km or 50km.
            </p>
            <div className="flex justify-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setRadius(25)}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow-lg"
              >
                Expand to 25 km
              </button>
              <button
                type="button"
                onClick={() => setRadius(50)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors"
              >
                Expand to 50 km
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
                    <span>Showing {nearbyItems.length} active jobs within {radius}km</span>
                    <span>Page {pagination.page} of {pagination.totalPages}</span>
                  </div>

                  {nearbyItems.map((item) => (
                    <NearbyJobCard
                      key={item.job._id}
                      item={item}
                      onApply={(id, title) => {
                        setSelectedApplyJobId(id);
                        setSelectedApplyJobTitle(title);
                      }}
                    />
                  ))}
                </div>

                {/* Right Column: Sticky Leaflet Map */}
                <div className="lg:col-span-5 sticky top-6">
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-3 shadow-2xl">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 text-xs mb-2">
                      <span className="font-bold text-white flex items-center space-x-1.5">
                        <MapIcon className="w-4 h-4 text-emerald-400" />
                        <span>Interactive Leaflet Map</span>
                      </span>
                      <span className="text-[10px] text-slate-400">{nearbyItems.length} Map Pins</span>
                    </div>

                    <div className="rounded-2xl overflow-hidden h-[540px] border border-slate-800">
                      <LocationMap center={[latitude, longitude]} zoom={11} height="h-[540px]">
                        <UserLocationMarker position={[latitude, longitude]} popupText="Search Center Location" />

                        {nearbyItems.map((item) => {
                          const itemLat = item.job.jobAddress?.latitude || item.location?.coordinates[1];
                          const itemLng = item.job.jobAddress?.longitude || item.location?.coordinates[0];
                          if (!isValidCoordinate(itemLat, itemLng)) return null;

                          return (
                            <JobMarker
                              key={item.job._id}
                              position={[itemLat, itemLng]}
                              title={item.job.title}
                              category={item.job.category}
                              wageText={item.job.formattedWage || `₹${item.job.dailyWage || item.job.monthlySalary}`}
                              district={item.job.jobAddress.district}
                              state={item.job.jobAddress.state}
                            />
                          );
                        })}
                      </LocationMap>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {nearbyItems.map((item) => (
                  <NearbyJobCard
                    key={item.job._id}
                    item={item}
                    onApply={(id, title) => {
                      setSelectedApplyJobId(id);
                      setSelectedApplyJobTitle(title);
                    }}
                  />
                ))}
              </div>
            )}

            {/* Fullscreen Map View */}
            {viewMode === 'map' && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl">
                <div className="rounded-2xl overflow-hidden h-[620px] border border-slate-800">
                  <LocationMap center={[latitude, longitude]} zoom={11} height="h-[620px]">
                    <UserLocationMarker position={[latitude, longitude]} popupText="Your Location Center" />

                    {nearbyItems.map((item) => {
                      const itemLat = item.job.jobAddress?.latitude || item.location?.coordinates[1];
                      const itemLng = item.job.jobAddress?.longitude || item.location?.coordinates[0];
                      if (!isValidCoordinate(itemLat, itemLng)) return null;

                      return (
                        <JobMarker
                          key={item.job._id}
                          position={[itemLat, itemLng]}
                          title={item.job.title}
                          category={item.job.category}
                          wageText={item.job.formattedWage || `₹${item.job.dailyWage || item.job.monthlySalary}`}
                          district={item.job.jobAddress.district}
                          state={item.job.jobAddress.state}
                        />
                      );
                    })}
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

      {/* Modal Pick Custom Location */}
      <AgriLocationPickerModal
        isOpen={isLocationPickerOpen}
        onClose={() => setIsLocationPickerOpen(false)}
        initialLatitude={latitude}
        initialLongitude={longitude}
        onConfirm={handleLocationPick}
        title="Select Center Location for Nearby Search"
      />

      {/* Modal Apply Job */}
      {selectedApplyJobId && (
        <ApplyJobModal
          isOpen={!!selectedApplyJobId}
          onClose={() => setSelectedApplyJobId(null)}
          jobId={selectedApplyJobId}
          jobTitle={selectedApplyJobTitle}
        />
      )}
    </div>
  );
};

// Subcomponent: Individual Nearby Job Card Component
const NearbyJobCard: React.FC<{
  item: NearbyJobItem;
  onApply: (jobId: string, title: string) => void;
}> = ({ item, onApply }) => {
  const { job, distanceKm, farmer } = item;

  return (
    <div className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-3xl p-5 shadow-xl transition-all duration-300 space-y-4 group text-left">
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 truncate">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold uppercase tracking-wider">
              {job.category}
            </span>
            {job.cropType && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                🌱 {job.cropType}
              </span>
            )}
            {job.isUrgent && (
              <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 text-[10px] font-bold rounded-full border border-rose-500/20">
                Urgent
              </span>
            )}
          </div>

          <Link to={`/jobs/${job._id}`} className="block">
            <h3 className="font-heading font-extrabold text-base text-white group-hover:text-emerald-400 transition-colors truncate">
              {job.title}
            </h3>
          </Link>
        </div>

        {/* Distance Badge */}
        <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs font-bold shrink-0 flex items-center space-x-1">
          <Navigation className="w-3 h-3" />
          <span>{distanceKm} km away</span>
        </div>
      </div>

      {/* Address & Wage Info */}
      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
        <div className="space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">Location</span>
          <span className="font-semibold text-slate-200 block truncate">
            {[job.jobAddress.village, job.jobAddress.district].filter(Boolean).join(', ') || job.jobAddress.state}
          </span>
        </div>

        <div className="space-y-0.5 text-right">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">Offered Wage</span>
          <span className="font-extrabold text-emerald-400 block truncate">
            {job.formattedWage || `₹${job.dailyWage || job.monthlySalary}`}
          </span>
        </div>
      </div>

      {/* Sanitized Farmer Info (NO private details exposed) */}
      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
        <div className="flex items-center space-x-2 truncate">
          <div className="w-7 h-7 rounded-full bg-emerald-700/40 text-emerald-300 flex items-center justify-center font-bold text-xs uppercase overflow-hidden shrink-0 border border-emerald-500/30">
            {farmer.avatar ? <img src={farmer.avatar} alt="Farmer" className="w-full h-full object-cover" /> : farmer.name.charAt(0)}
          </div>
          <div className="truncate">
            <span className="font-semibold text-slate-200 block truncate flex items-center space-x-1">
              <span>{farmer.name}</span>
              {farmer.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline" />}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1 text-amber-400 font-bold text-xs shrink-0">
          <Star className="w-3.5 h-3.5 fill-amber-400" />
          <span>{farmer.rating || 4.8}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-2 pt-1">
        <button
          type="button"
          onClick={() => onApply(job._id || '', job.title)}
          className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center space-x-1.5"
        >
          <span>Apply Now</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        <Link
          to={`/jobs/${job._id}`}
          className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-colors"
        >
          Details
        </Link>
      </div>
    </div>
  );
};
