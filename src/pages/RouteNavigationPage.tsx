import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Navigation,
  MapPin,
  Clock,
  Compass,
  ArrowRight,
  RotateCw,
  AlertCircle,
  Loader2,
  ChevronLeft,
  List,
  CheckCircle2,
  Share2,
  Layers,
  Map as MapIcon,
  Home,
} from 'lucide-react';
import { calculateRouteApi } from '../services/locationService';
import { LocationMap } from '../components/map/LocationMap';
import { MapMarker } from '../components/map/MapMarker';
import { RoutePolyline } from '../components/map/RoutePolyline';
import { isValidCoordinate } from '../components/map/mapConfig';
import { useCurrentLocation } from '../hooks/useCurrentLocation';

export interface RouteData {
  distance: {
    meters: number;
    kilometers: number;
    formatted: string;
  };
  duration: {
    seconds: number;
    minutes: number;
    formatted: string;
  };
  geometry: {
    type: string;
    coordinates: number[][];
  };
  coordinates: Array<[number, number]>;
  steps: Array<{
    instruction: string;
    distanceMeters: number;
    durationSeconds: number;
  }>;
  isFallback: boolean;
}

export const RouteNavigationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Origin Coordinates (Default: Amritsar center 31.634, 75.8573)
  const [startLat, setStartLat] = useState<number>(
    Number(searchParams.get('startLat')) || 31.634
  );
  const [startLng, setStartLng] = useState<number>(
    Number(searchParams.get('startLng')) || 75.8573
  );
  const [startLabel, setStartLabel] = useState<string>(
    searchParams.get('startLabel') || 'Origin Location'
  );

  // Destination Coordinates (Default: Verka 31.65, 75.88)
  const [endLat, setEndLat] = useState<number>(
    Number(searchParams.get('endLat')) || 31.65
  );
  const [endLng, setEndLng] = useState<number>(
    Number(searchParams.get('endLng')) || 75.88
  );
  const [endLabel, setEndLabel] = useState<string>(
    searchParams.get('endLabel') || 'Destination Site'
  );

  // State
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showSteps, setShowSteps] = useState<boolean>(true);

  // Geolocation Hook for origin
  const { coordinates: userGps, refetchLocation: getGps } = useCurrentLocation({ autoFetch: false });

  const fetchRoute = useCallback(async () => {
    if (!isValidCoordinate(startLat, startLng) || !isValidCoordinate(endLat, endLng)) {
      setError('Invalid coordinates specified for route navigation.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await calculateRouteApi(startLat, startLng, endLat, endLng);
      if (res?.success && res?.data) {
        setRouteData(res.data);
      } else {
        setError('Unable to compute route navigation path.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to connect to OSRM routing service.');
    } finally {
      setLoading(false);
    }
  }, [startLat, startLng, endLat, endLng]);

  useEffect(() => {
    fetchRoute();
  }, [fetchRoute]);

  const handleUseGpsAsOrigin = () => {
    if (userGps && isValidCoordinate(userGps.latitude, userGps.longitude)) {
      setStartLat(userGps.latitude);
      setStartLng(userGps.longitude);
      setStartLabel('My Current GPS Position');
    } else {
      getGps();
    }
  };

  const mapCenter: [number, number] = [
    (startLat + endLat) / 2,
    (startLng + endLng) / 2,
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pb-16">
      {/* Header Bar */}
      <header className="bg-slate-900 border-b border-slate-800 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 font-bold text-[11px] mb-1">
                <Navigation className="w-3 h-3" />
                <span>OSRM Open Routing Engine</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-white">
                Route Navigation
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleUseGpsAsOrigin}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-colors"
            >
              <Compass className="w-4 h-4" />
              <span>Use My GPS Origin</span>
            </button>

            <button
              type="button"
              onClick={fetchRoute}
              disabled={loading}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-colors shadow-lg"
            >
              <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Recalculate</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {error && (
          <div className="p-4 mb-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-sm flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Route Summary & Turn-by-Turn Steps */}
          <div className="lg:col-span-5 space-y-6">
            {/* Origin & Destination Cards */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <h2 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider">
                Trip Waypoints
              </h2>

              <div className="space-y-3 relative pl-6 border-l-2 border-dashed border-emerald-500/40">
                {/* Origin */}
                <div className="relative">
                  <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center text-[8px] font-bold text-slate-950">
                    A
                  </span>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Start Point</span>
                    <span className="text-xs font-bold text-white block">{startLabel}</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {startLat.toFixed(4)}, {startLng.toFixed(4)}
                    </span>
                  </div>
                </div>

                {/* Destination */}
                <div className="relative pt-2">
                  <span className="absolute -left-[31px] top-2 w-4 h-4 rounded-full bg-rose-500 border-2 border-slate-950 flex items-center justify-center text-[8px] font-bold text-white">
                    B
                  </span>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Destination</span>
                    <span className="text-xs font-bold text-white block">{endLabel}</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {endLat.toFixed(4)}, {endLng.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Route Distance & Duration Summary Metrics */}
            {loading ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-400">Calculating driving route via OSRM...</p>
              </div>
            ) : routeData ? (
              <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Distance</span>
                    <span className="text-xl font-extrabold text-emerald-400 flex items-center justify-center space-x-1 mt-0.5">
                      <MapPin className="w-5 h-5" />
                      <span>{routeData.distance.formatted}</span>
                    </span>
                  </div>

                  <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Est. Driving Time</span>
                    <span className="text-xl font-extrabold text-amber-400 flex items-center justify-center space-x-1 mt-0.5">
                      <Clock className="w-5 h-5" />
                      <span>{routeData.duration.formatted}</span>
                    </span>
                  </div>
                </div>

                {/* Routing Provider Badge */}
                <div className="flex items-center justify-between text-xs pt-1 px-1">
                  <span className="text-slate-400 text-[11px]">Provider:</span>
                  <span className="font-bold text-emerald-400 text-[11px] flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{routeData.isFallback ? 'Geodesic Direct Line' : 'OSRM Live Routing'}</span>
                  </span>
                </div>

                {/* Turn-by-Turn Navigation Steps Accordion */}
                {routeData.steps && routeData.steps.length > 0 && (
                  <div className="pt-3 border-t border-slate-800/80 space-y-3">
                    <button
                      type="button"
                      onClick={() => setShowSteps(!showSteps)}
                      className="w-full flex items-center justify-between text-xs font-bold text-white hover:text-emerald-400 transition-colors"
                    >
                      <span className="flex items-center space-x-1.5">
                        <List className="w-4 h-4 text-emerald-400" />
                        <span>Turn-by-Turn Directions ({routeData.steps.length} Steps)</span>
                      </span>
                      <span>{showSteps ? 'Hide' : 'Show'}</span>
                    </button>

                    {showSteps && (
                      <div className="max-h-72 overflow-y-auto space-y-2 pr-1 pt-1">
                        {routeData.steps.map((step, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 text-xs flex items-start space-x-3"
                          >
                            <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-200">{step.instruction}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {step.distanceMeters >= 1000
                                  ? `${(step.distanceMeters / 1000).toFixed(1)} km`
                                  : `${step.distanceMeters} m`}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Right Column: Leaflet Map displaying Route Polyline */}
          <div className="lg:col-span-7 sticky top-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-3 shadow-2xl space-y-2">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 text-xs">
                <span className="font-bold text-white flex items-center space-x-1.5">
                  <MapIcon className="w-4 h-4 text-emerald-400" />
                  <span>Interactive Route Map</span>
                </span>
                <span className="text-[10px] text-slate-400">Leaflet + OpenStreetMap</span>
              </div>

              <div className="rounded-2xl overflow-hidden h-[600px] border border-slate-800">
                <LocationMap center={mapCenter} zoom={11} height="h-[600px]">
                  {/* Origin Marker */}
                  <MapMarker
                    position={[startLat, startLng]}
                    title={`Start: ${startLabel}`}
                    popupContent={
                      <div className="p-1 space-y-1">
                        <span className="font-bold text-emerald-600 text-xs block">📍 Start Point</span>
                        <span className="text-[11px] text-gray-700 block">{startLabel}</span>
                      </div>
                    }
                  />

                  {/* Destination Marker */}
                  <MapMarker
                    position={[endLat, endLng]}
                    title={`Destination: ${endLabel}`}
                    popupContent={
                      <div className="p-1 space-y-1">
                        <span className="font-bold text-rose-600 text-xs block">🏁 Destination</span>
                        <span className="text-[11px] text-gray-700 block">{endLabel}</span>
                      </div>
                    }
                  />

                  {/* Route Polyline Line */}
                  {routeData?.coordinates && routeData.coordinates.length >= 2 && (
                    <RoutePolyline positions={routeData.coordinates} color="#10b981" weight={5} />
                  )}
                </LocationMap>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
