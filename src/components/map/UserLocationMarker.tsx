import React, { useMemo } from 'react';
import { Circle } from 'react-leaflet';
import { MapMarker } from './MapMarker';
import { MapPopup } from './MapPopup';
import { createCustomDivIcon, isValidCoordinate } from './mapConfig';
import { Navigation, Compass } from 'lucide-react';

export interface UserLocationMarkerProps {
  latitude: number;
  longitude: number;
  accuracy?: number;
  label?: string;
  showAccuracyCircle?: boolean;
}

export const UserLocationMarker: React.FC<UserLocationMarkerProps> = ({
  latitude,
  longitude,
  accuracy = 50,
  label = 'Your Live GPS Location',
  showAccuracyCircle = true,
}) => {
  const isPosValid = isValidCoordinate(latitude, longitude);

  const customIcon = useMemo(() => {
    const html = `
      <div className="relative flex items-center justify-center w-9 h-9">
        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
        <span className="relative inline-flex items-center justify-center rounded-full h-7 w-7 bg-emerald-600 text-white shadow-lg border-2 border-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
          </svg>
        </span>
      </div>
    `;
    return createCustomDivIcon(html, 'user-gps-marker', [36, 36]);
  }, []);

  if (!isPosValid) return null;

  return (
    <>
      <MapMarker position={[latitude, longitude]} icon={customIcon}>
        <MapPopup minWidth={180}>
          <div className="space-y-1">
            <div className="flex items-center space-x-1.5 text-emerald-700 font-bold">
              <Navigation className="w-4 h-4" />
              <span>{label}</span>
            </div>
            <div className="flex items-center space-x-1 text-[11px] font-mono text-slate-500">
              <Compass className="w-3 h-3 text-slate-400" />
              <span>Lat: {latitude.toFixed(4)} | Lng: {longitude.toFixed(4)}</span>
            </div>
            {accuracy > 0 && (
              <p className="text-[10px] text-slate-400">
                Estimated GPS Accuracy: ~{Math.round(accuracy)}m
              </p>
            )}
          </div>
        </MapPopup>
      </MapMarker>

      {showAccuracyCircle && accuracy > 0 && (
        <Circle
          center={[latitude, longitude]}
          radius={accuracy}
          pathOptions={{
            color: '#10B981',
            fillColor: '#10B981',
            fillOpacity: 0.15,
            weight: 1.5,
            dashArray: '4, 4',
          }}
        />
      )}
    </>
  );
};
