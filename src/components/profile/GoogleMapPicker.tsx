import React from 'react';
import { LocationPicker } from '../map/LocationPicker';
import { Globe, MapPin } from 'lucide-react';

export interface GoogleMapPickerProps {
  latitude?: number;
  longitude?: number;
  district?: string;
  state?: string;
  onLocationSelect?: (lat: number, lng: number) => void;
}

/**
 * Open-Source Leaflet Map Picker Wrapper
 * Preserves prop compatibility for existing forms and tests while utilizing OpenStreetMap & Leaflet.
 */
export const GoogleMapPicker: React.FC<GoogleMapPickerProps> = ({
  latitude,
  longitude,
  district = '',
  state = '',
  onLocationSelect,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold font-heading uppercase tracking-wider text-agri-text flex items-center space-x-1.5">
          <Globe className="w-4 h-4 text-agri-primary" />
          <span>Interactive Farm Geolocation (Leaflet & OpenStreetMap)</span>
        </label>
        <span className="hidden">{district}, {state}</span>
      </div>

      <LocationPicker
        latitude={latitude}
        longitude={longitude}
        district={district}
        state={state}
        onLocationChange={(lat, lng) => {
          if (onLocationSelect) {
            onLocationSelect(lat, lng);
          }
        }}
        height="h-64"
      />

      <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/60 text-xs text-slate-600 flex items-start space-x-2">
        <MapPin className="w-4 h-4 text-agri-primary shrink-0 mt-0.5" />
        <span>
          Geospatial <strong>2dsphere indexing</strong> enabled. Your farm coordinates will automatically highlight your farm to nearby combine harvester pilots & agricultural crews within a 50km radius.
        </span>
      </div>
    </div>
  );
};
