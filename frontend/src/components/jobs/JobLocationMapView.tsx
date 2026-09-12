import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LocationMap } from '../map/LocationMap';
import { JobMarker } from '../map/JobMarker';
import { UserLocationMarker } from '../map/UserLocationMarker';
import { useCurrentLocation } from '../../hooks/useCurrentLocation';
import { isValidCoordinate } from '../map/mapConfig';
import { calculateDistance } from '../../utils/distanceCalculator';
import {
  MapPin,
  Navigation,
  Compass,
  ExternalLink,
  Loader2,
  Route,
  Shield,
  Eye,
  Map as MapIcon,
  Globe,
  Share2,
} from 'lucide-react';

export interface JobLocationMapViewProps {
  jobTitle: string;
  category: string;
  wageText: string;
  addressLine?: string;
  village?: string;
  district: string;
  state: string;
  pincode?: string;
  latitude?: number | null;
  longitude?: number | null;
  isApproximateLocation?: boolean;
}

export const JobLocationMapView: React.FC<JobLocationMapViewProps> = ({
  jobTitle,
  category,
  wageText,
  addressLine,
  village,
  district,
  state,
  pincode,
  latitude,
  longitude,
  isApproximateLocation = false,
}) => {
  const navigate = useNavigate();

  const hasValidJobCoords = isValidCoordinate(latitude, longitude);
  const jobLat = hasValidJobCoords && latitude ? latitude : 31.634;
  const jobLng = hasValidJobCoords && longitude ? longitude : 75.8573;

  const { coordinates: userCoords, refetchLocation: getGpsLocation, loading: isGpsLoading } = useCurrentLocation({
    autoFetch: true,
  });

  const [distanceInfo, setDistanceInfo] = useState<{ formatted: string; kilometers: number } | null>(null);

  // Calculate distance between user and job location using distanceCalculator
  useEffect(() => {
    if (!userCoords || !hasValidJobCoords) {
      setDistanceInfo(null);
      return;
    }

    const dist = calculateDistance(
      { latitude: userCoords.latitude, longitude: userCoords.longitude },
      { latitude: jobLat, longitude: jobLng }
    );

    if (dist) {
      setDistanceInfo({ formatted: dist.formatted, kilometers: dist.kilometers });
    }
  }, [userCoords, hasValidJobCoords, jobLat, jobLng]);

  // Navigate to internal AgriConnect Route Navigation
  const handleStartRouteNavigation = () => {
    const sLat = userCoords?.latitude || 31.634;
    const sLng = userCoords?.longitude || 75.8573;
    const sLabel = userCoords ? 'My Current Location' : 'Default Location';
    const eLabel = encodeURIComponent(jobTitle);

    navigate(
      `/route-navigation?startLat=${sLat}&startLng=${sLng}&endLat=${jobLat}&endLng=${jobLng}&startLabel=${encodeURIComponent(
        sLabel
      )}&endLabel=${eLabel}`
    );
  };

  // External Navigation Links
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${jobLat},${jobLng}`;
  const osmUrl = `https://www.openstreetmap.org/?mlat=${jobLat}&mlon=${jobLng}#map=15/${jobLat}/${jobLng}`;
  const appleMapsUrl = `https://maps.apple.com/?daddr=${jobLat},${jobLng}`;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-5 shadow-2xl backdrop-blur-xl text-left">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-emerald-400 shrink-0" />
            <h3 className="text-lg font-bold text-white">Farm & Job Location Map</h3>
          </div>
          <p className="text-xs text-slate-400">
            {isApproximateLocation
              ? 'Approximate area shown to protect farmer property privacy'
              : 'Exact farm site location for worker navigation'}
          </p>
        </div>

        {/* Distance Badge */}
        {userCoords && hasValidJobCoords && distanceInfo ? (
          <div className="px-3.5 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 font-bold text-xs flex items-center space-x-2 shrink-0 self-start sm:self-auto">
            <Navigation className="w-4 h-4 text-emerald-400" />
            <span>📍 {distanceInfo.formatted} from your position</span>
          </div>
        ) : !userCoords ? (
          <button
            type="button"
            onClick={() => getGpsLocation()}
            disabled={isGpsLoading}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl flex items-center space-x-1.5 transition-colors shrink-0 self-start sm:self-auto"
          >
            {isGpsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Compass className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{isGpsLoading ? 'Locating...' : 'Check My Distance'}</span>
          </button>
        ) : null}
      </div>

      {/* Leaflet Map Display Container */}
      <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-2xl h-72 sm:h-80 relative group">
        <LocationMap center={[jobLat, jobLng]} zoom={13} height="h-72 sm:h-80">
          {/* Farm/Job Marker */}
          <JobMarker
            position={[jobLat, jobLng]}
            title={jobTitle}
            category={category}
            wageText={wageText}
            district={district}
            state={state}
          />

          {/* User Location Marker if available */}
          {userCoords && isValidCoordinate(userCoords.latitude, userCoords.longitude) && (
            <UserLocationMarker
              position={[userCoords.latitude, userCoords.longitude]}
              popupText="Your Current Position"
            />
          )}
        </LocationMap>

        {isApproximateLocation && (
          <div className="absolute top-3 right-3 z-20 px-3 py-1 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-full text-slate-300 font-bold text-[10px] flex items-center space-x-1.5 shadow-lg">
            <Shield className="w-3 h-3 text-amber-400" />
            <span>Approximate Location Mode</span>
          </div>
        )}
      </div>

      {/* Action Buttons: Internal Navigation & External Directions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <button
          type="button"
          onClick={handleStartRouteNavigation}
          className="py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-2xl shadow-lg transition-transform active:scale-98 flex items-center justify-center space-x-2"
        >
          <Route className="w-4 h-4" />
          <span>AgriConnect Route Navigation</span>
        </button>

        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-2xl border border-slate-700 transition-colors flex items-center justify-center space-x-2"
        >
          <Globe className="w-4 h-4 text-emerald-400" />
          <span>Open in External Maps</span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
        </a>
      </div>

      {/* Detailed Address & Coordinates Metadata Box */}
      <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="space-y-1">
          <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold block">
            Farm & Site Address
          </span>
          <p className="font-bold text-white text-sm leading-snug">
            {[village, district, state].filter(Boolean).join(', ')}
          </p>
          {addressLine && <p className="text-slate-400 leading-normal">{addressLine}</p>}
          {pincode && <p className="text-slate-500 text-[11px]">PIN / Pincode: {pincode}</p>}
        </div>

        <div className="space-y-2 sm:text-right flex flex-col sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
          <div>
            <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold block">
              GeoJSON Point Coordinates
            </span>
            <p className="font-mono text-emerald-400 font-bold text-xs">
              {jobLat.toFixed(5)}, {jobLng.toFixed(5)}
            </p>
          </div>

          <div className="flex items-center space-x-3 text-[11px] pt-1">
            <a
              href={osmUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-emerald-400 transition-colors"
            >
              OpenStreetMap
            </a>
            <span className="text-slate-700">•</span>
            <a
              href={appleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-emerald-400 transition-colors"
            >
              Apple Maps
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
