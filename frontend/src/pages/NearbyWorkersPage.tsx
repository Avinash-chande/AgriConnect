import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  Compass,
  Navigation,
  MapPin,
  Star,
  Award,
  Clock,
  Filter,
  Layers,
  Map as MapIcon,
  List,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  SlidersHorizontal,
  Home,
  MessageSquare,
  ShieldCheck,
  Search,
  IndianRupee,
  PlusCircle,
  Sparkles,
  Phone,
  Briefcase,
  Tractor,
  RotateCcw,
} from 'lucide-react';
import { Circle } from 'react-leaflet';
import { getNearbyWorkersApi, reverseGeocodeApi } from '../services/locationService';
import type { NearbyWorkerItem } from '../services/locationService';
import { getMyProfileApi } from '../services/profileService';
import { useCurrentLocation } from '../hooks/useCurrentLocation';
import { LocationMap } from '../components/map/LocationMap';
import { WorkerMarker } from '../components/map/WorkerMarker';
import { UserLocationMarker } from '../components/map/UserLocationMarker';
import { AgriLocationPickerModal } from '../components/location/AgriLocationPickerModal';
import type { SelectedLocationData } from '../components/location/AgriLocationPicker';
import { DirectHireWorkerModal } from '../components/farmer/DirectHireWorkerModal';
import { isValidCoordinate } from '../components/map/mapConfig';
import type { WorkerProfile } from '../types';

const RADIUS_OPTIONS = [5, 10, 25, 50, 100];
const DEFAULT_SKILL_OPTIONS = [
  'All Skills',
  'Tractor Driving',
  'Harvesting',
  'Crop Harvesting',
  'Irrigation',
  'Sowing',
  'Pesticide Spraying',
  'Farm Machinery',
  'Thresher Operation',
  'Sugarcane Cutting',
  'Cotton Picking',
  'Soybean Farming',
  'Wheat Harvesting',
  'Paddy Farming',
  'Vegetable Farming',
  'Dairy Farming',
  'Drone Operation',
  'Crop Sowing',
  'Plowing',
  'Irrigation Pumping',
  'Equipment Operation',
  'General Labor',
];
const AVAILABILITY_OPTIONS = ['all', 'Immediate', 'Within 3 Days', 'Seasonal', 'Unavailable'];

