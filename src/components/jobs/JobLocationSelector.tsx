import React, { useState } from 'react';
import { LocationSearchInput } from '../location/LocationSearchInput';
import type { LocationSearchResult } from '../location/LocationSearchInput';
import { AgriLocationPickerModal } from '../location/AgriLocationPickerModal';
import { LocationMap } from '../map/LocationMap';
import { JobMarker } from '../map/JobMarker';
import { useCurrentLocation } from '../../hooks/useCurrentLocation';
import { getMyProfileApi } from '../../services/profileService';
import { isValidCoordinate } from '../map/mapConfig';
import { MapPin, Navigation, Home, Search, Edit3, Loader2, CheckCircle2, AlertCircle, Compass } from 'lucide-react';
import axios from 'axios';

export interface JobLocationData {
  addressLine?: string;
  village?: string;
  district: string;
  state: string;
  country?: string;
  pincode?: string;
  latitude: number;
  longitude: number;
}

export interface JobLocationSelectorProps {
  location: JobLocationData;
  onChangeLocation: (updatedLocation: JobLocationData) => void;
  jobTitle?: string;
  category?: string;
  wageText?: string;
}

export const JobLocationSelector: React.FC<JobLocationSelectorProps> = ({
  location,
  onChangeLocation,
  jobTitle = 'Farm Job',
  category = 'General Labor',
  wageText = '₹500 / Daily',
}) => {
  const [activeTab, setActiveTab] = useState<'farm' | 'gps' | 'search' | 'map'>('search');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [loadingFarmLoc, setLoadingFarmLoc] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { refetchLocation: getGpsLocation, loading: isGpsLoading } = useCurrentLocation({ autoFetch: false });

  const hasValidCoordinates = isValidCoordinate(location.latitude, location.longitude);
  const lat = hasValidCoordinates ? location.latitude : 31.634;
  const lng = hasValidCoordinates ? location.longitude : 75.8573;

  // Option 1: Use Farm Location
  const handleUseFarmLocation = async () => {
    try {
      setActiveTab('farm');
      setLoadingFarmLoc(true);
      setStatusMsg(null);

      const response = await getMyProfileApi();
      const farmAddr = response.data?.profile?.farmAddress;

      if (farmAddr && isValidCoordinate(farmAddr.latitude, farmAddr.longitude)) {
        onChangeLocation({
          addressLine: farmAddr.addressLine || '',
          village: farmAddr.village || '',
          district: farmAddr.district || 'Amritsar',
          state: farmAddr.state || 'Punjab',
          country: farmAddr.country || 'India',
          pincode: farmAddr.pincode || '',
          latitude: Number(farmAddr.latitude),
          longitude: Number(farmAddr.longitude),
        });
        setStatusMsg({ type: 'success', text: 'Job location set to your registered Farm Location!' });
      } else {
        setStatusMsg({
          type: 'error',
          text: 'No valid farm location found in your profile. Please add farm location first or select manually.',
        });
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Could not fetch farm profile location.' });
    } finally {
      setLoadingFarmLoc(false);
    }
  };

  // Option 2: Use Current GPS Location
  const handleUseGpsLocation = async () => {
    setActiveTab('gps');
    setStatusMsg(null);

    const gpsResult = await getGpsLocation();
    if (gpsResult && gpsResult.coordinates) {
      const gpsLat = gpsResult.coordinates.latitude;
      const gpsLng = gpsResult.coordinates.longitude;

      // Reverse geocode to get district & state
      try {
        const rev = await axios.get('https://nominatim.openstreetmap.org/reverse', {
          params: { format: 'json', lat: gpsLat, lon: gpsLng, addressdetails: 1 },
          timeout: 5000,
        });
        const addr = rev.data?.address || {};
        onChangeLocation({
          addressLine: rev.data?.name || addr.road || '',
          village: addr.village || addr.suburb || addr.town || '',
          district: addr.state_district || addr.county || addr.district || location.district || 'Amritsar',
          state: addr.state || location.state || 'Punjab',
          country: addr.country || 'India',
          pincode: addr.postcode || '',
          latitude: gpsLat,
          longitude: gpsLng,
        });
        setStatusMsg({ type: 'success', text: 'Job location updated using your live GPS position.' });
      } catch {
        onChangeLocation({
          ...location,
          latitude: gpsLat,
          longitude: gpsLng,
        });
        setStatusMsg({ type: 'success', text: 'Job GPS coordinates updated.' });
      }
    } else {
      setStatusMsg({ type: 'error', text: 'Failed to acquire GPS location. Please check browser permissions.' });
    }
  };

  // Option 3: Search Location Autocomplete Selection
  const handleSearchSelect = (result: LocationSearchResult) => {
    setActiveTab('search');
    setStatusMsg(null);
    onChangeLocation({
      addressLine: result.addressLine || location.addressLine || '',
      village: result.village || location.village || '',
      district: result.district || location.district || 'Amritsar',
      state: result.state || location.state || 'Punjab',
      country: result.country || 'India',
      pincode: result.pincode || location.pincode || '',
      latitude: result.latitude,
      longitude: result.longitude,
    });
    setStatusMsg({ type: 'success', text: `Location set to ${result.displayName.split(',')[0]}` });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-soft-sm space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center font-bold">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading text-base font-bold text-slate-900">Job Site Geolocation</h3>
            <p className="text-xs text-slate-500">Select where the farm work will take place</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-soft-sm flex items-center space-x-1.5 transition-transform active:scale-95"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Pick on Leaflet Map</span>
        </button>
      </div>

      {/* 4 Location Selection Option Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          type="button"
          onClick={handleUseFarmLocation}
          disabled={loadingFarmLoc}
          className={`p-3 rounded-2xl border text-left flex flex-col justify-between space-y-2 transition-all ${
            activeTab === 'farm'
              ? 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
              : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 text-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <Home className="w-4 h-4 text-emerald-600" />
            {loadingFarmLoc && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />}
          </div>
          <div>
            <p className="text-xs font-bold">Use Farm Location</p>
            <p className="text-[10px] text-slate-500">Copy from profile</p>
          </div>
        </button>

        <button
          type="button"
          onClick={handleUseGpsLocation}
          disabled={isGpsLoading}
          className={`p-3 rounded-2xl border text-left flex flex-col justify-between space-y-2 transition-all ${
            activeTab === 'gps'
              ? 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
              : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 text-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <Navigation className="w-4 h-4 text-blue-600" />
            {isGpsLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />}
          </div>
          <div>
            <p className="text-xs font-bold">Current GPS</p>
            <p className="text-[10px] text-slate-500">Use device location</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('search')}
          className={`p-3 rounded-2xl border text-left flex flex-col justify-between space-y-2 transition-all ${
            activeTab === 'search'
              ? 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
              : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 text-slate-700'
          }`}
        >
          <Search className="w-4 h-4 text-violet-600" />
          <div>
            <p className="text-xs font-bold">Search Address</p>
            <p className="text-[10px] text-slate-500">OpenStreetMap lookup</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('map');
            setIsModalOpen(true);
          }}
          className={`p-3 rounded-2xl border text-left flex flex-col justify-between space-y-2 transition-all ${
            activeTab === 'map'
              ? 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
              : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 text-slate-700'
          }`}
        >
          <MapPin className="w-4 h-4 text-amber-600" />
          <div>
            <p className="text-xs font-bold">Pick Manually</p>
            <p className="text-[10px] text-slate-500">Drag/tap Leaflet map</p>
          </div>
        </button>
      </div>

      {/* Debounced OpenStreetMap Search Input */}
      <LocationSearchInput onSelectResult={handleSearchSelect} />

      {/* Feedback Banner */}
      {statusMsg && (
        <div
          className={`p-3 rounded-2xl text-xs font-medium flex items-center space-x-2 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Location Leaflet Map Preview */}
      <div className="space-y-3">
        <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-inner h-60 relative">
          <LocationMap center={[lat, lng]} zoom={13} height="h-60">
            <JobMarker
              position={[lat, lng]}
              title={jobTitle}
              category={category}
              wageText={wageText}
              district={location.district}
              state={location.state}
            />
          </LocationMap>
        </div>

        {/* Readout Summary */}
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold text-slate-800">
              {[location.village, location.district, location.state, location.pincode].filter(Boolean).join(', ') ||
                'Location coordinates set'}
            </span>
          </div>

          <div className="font-mono text-[11px] text-slate-500 bg-white px-2.5 py-1 rounded-xl border border-slate-200">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </div>
        </div>
      </div>

      {/* Modal Popup */}
      <AgriLocationPickerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialLatitude={location.latitude}
        initialLongitude={location.longitude}
        initialDistrict={location.district}
        initialState={location.state}
        initialVillage={location.village}
        onConfirm={(selected) => {
          onChangeLocation({
            addressLine: selected.addressLine || location.addressLine || '',
            village: selected.village || location.village || '',
            district: selected.district || location.district || 'Amritsar',
            state: selected.state || location.state || 'Punjab',
            country: selected.country || 'India',
            pincode: selected.pincode || location.pincode || '',
            latitude: selected.latitude,
            longitude: selected.longitude,
          });
        }}
        title={`Set Job Site Location: ${jobTitle}`}
      />
    </div>
  );
};
