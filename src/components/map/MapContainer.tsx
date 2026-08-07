import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer as ReactLeafletMapContainer, TileLayer } from 'react-leaflet';
import type { MapContainerProps as ReactLeafletMapContainerProps } from 'react-leaflet';
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  MAP_TILE_URL,
  MAP_TILE_ATTRIBUTION,
  isValidCoordinate,
} from './mapConfig';
import { AlertCircle, WifiOff, Loader2, RefreshCw } from 'lucide-react';

export interface AgriMapContainerProps extends ReactLeafletMapContainerProps {
  children?: React.ReactNode;
  tileUrl?: string;
  attribution?: string;
  isLoading?: boolean;
  onTileError?: () => void;
  className?: string;
  fallbackCenter?: [number, number];
}

export const MapContainer: React.FC<AgriMapContainerProps> = ({
  children,
  center = DEFAULT_MAP_CENTER,
  zoom = DEFAULT_MAP_ZOOM,
  tileUrl = MAP_TILE_URL,
  attribution = MAP_TILE_ATTRIBUTION,
  isLoading = false,
  onTileError,
  className = 'w-full h-full min-h-[300px]',
  fallbackCenter = DEFAULT_MAP_CENTER,
  ...props
}) => {
  const [hasTileError, setHasTileError] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Validate passed center coordinates
  const safeCenter = useMemo<[number, number]>(() => {
    if (Array.isArray(center) && center.length === 2 && isValidCoordinate(center[0], center[1])) {
      return [center[0], center[1]];
    }
    if (center && typeof center === 'object' && 'lat' in center && 'lng' in center && isValidCoordinate(center.lat, center.lng)) {
      return [center.lat, center.lng];
    }
    return fallbackCenter;
  }, [center, fallbackCenter]);

  const handleTileLoadError = () => {
    setHasTileError(true);
    if (onTileError) {
      onTileError();
    }
  };

  const handleRetry = () => {
    setHasTileError(false);
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Network Offline Warning */}
      {!isOnline && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1001] bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-md flex items-center space-x-1.5 animate-pulse">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline mode - using cached map tiles</span>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-[1001] bg-slate-900/20 backdrop-blur-xs flex items-center justify-center text-slate-800">
          <div className="bg-white px-4 py-3 rounded-2xl shadow-xl border border-slate-100 flex items-center space-x-3 text-xs font-bold">
            <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
            <span>Loading OpenStreetMap Layer...</span>
          </div>
        </div>
      )}

      {/* Tile Load Error Overlay */}
      {hasTileError && (
        <div className="absolute inset-0 z-[1001] bg-slate-100/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-amber-500" />
          <h4 className="font-bold text-slate-900 text-sm">Unable to load map tiles</h4>
          <p className="text-xs text-slate-500 max-w-xs">
            Please check your network connection or try reloading the map tiles.
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-sm transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Map Layer</span>
          </button>
        </div>
      )}

      <ReactLeafletMapContainer
        center={safeCenter}
        zoom={zoom}
        zoomControl={false}
        className="w-full h-full z-0"
        {...props}
      >
        <TileLayer
          url={tileUrl}
          attribution={attribution}
          maxZoom={19}
          eventHandlers={{
            tileerror: handleTileLoadError,
          }}
        />
        {children}
      </ReactLeafletMapContainer>
    </div>
  );
};