export const NearbyWorkersPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Search Center Location State (Default: Nagpur, Maharashtra center 21.1458, 79.0882 or initial query params)
  const initialLat = searchParams.get('lat') ? Number(searchParams.get('lat')) : 21.1458;
  const initialLng = searchParams.get('lng') ? Number(searchParams.get('lng')) : 79.0882;
  const initialRadius = searchParams.get('radius') ? Number(searchParams.get('radius')) : 10;
  const initialSkill = searchParams.get('skill') || 'All Skills';
  const initialExp = searchParams.get('minExperience') ? Number(searchParams.get('minExperience')) : 0;
  const initialAvail = searchParams.get('availability') || 'all';
  const initialWage = searchParams.get('maxWage') ? Number(searchParams.get('maxWage')) : 2000;
  const initialRating = searchParams.get('minRating') ? Number(searchParams.get('minRating')) : 0;
  const initialSort = (searchParams.get('sort') as any) || 'distance';

  const [latitude, setLatitude] = useState<number>(initialLat);
  const [longitude, setLongitude] = useState<number>(initialLng);
  const [addressPreview, setAddressPreview] = useState<string>('Detecting location...');

  // Filters State
  const [radius, setRadius] = useState<number>(RADIUS_OPTIONS.includes(initialRadius) ? initialRadius : 10);
  const [selectedSkill, setSelectedSkill] = useState<string>(initialSkill);
  const [minExperience, setMinExperience] = useState<number>(initialExp);
  const [availability, setAvailability] = useState<string>(initialAvail);
  const [maxWage, setMaxWage] = useState<number>(initialWage);
  const [minRating, setMinRating] = useState<number>(initialRating);
  const [sort, setSort] = useState<'distance' | 'rating' | 'experience' | 'wage'>(initialSort);
  const [page, setPage] = useState<number>(1);

  // View Mode: 'split' | 'grid' | 'map'
  const [viewMode, setViewMode] = useState<'split' | 'grid' | 'map'>('split');
  const [activeWorkerId, setActiveWorkerId] = useState<string | null>(null);

  // Data & Loading State
  const [workers, setWorkers] = useState<NearbyWorkerItem[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingFarmLoc, setLoadingFarmLoc] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState<boolean>(false);
  const [selectedHireWorker, setSelectedHireWorker] = useState<WorkerProfile | null>(null);

  // Geolocation Hook
  const { coordinates: userGpsCoords } = useCurrentLocation({
    autoFetch: true,
  });

  // Helper: Reverse geocode coords for human-readable location label
  const reverseGeocodeCoords = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await reverseGeocodeApi(lat, lng);
      const addr = res?.data || res;
      if (addr) {
        const parts = [addr.village, addr.district, addr.state].filter(Boolean);
        setAddressPreview(parts.length > 0 ? parts.join(', ') : `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
    } catch {
      setAddressPreview(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  }, []);

  // Initial farm profile location auto-load
  useEffect(() => {
    let isMounted = true;
    const loadFarmerDefaultLocation = async () => {
      // If URL already had query params, reverse geocode that position
      if (searchParams.get('lat') && searchParams.get('lng')) {
        reverseGeocodeCoords(initialLat, initialLng);
        return;
      }

      try {
        const res = await getMyProfileApi();
        const profile = res?.data?.profile || res?.profile || res;
        const farmAddr = profile?.farmAddress;
        let farmLat: number | null = null;
        let farmLng: number | null = null;

        if (farmAddr && isValidCoordinate(farmAddr.latitude, farmAddr.longitude)) {
          farmLat = Number(farmAddr.latitude);
          farmLng = Number(farmAddr.longitude);
        } else if (
          profile?.location?.coordinates &&
          isValidCoordinate(profile.location.coordinates[1], profile.location.coordinates[0])
        ) {
          farmLat = Number(profile.location.coordinates[1]);
          farmLng = Number(profile.location.coordinates[0]);
        }

        if (farmLat !== null && farmLng !== null && isMounted) {
          setLatitude(farmLat);
          setLongitude(farmLng);
          const parts = [farmAddr?.village, farmAddr?.district, farmAddr?.state].filter(Boolean);
          setAddressPreview(parts.length > 0 ? parts.join(', ') : 'Registered Farm Location');
          return;
        }
      } catch {
        // Fallback gracefully to GPS or default
      }

      if (userGpsCoords && isMounted) {
        setLatitude(userGpsCoords.latitude);
        setLongitude(userGpsCoords.longitude);
        reverseGeocodeCoords(userGpsCoords.latitude, userGpsCoords.longitude);
      } else {
        reverseGeocodeCoords(21.1458, 79.0882);
      }
    };

    loadFarmerDefaultLocation();
    return () => {
      isMounted = false;
    };
  }, []);

  // Option: Use Registered Farm Location from Profile ("My Farm" button)
  const handleUseFarmLocation = async () => {
    try {
      setLoadingFarmLoc(true);
      setError(null);
      const res = await getMyProfileApi();
      const profile = res?.data?.profile || res?.profile || res;
      const farmAddr = profile?.farmAddress;
      let farmLat: number | null = null;
      let farmLng: number | null = null;

      if (farmAddr && isValidCoordinate(farmAddr.latitude, farmAddr.longitude)) {
        farmLat = Number(farmAddr.latitude);
        farmLng = Number(farmAddr.longitude);
      } else if (
        profile?.location?.coordinates &&
        isValidCoordinate(profile.location.coordinates[1], profile.location.coordinates[0])
      ) {
        farmLat = Number(profile.location.coordinates[1]);
        farmLng = Number(profile.location.coordinates[0]);
      }

      if (farmLat !== null && farmLng !== null) {
        setLatitude(farmLat);
        setLongitude(farmLng);
        setPage(1);
        const parts = [farmAddr?.village, farmAddr?.district, farmAddr?.state].filter(Boolean);
        setAddressPreview(parts.length > 0 ? parts.join(', ') : 'Registered Farm Location');
      } else {
        setError('No farm coordinates configured in your Farmer Profile. Please click "Set Pin" to select your location.');
      }
    } catch {
      setError('Failed to fetch farm coordinates from profile.');
    } finally {
      setLoadingFarmLoc(false);
    }
  };

  // Synchronize filter parameters to URL search params
  useEffect(() => {
    const params: Record<string, string> = {
      lat: latitude.toFixed(4),
      lng: longitude.toFixed(4),
      radius: radius.toString(),
      sort,
    };
    if (selectedSkill !== 'All Skills') params.skill = selectedSkill;
    if (minExperience > 0) params.minExperience = minExperience.toString();
    if (availability !== 'all') params.availability = availability;
    if (maxWage < 2000) params.maxWage = maxWage.toString();
    if (minRating > 0) params.minRating = minRating.toString();

    setSearchParams(params, { replace: true });
  }, [latitude, longitude, radius, selectedSkill, minExperience, availability, maxWage, minRating, sort, setSearchParams]);

  // Fetch Nearby Workers API
  const fetchNearbyWorkers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getNearbyWorkersApi({
        latitude,
        longitude,
        radius,
        skills: selectedSkill !== 'All Skills' ? selectedSkill : undefined,
        minExperience: minExperience > 0 ? minExperience : undefined,
        availability: availability !== 'all' ? availability : undefined,
        maxWage: maxWage < 2000 ? maxWage : undefined,
        minRating: minRating > 0 ? minRating : undefined,
        sort,
        page,
        limit: 10,
      });

      if (response?.data && Array.isArray(response.data)) {
        setWorkers(response.data);
        if (response.meta?.pagination) {
          setPagination(response.meta.pagination);
        }
      } else {
        setWorkers([]);
      }
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setError('Worker Discovery is reserved exclusively for registered Farmer accounts.');
      } else {
        setError(err?.response?.data?.message || 'Failed to fetch nearby worker profiles.');
      }
    } finally {
      setLoading(false);
    }
  }, [latitude, longitude, radius, selectedSkill, minExperience, availability, maxWage, minRating, sort, page]);

  useEffect(() => {
    fetchNearbyWorkers();
  }, [fetchNearbyWorkers]);

  // Location Picker Confirm Handler
  const handleLocationPick = (selected: SelectedLocationData) => {
    setLatitude(selected.latitude);
    setLongitude(selected.longitude);
    setPage(1);
    const label =
      selected.formattedAddress ||
      [selected.village, selected.district, selected.state].filter(Boolean).join(', ') ||
      `${selected.latitude.toFixed(4)}, ${selected.longitude.toFixed(4)}`;
    setAddressPreview(label);
  };

  // Reset all filters to defaults
  const handleResetFilters = () => {
    setRadius(10);
    setSelectedSkill('All Skills');
    setMinExperience(0);
    setAvailability('all');
    setMaxWage(2000);
    setMinRating(0);
    setSort('distance');
    setPage(1);
  };

  // Dynamically calculate next radius for expand radius button
  const getNextRadius = (current: number) => {
    const index = RADIUS_OPTIONS.indexOf(current);
    if (index >= 0 && index < RADIUS_OPTIONS.length - 1) {
      return RADIUS_OPTIONS[index + 1];
    }
    return RADIUS_OPTIONS[RADIUS_OPTIONS.length - 1];
  };
  const nextRadius = getNextRadius(radius);

  // Dynamically compute all available skills from standard options + returned workers
  const allAvailableSkills = useMemo(() => {
    const skillSet = new Set(DEFAULT_SKILL_OPTIONS);
    workers.forEach((item) => {
      item.worker?.skills?.forEach((s) => {
        if (s && s.trim()) skillSet.add(s.trim());
      });
    });
    return Array.from(skillSet);
  }, [workers]);

  const isFilterActive =
    radius !== 10 ||
    selectedSkill !== 'All Skills' ||
    minExperience > 0 ||
    availability !== 'all' ||
    maxWage < 2000 ||
    minRating > 0 ||
    sort !== 'distance';

  const mapZoomLevel = radius <= 5 ? 13 : radius <= 10 ? 12 : radius <= 25 ? 11 : radius <= 50 ? 10 : 9;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pb-16">
      {/* Header Banner */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/60 border-b border-slate-800 pt-8 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-2">
                <Users className="w-3.5 h-3.5" />
                <span>Farmer Talent Sourcing Suite</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
                Nearby Worker Discovery & Hiring
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Locate, review, and directly hire background-verified agricultural specialists
              </p>
            </div>

            {/* Quick Action Navigation Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/farmer/worker-map"
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5"
              >
                <MapIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>Map Discovery</span>
              </Link>
              <Link
                to="/farmer/jobs/create"
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-lg"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Post Job Vacancy</span>
              </Link>
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
                <span>Worker Cards</span>
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
                <span>Worker Map</span>
              </button>
            </div>
          </div>

          {/* Search Center Location & Radius Controls */}
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
                      Search Center Point
                    </span>
                    <span className="font-bold text-xs text-white truncate block">{addressPreview}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={handleUseFarmLocation}
                    disabled={loadingFarmLoc}
                    title="Use registered farm location"
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1"
                  >
                    {loadingFarmLoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Home className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">My Farm</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsLocationPickerOpen(true)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    Set Pin
                  </button>
                </div>
              </div>

              {/* Radius Options */}
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

            {/* Filter Bar Row */}
            <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              {/* Skill Filter */}
              <div>
                <label htmlFor="skill-filter" className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                  Required Skill
                </label>
                <select
                  id="skill-filter"
                  value={selectedSkill}
                  onChange={(e) => {
                    setSelectedSkill(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {allAvailableSkills.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Min Experience */}
              <div>
                <label htmlFor="experience-filter" className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                  Min Experience
                </label>
                <select
                  id="experience-filter"
                  value={minExperience}
                  onChange={(e) => {
                    setMinExperience(Number(e.target.value));
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value={0}>Any Experience</option>
                  <option value={1}>1+ Years</option>
                  <option value={2}>2+ Years</option>
                  <option value={3}>3+ Years</option>
                  <option value={5}>5+ Years</option>
                </select>
              </div>

              {/* Availability */}
              <div>
                <label htmlFor="availability-filter" className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                  Availability
                </label>
                <select
                  id="availability-filter"
                  value={availability}
                  onChange={(e) => {
                    setAvailability(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {AVAILABILITY_OPTIONS.map((a) => (
                    <option key={a} value={a}>
                      {a === 'all' ? 'All Statuses' : a}
                    </option>
                  ))}
                </select>
              </div>

              {/* Max Wage */}
              <div>
                <label htmlFor="wage-filter" className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                  Max Daily Wage
                </label>
                <select
                  id="wage-filter"
                  value={maxWage}
                  onChange={(e) => {
                    setMaxWage(Number(e.target.value));
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value={2000}>Any Wage Rate</option>
                  <option value={500}>Up to ₹500/day</option>
                  <option value={700}>Up to ₹700/day</option>
                  <option value={800}>Up to ₹800/day</option>
                  <option value={1000}>Up to ₹1000/day</option>
                  <option value={1500}>Up to ₹1500/day</option>
                </select>
              </div>

              {/* Min Rating */}
              <div>
                <label htmlFor="rating-filter" className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                  Min Rating
                </label>
                <select
                  id="rating-filter"
                  value={minRating}
                  onChange={(e) => {
                    setMinRating(Number(e.target.value));
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value={0}>All Ratings</option>
                  <option value={3.0}>⭐ 3.0 & Above</option>
                  <option value={4.0}>⭐ 4.0 & Above</option>
                  <option value={4.5}>⭐ 4.5 & Above</option>
                  <option value={4.8}>⭐ 4.8 & Above</option>
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <label htmlFor="sort-filter" className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                  Sort Workers By
                </label>
                <select
                  id="sort-filter"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="distance">Nearest Distance</option>
                  <option value="rating">Highest Rating</option>
                  <option value="experience">Most Experienced</option>
                  <option value="wage">Lowest Daily Wage</option>
                </select>
              </div>
            </div>

            {/* Quick Reset Link when filters active */}
            {isFilterActive && (
              <div className="flex items-center justify-between pt-2 text-xs text-slate-400 border-t border-slate-800/60">
                <span>Active filters applied</span>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center space-x-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset All Filters</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {error && (
          <div className="p-4 mb-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-sm flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => fetchNearbyWorkers()}
              className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 rounded-lg text-xs font-bold transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mx-auto" />
            <p className="text-sm font-semibold text-slate-400">
              Searching 2dsphere index for workers within {radius} km...
            </p>
          </div>
        ) : workers.length === 0 ? (
          <div className="py-16 text-center bg-slate-900/40 border border-slate-800 rounded-3xl p-8 space-y-4 max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white">No Workers Found Within {radius} km</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              No registered workers match your current skill or distance criteria within {radius} km. Try expanding your search radius or resetting filters.
            </p>
            <div className="flex justify-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRadius(nextRadius);
                  setPage(1);
                }}
                disabled={radius >= 100}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow-lg"
              >
                {radius >= 100 ? 'Maximum Radius Reached (100 km)' : `Expand Radius to ${nextRadius} km`}
              </button>
              <button
                type="button"
                onClick={handleResetFilters}
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
                {/* Left Column: Worker Cards List */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
                    <span>Found {pagination.total || workers.length} available workers within {radius} km</span>
                    <span>Page {pagination.page} of {pagination.totalPages}</span>
                  </div>

                  {workers.map((item) => (
                    <NearbyWorkerCard
                      key={item.worker._id}
                      item={item}
                      isSelected={activeWorkerId === item.worker._id}
                      onSelect={() => setActiveWorkerId(item.worker._id)}
                      onHireWorker={(w) => setSelectedHireWorker(w)}
                    />
                  ))}
                </div>

                {/* Right Column: Leaflet Map */}
                <div className="lg:col-span-5 sticky top-6">
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-3 shadow-2xl">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 text-xs mb-2">
                      <span className="font-bold text-white flex items-center space-x-1.5">
                        <MapIcon className="w-4 h-4 text-emerald-400" />
                        <span>Interactive Worker Map</span>
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {workers.length} Pins in {radius} km Area
                      </span>
                    </div>

                    <div className="rounded-2xl overflow-hidden h-[540px] border border-slate-800">
                      <LocationMap center={[latitude, longitude]} zoom={mapZoomLevel} height="h-[540px]">
                        <UserLocationMarker position={[latitude, longitude]} popupText={`Search Center: ${addressPreview}`} />

                        {/* Search Radius Area Circle */}
                        <Circle
                          center={[latitude, longitude]}
                          radius={radius * 1000}
                          pathOptions={{
                            color: '#10B981',
                            fillColor: '#10B981',
                            fillOpacity: 0.08,
                            weight: 1.5,
                            dashArray: '6, 6',
                          }}
                        />

                        {workers.map((item) => {
                          const wLat = (item.worker.address as any)?.latitude || item.location?.coordinates[1];
                          const wLng = (item.worker.address as any)?.longitude || item.location?.coordinates[0];
                          if (!isValidCoordinate(wLat, wLng)) return null;

                          return (
                            <WorkerMarker
                              key={item.worker._id}
                              position={[wLat, wLng]}
                              name={item.worker.name}
                              title={item.worker.title}
                              skills={item.worker.skills}
                              experience={item.worker.experience}
                              expectedDailyWage={item.worker.expectedDailyWage}
                              rating={item.worker.rating}
                              availability={item.worker.availability}
                              onClick={() => setActiveWorkerId(item.worker._id)}
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
                {workers.map((item) => (
                  <NearbyWorkerCard
                    key={item.worker._id}
                    item={item}
                    isSelected={activeWorkerId === item.worker._id}
                    onSelect={() => setActiveWorkerId(item.worker._id)}
                    onHireWorker={(w) => setSelectedHireWorker(w)}
                  />
                ))}
              </div>
            )}

            {/* Fullscreen Map View */}
            {viewMode === 'map' && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl">
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 text-xs mb-3">
                  <span className="font-bold text-white flex items-center space-x-1.5">
                    <MapIcon className="w-4 h-4 text-emerald-400" />
                    <span>Geographic Worker Map Discovery ({radius} km Radius)</span>
                  </span>
                  <span className="text-[11px] text-emerald-400 font-bold">{workers.length} Worker Markers</span>
                </div>

                <div className="rounded-2xl overflow-hidden h-[620px] border border-slate-800">
                  <LocationMap center={[latitude, longitude]} zoom={mapZoomLevel} height="h-[620px]">
                    <UserLocationMarker position={[latitude, longitude]} popupText={`Search Center: ${addressPreview}`} />

                    {/* Search Radius Area Circle */}
                    <Circle
                      center={[latitude, longitude]}
                      radius={radius * 1000}
                      pathOptions={{
                        color: '#10B981',
                        fillColor: '#10B981',
                        fillOpacity: 0.08,
                        weight: 1.5,
                        dashArray: '6, 6',
                      }}
                    />

                    {workers.map((item) => {
                      const wLat = (item.worker.address as any)?.latitude || item.location?.coordinates[1];
                      const wLng = (item.worker.address as any)?.longitude || item.location?.coordinates[0];
                      if (!isValidCoordinate(wLat, wLng)) return null;

                      return (
                        <WorkerMarker
                          key={item.worker._id}
                          position={[wLat, wLng]}
                          name={item.worker.name}
                          title={item.worker.title}
                          skills={item.worker.skills}
                          experience={item.worker.experience}
                          expectedDailyWage={item.worker.expectedDailyWage}
                          rating={item.worker.rating}
                          availability={item.worker.availability}
                          onClick={() => setActiveWorkerId(item.worker._id)}
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

      {/* Modal Pick Location */}
      <AgriLocationPickerModal
        isOpen={isLocationPickerOpen}
        onClose={() => setIsLocationPickerOpen(false)}
        initialLatitude={latitude}
        initialLongitude={longitude}
        onConfirm={handleLocationPick}
        title="Set Search Center for Nearby Worker Discovery"
      />

      {/* Direct Hire Worker Modal */}
      <DirectHireWorkerModal
        isOpen={!!selectedHireWorker}
        worker={selectedHireWorker}
        onClose={() => setSelectedHireWorker(null)}
        onHireSuccess={() => fetchNearbyWorkers()}
      />
    </div>
  );
};

// Subcomponent: Individual Nearby Worker Card Component
const NearbyWorkerCard: React.FC<{
  item: NearbyWorkerItem;
  isSelected?: boolean;
  onSelect?: () => void;
  onHireWorker: (worker: WorkerProfile) => void;
}> = ({ item, isSelected, onSelect, onHireWorker }) => {
  const navigate = useNavigate();
  const { worker, distanceKm } = item;

  // Adapt nearby worker shape into WorkerProfile for modal
  const workerProfileForModal: WorkerProfile = {
    id: worker._id,
    _id: worker._id,
    ownerId: worker.ownerId,
    name: worker.name,
    title: worker.title || 'Agricultural Specialist',
    skills: worker.skills || [],
    experience: worker.experience || 0,
    experienceYears: worker.experience || 0,
    dailyWage: worker.expectedDailyWage,
    expectedDailyWage: worker.expectedDailyWage,
    rating: worker.rating || 5.0,
    reviewsCount: 0,
    completedJobs: worker.totalJobsCompleted || (worker as any).completedJobs || 0,
    location: `${distanceKm} km away`,
    profileImage: worker.profileImage || '',
    avatar: worker.profileImage || '',
    isVerified: !!worker.isVerified,
    availability: worker.availability || 'Immediate',
    bio: (worker as any).bio || `${worker.experience || 0} years of agricultural expertise. Available for seasonal and contract operations.`,
  };

  return (
    <div
      onClick={onSelect}
      className={`bg-slate-900/80 hover:bg-slate-900 border ${
        isSelected ? 'border-emerald-400 ring-2 ring-emerald-400/30' : 'border-slate-800 hover:border-emerald-500/40'
      } rounded-3xl p-5 shadow-xl transition-all duration-300 space-y-4 group text-left cursor-pointer`}
    >
      {/* Top Profile Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center space-x-3 truncate">
          <div className="w-12 h-12 rounded-2xl bg-emerald-700/40 text-emerald-300 flex items-center justify-center font-bold text-base uppercase overflow-hidden shrink-0 border border-emerald-500/30 shadow-md">
            {worker.profileImage ? (
              <img src={worker.profileImage} alt={worker.name} className="w-full h-full object-cover" />
            ) : (
              worker.name.charAt(0)
            )}
          </div>

          <div className="truncate">
            <h3 className="font-heading font-extrabold text-base text-white group-hover:text-emerald-400 transition-colors flex items-center space-x-1.5 truncate">
              <span>{worker.name}</span>
              {worker.isVerified && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            </h3>
            <p className="text-xs text-slate-400 truncate">{worker.title || 'Agricultural Specialist'}</p>
          </div>
        </div>

        {/* Distance Badge */}
        <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs font-bold shrink-0 flex items-center space-x-1">
          <Navigation className="w-3 h-3" />
          <span>{distanceKm} km away</span>
        </div>
      </div>

      {/* Skills Badges Pills */}
      <div className="flex flex-wrap gap-1.5">
        {worker.skills?.slice(0, 4).map((skill, i) => (
          <span key={i} className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold">
            {skill}
          </span>
        ))}
        {worker.skills && worker.skills.length > 4 && (
          <span className="px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 text-[10px]">
            +{worker.skills.length - 4} more
          </span>
        )}
      </div>

      {/* Key Stats Bar */}
      <div className="grid grid-cols-3 gap-2 text-xs bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 text-center">
        <div>
          <span className="text-[10px] text-slate-500 uppercase font-bold block">Experience</span>
          <span className="font-bold text-white block">{worker.experience} Years</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 uppercase font-bold block">Daily Wage</span>
          <span className="font-extrabold text-emerald-400 block">₹{worker.expectedDailyWage}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 uppercase font-bold block">Rating</span>
          <span className="font-bold text-amber-400 flex items-center justify-center space-x-1">
            <Star className="w-3 h-3 fill-amber-400" />
            <span>{worker.rating || 5.0}</span>
          </span>
        </div>
      </div>

      {/* Availability & Languages Row */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
        <div className="flex items-center space-x-1 text-emerald-300 font-semibold">
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
          <span>{worker.availability}</span>
        </div>

        <div>
          <span>Languages: </span>
          <span className="text-slate-200 font-medium">{worker.languages?.slice(0, 2).join(', ')}</span>
        </div>
      </div>

      {/* Direct Contact & Hire Action Buttons */}
      <div className="flex items-center space-x-2 pt-1" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => onHireWorker(workerProfileForModal)}
          className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center space-x-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Hire / Offer Job</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/chat', { state: { recipientId: worker.ownerId, recipientName: worker.name } })}
          className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors"
          title="Chat with Worker"
        >
          <MessageSquare className="w-4 h-4" />
        </button>

        <Link
          to={`/profile/user/${worker.ownerId || worker._id}`}
          className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-colors"
        >
          Profile
        </Link>
      </div>
    </div>
  );
};

export default NearbyWorkersPage;
