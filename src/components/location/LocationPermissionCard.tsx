import React from 'react';
import { useCurrentLocation, UseCurrentLocationOptions } from '../../hooks/useCurrentLocation';
import { Navigation, ShieldCheck, AlertTriangle, RefreshCw, XCircle, Compass } from 'lucide-react';

export interface LocationPermissionCardProps {
  onLocationDetected?: (lat: number, lng: number, accuracy?: number) => void;
  options?: UseCurrentLocationOptions;
  title?: string;
  description?: string;
  className?: string;
}

export const LocationPermissionCard: React.FC<LocationPermissionCardProps> = ({
  onLocationDetected,
  options,
  title = 'Geospatial Farm Matching',
  description = 'Detect your precise location to find nearby combine harvesters, daily farm labor, and tractor equipment.',
  className = '',
}) => {
  const {
    coordinates,
    accuracy,
    timestamp,
    loading,
    error,
    errorCode,
    isLowAccuracy,
    permissionState,
    refetchLocation,
    clearLocation,
  } = useCurrentLocation(options);

  const handleRequestLocation = async () => {
    const res = await refetchLocation();
    if (res && res.coordinates && onLocationDetected) {
      onLocationDetected(res.coordinates.latitude, res.coordinates.longitude, res.accuracy || undefined);
    }
  };

  return (
    <div className={`bg-white rounded-3xl border border-slate-200 p-5 shadow-soft-sm text-left space-y-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-2xl bg-emerald-100 text-emerald-700">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm font-heading">{title}</h4>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
        </div>

        <div className="flex items-center space-x-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          <span>Privacy Secured</span>
        </div>
      </div>

      {/* Success State */}
      {coordinates && (
        <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>GPS Location Active</span>
            </span>
            <button
              type="button"
              onClick={clearLocation}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center space-x-1"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-slate-700 bg-white/80 p-2 rounded-xl border border-emerald-100">
            <span className="flex items-center space-x-1">
              <Compass className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}
              </span>
            </span>
            {accuracy && <span className="text-[11px] text-slate-500">±{accuracy}m accuracy</span>}
          </div>

          {isLowAccuracy && (
            <p className="text-[11px] text-amber-700 flex items-center space-x-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Low accuracy signal detected (~{accuracy}m radius).</span>
            </p>
          )}

          {timestamp && (
            <p className="text-[10px] text-slate-400 text-right">
              Last updated: {new Date(timestamp).toLocaleTimeString()}
            </p>
          )}
        </div>
      )}

      {/* Error State */}
      {error && !coordinates && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-2">
          <div className="flex items-start space-x-2 text-rose-800 text-xs font-medium">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block">
                {errorCode === 'PERMISSION_DENIED'
                  ? 'Location Access Blocked'
                  : errorCode === 'TIMEOUT'
                  ? 'Request Timed Out'
                  : 'Location Error'}
              </span>
              <p className="text-[11px] text-rose-700 leading-snug">{error}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRequestLocation}
            className="mt-2 text-xs font-bold text-rose-700 hover:text-rose-900 underline flex items-center space-x-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Location Detection</span>
          </button>
        </div>
      )}

      {/* Action Buttons */}
      {!coordinates && !error && (
        <div className="flex items-center justify-between pt-1">
          <div className="text-[11px] text-slate-400">
            {permissionState === 'denied'
              ? 'Permission Denied in Browser'
              : 'Requires Browser Geolocation'}
          </div>

          <button
            type="button"
            onClick={handleRequestLocation}
            disabled={loading}
            className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-soft-sm flex items-center space-x-2 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
            <span>{loading ? 'Detecting GPS...' : 'Detect My Location'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
