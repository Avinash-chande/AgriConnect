import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  Shield,
  Search,
  IndianRupee,
} from 'lucide-react';
import { getNearbyWorkersApi, NearbyWorkerItem } from '../services/locationService';
import { getMyProfileApi } from '../services/profileService';
import { useCurrentLocation } from '../hooks/useCurrentLocation';
import { LocationMap } from '../components/map/LocationMap';
import { WorkerMarkerCluster } from '../components/map/WorkerMarkerCluster';
import { UserLocationMarker } from '../components/map/UserLocationMarker';
import { AgriLocationPickerModal } from '../components/location/AgriLocationPickerModal';
import { isValidCoordinate } from '../components/map/mapConfig';
import axios from 'axios';

const RADIUS_OPTIONS = [5, 10, 25, 50, 100];
const SKILL_OPTIONS = [
  'All Skills',
  'Tractor Driving',
  'Harvesting',
  'Crop Sowing',
  'Plowing',
  'Irrigation Pumping',
  'Pesticide Spraying',
  'Equipment Operation',
  'General Labor',
];
const AVAILABILITY_OPTIONS = ['all', 'Immediate', 'Within 3 Days', 'Seasonal'];

export const WorkerDiscoveryMapPage: React.FC = () => {
  const navigate = useNavigate();

  // Search Center Location State (Default: Amritsar 31.634, 75.8573)
  const [latitude, setLatitude] = useState<number>(31.634);
  const [longitude, setLongitude] = useState<number>(75.8573);
  const [addressLabel, setAddressLabel] = useState<string>('Detecting location...');

  // Filters State
  const [radius, setRadius] = useState<number>(10);
  const [selectedSkill, setSelectedSkill] = useState<string>('All Skills');
  const [minExperience, setMinExperience] = useState<number>(0);
  const [availability, setAvailability] = useState<string>('all');
  const [maxWage, setMaxWage] = useState<number>(2000);
  const [minRating, setMinRating] = useState<number>(0);
  const [sort, setSort] = useState<'distance' | 'rating' | 'experience' | 'wage'>('distance');
  const [page, setPage] = useState<number>(1);

  // View Mode: 'split' | 'grid' | 'map'
  const [viewMode, setViewMode] = useState<'split' | 'grid' | 'map'>('split');

  // Data & State
  const [workers, setWorkers] = useState<NearbyWorkerItem[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingFarmLoc, setLoadingFarmLoc] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState<boolean>(false);

  // Geolocation Hook
  const { coordinates: userGpsCoords, refetchLocation: getGpsLocation, loading: isGpsLoading } = useCurrentLocation({
    autoFetch: true,
  });

  useEffect(() => {
    if (userGpsCoords) {
      setLatitude(userGpsCoords.latitude);
      setLongitude(userGpsCoords.longitude);
      reverseGeocodeCoords(userGpsCoords.latitude, userGpsCoords.longitude);
    }
  }, [userGpsCoords]);

  const reverseGeocodeCoords = async (lat: number, lng: number) => {
    try {
      const res = await axios.get('/api/v1/location/reverse', {
        params: { lat, lng },
        timeout: 4000,
      });
      if (res.data?.success && res.data?.data) {
        const addr = res.data.data;
        setAddressLabel(
          [addr.village, addr.district, addr.state].filter(Boolean).join(', ') || 'Custom Location'
        );
      }
    } catch {
      setAddressLabel(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  };

  // Option: Load Farmer's Profile Farm Location
  const handleUseFarmLocation = async () => {
    try {
      setLoadingFarmLoc(true);
      const res = await getMyProfileApi();
      const farmAddr = res.data?.profile?.farmAddress;
      if (farmAddr && isValidCoordinate(farmAddr.latitude, farmAddr.longitude)) {
        setLatitude(Number(farmAddr.latitude));
        setLongitude(Number(farmAddr.longitude));
        setPage(1);
        setAddressLabel(
          [farmAddr.village, farmAddr.district, farmAddr.state].filter(Boolean).join(', ') ||
            'My Farm Location'
        );
      } else {
        setError('No registered farm location found in your profile. Please pick a location manually.');
      }
    } catch {
      setError('Failed to load farm profile location.');
    } finally {
      setLoadingFarmLoc(false);
    }
  };

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
        setError('Worker Discovery map is restricted exclusively to authorized Farmer accounts.');
      } else {
        setError(err?.response?.data?.message || 'Failed to search nearby worker profiles.');
      }
    } finally {
      setLoading(false);
    }
  }, [latitude, longitude, radius, selectedSkill, minExperience, availability, maxWage, minRating, sort, page]);

  useEffect(() => {
    fetchNearbyWorkers();
  }, [fetchNearbyWorkers]);

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
      <header className="bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/60 border-b border-slate-800 pt-8 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-sky-500/10 border border-sky-500/30 rounded-full text-sky-400 font-bold text-xs mb-2">
                <Users className="w-3.5 h-3.5" />
                <span>Farmer Talent Sourcing Suite</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
                Worker Discovery Map
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Locate available agricultural workers near your farm with privacy-protected spatial clustering
              </p>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center space-x-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 self-start md:self-auto">
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all ${
                  viewMode === 'split'
                    ? 'bg-sky-500 text-slate-950 shadow-lg'
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
                    ? 'bg-sky-500 text-slate-950 shadow-lg'
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
                    ? 'bg-sky-500 text-slate-950 shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <MapIcon className="w-4 h-4" />
                <span>Worker Map</span>
              </button>
            </div>
          </div>

          {/* Search Center Bar & Radius Controls */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              {/* Location Bar */}
              <div className="md:col-span-6 bg-slate-950/80 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-3 truncate">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Search Center Point
                    </span>
                    <span className="font-bold text-xs text-white truncate block">{addressLabel}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={handleUseFarmLocation}
                    disabled={loadingFarmLoc}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1"
                  >
                    {loadingFarmLoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Home className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">My Farm</span>
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

              {/* Radius Pills */}
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
                        ? 'bg-sky-500 text-slate-950 shadow-md ring-2 ring-sky-400/30'
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
              {/* Skill */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Worker Skill</label>
                <select
                  value={selectedSkill}
                  onChange={(e) => {
                    setSelectedSkill(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {SKILL_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Min Experience */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Min Experience</label>
                <select
                  value={minExperience}
                  onChange={(e) => {
                    setMinExperience(Number(e.target.value));
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value={0}>Any Experience</option>
                  <option value={1}>1+ Years</option>
                  <option value={3}>3+ Years</option>
                  <option value={5}>5+ Years</option>
                </select>
              </div>

              {/* Availability */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Availability</label>
                <select
                  value={availability}
                  onChange={(e) => {
                    setAvailability(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
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
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Max Daily Wage</label>
                <select
                  value={maxWage}
                  onChange={(e) => {
                    setMaxWage(Number(e.target.value));
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value={2000}>Any Rate</option>
                  <option value={500}>Up to ₹500/day</option>
                  <option value={700}>Up to ₹700/day</option>
                  <option value={1000}>Up to ₹1000/day</option>
                </select>
              </div>

              {/* Min Rating */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Min Rating</label>
                <select
                  value={minRating}
                  onChange={(e) => {
                    setMinRating(Number(e.target.value));
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value={0}>All Ratings</option>
                  <option value={4.0}>⭐ 4.0 & Above</option>
                  <option value={4.5}>⭐ 4.5 & Above</option>
                  <option value={4.8}>⭐ 4.8 & Above</option>
                </select>
              </div>

              {/* Sort Selection */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Sort Workers By</label>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="distance">Nearest Distance</option>
                  <option value="rating">Highest Rating</option>
                  <option value="experience">Most Experienced</option>
                  <option value="wage">Lowest Daily Wage</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Privacy Notice Banner */}
        <div className="p-3 mb-6 bg-sky-500/10 border border-sky-500/30 rounded-2xl text-sky-300 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-sky-400 shrink-0" />
            <span>
              <strong>Worker Privacy Protection Active:</strong> Map coordinates use randomized spatial offsets to safeguard exact worker residences.
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-sky-400 shrink-0 ml-2 hidden sm:inline">
            Farmers Only
          </span>
        </div>

        {error && (
          <div className="p-4 mb-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-sm flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-sky-400 mx-auto" />
            <p className="text-sm font-semibold text-slate-400">Searching 2dsphere index for nearby workers within {radius}km...</p>
          </div>
        ) : workers.length === 0 ? (
          <div className="py-16 text-center bg-slate-900/40 border border-slate-800 rounded-3xl p-8 space-y-4 max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white">No Workers Found Within {radius} km</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              No agricultural workers match your current skill or distance filters within {radius}km. Try expanding your search radius.
            </p>
            <div className="flex justify-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setRadius(25)}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow-lg"
              >
                Expand Radius to 25 km
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedSkill('All Skills');
                  setAvailability('all');
                  setMinExperience(0);
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
                {/* Left Column: Worker Cards List */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
                    <span>Found {workers.length} available workers within {radius}km</span>
                    <span>Page {pagination.page} of {pagination.totalPages}</span>
                  </div>

                  {workers.map((item) => (
                    <WorkerDiscoveryCard key={item.worker._id} item={item} />
                  ))}
                </div>

                {/* Right Column: Sticky Leaflet Clustered Map */}
                <div className="lg:col-span-5 sticky top-6">
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-3 shadow-2xl">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 text-xs mb-2">
                      <span className="font-bold text-white flex items-center space-x-1.5">
                        <MapIcon className="w-4 h-4 text-sky-400" />
                        <span>Worker Cluster Map</span>
                      </span>
                      <span className="text-[10px] text-slate-400">{workers.length} Worker Pins</span>
                    </div>

                    <div className="rounded-2xl overflow-hidden h-[560px] border border-slate-800">
                      <LocationMap center={[latitude, longitude]} zoom={11} height="h-[560px]">
                        <UserLocationMarker position={[latitude, longitude]} popupText="Farm Search Center" />
                        <WorkerMarkerCluster
                          workers={workers}
                          onWorkerSelect={(workerId) => navigate(`/profiles/worker/${workerId}`)}
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
                {workers.map((item) => (
                  <WorkerDiscoveryCard key={item.worker._id} item={item} />
                ))}
              </div>
            )}

            {/* Fullscreen Map View */}
            {viewMode === 'map' && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl">
                <div className="rounded-2xl overflow-hidden h-[640px] border border-slate-800">
                  <LocationMap center={[latitude, longitude]} zoom={11} height="h-[640px]">
                    <UserLocationMarker position={[latitude, longitude]} popupText="Farm Search Center" />
                    <WorkerMarkerCluster
                      workers={workers}
                      onWorkerSelect={(workerId) => navigate(`/profiles/worker/${workerId}`)}
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
        title="Set Search Center for Farmer Worker Discovery"
      />
    </div>
  );
};

// Subcomponent: Worker Discovery Card (Strict Privacy: NO Aadhaar, NO phone, NO email exposed)
const WorkerDiscoveryCard: React.FC<{ item: NearbyWorkerItem }> = ({ item }) => {
  const navigate = useNavigate();
  const { worker, distanceKm } = item;

  return (
    <div className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-sky-500/40 rounded-3xl p-5 shadow-xl transition-all duration-300 space-y-4 group text-left">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center space-x-3 truncate">
          <div className="w-12 h-12 rounded-2xl bg-sky-700/40 text-sky-300 flex items-center justify-center font-bold text-base uppercase overflow-hidden shrink-0 border border-sky-500/30 shadow-md">
            {worker.profileImage ? (
              <img src={worker.profileImage} alt={worker.name} className="w-full h-full object-cover" />
            ) : (
              worker.name.charAt(0)
            )}
          </div>

          <div className="truncate">
            <h3 className="font-heading font-extrabold text-base text-white group-hover:text-sky-400 transition-colors flex items-center space-x-1.5 truncate">
              <span>{worker.name}</span>
              {worker.isVerified && <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />}
            </h3>
            <p className="text-xs text-slate-400 truncate">{worker.title || 'Agricultural Specialist'}</p>
          </div>
        </div>

        <div className="px-3 py-1 bg-sky-500/10 border border-sky-500/30 rounded-2xl text-sky-400 text-xs font-bold shrink-0 flex items-center space-x-1">
          <Navigation className="w-3 h-3" />
          <span>{distanceKm} km away</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {worker.skills.slice(0, 4).map((skill, i) => (
          <span key={i} className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold">
            {skill}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 text-center">
        <div>
          <span className="text-[10px] text-slate-500 uppercase font-bold block">Experience</span>
          <span className="font-bold text-white block">{worker.experience} Yrs</span>
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

      <div className="flex items-center space-x-2 pt-1">
        <button
          type="button"
          onClick={() => navigate('/chat', { state: { recipientId: worker.ownerId, recipientName: worker.name } })}
          className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center space-x-1.5"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chat / Hire Worker</span>
        </button>

        <Link
          to={`/profiles/worker/${worker._id}`}
          className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-colors"
        >
          Profile
        </Link>
      </div>
    </div>
  );
};
