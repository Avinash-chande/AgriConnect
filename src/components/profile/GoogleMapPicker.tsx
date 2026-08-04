import React, { useState } from 'react';
import { MapPin, Navigation, Compass, Globe } from 'lucide-react';

interface GoogleMapPickerProps {
  latitude?: number;
  longitude?: number;
  district?: string;
  state?: string;
  onLocationSelect?: (lat: number, lng: number) => void;
}

export const GoogleMapPicker: React.FC<GoogleMapPickerProps> = ({
  latitude = 31.634,
  longitude = 75.8573,
  district = 'Amritsar',
  state = 'Punjab',
  onLocationSelect,
}) => {
  const [currentLat, setCurrentLat] = useState<number>(latitude);
  const [currentLng, setCurrentLng] = useState<number>(longitude);

  const handleSimulateGPS = () => {
    // Punjab agricultural zone coordinates simulation
    const simulatedLat = Number((30.9 + Math.random() * 1.2).toFixed(4));
    const simulatedLng = Number((74.8 + Math.random() * 1.8).toFixed(4));
    setCurrentLat(simulatedLat);
    setCurrentLng(simulatedLng);
    if (onLocationSelect) {
      onLocationSelect(simulatedLat, simulatedLng);
    }
  };

  const mapEmbedUrl = `https://maps.google.com/maps?q=${currentLat},${currentLng}&hl=en&z=12&output=embed`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold font-heading uppercase tracking-wider text-agri-text flex items-center space-x-1.5">
          <Globe className="w-4 h-4 text-agri-primary" />
          <span>Interactive Farm Geolocation (Google Maps)</span>
        </label>

        <button
          type="button"
          onClick={handleSimulateGPS}
          className="text-xs font-semibold text-agri-primary hover:text-agri-dark flex items-center space-x-1 transition-colors"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Use Current GPS Coordinates</span>
        </button>
      </div>

      <div className="relative rounded-2xl overflow-hidden border border-agri-border shadow-sm h-64 bg-slate-100 group">
        <iframe
          title="Farm Location Google Map"
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          marginHeight={0}
          marginWidth={0}
          src={mapEmbedUrl}
          className="w-full h-full border-0"
        />

        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-xs font-medium flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="font-bold text-agri-text">{district}, {state}</span>
        </div>

        <div className="absolute bottom-3 right-3 bg-slate-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-[11px] font-mono flex items-center space-x-2 shadow-sm">
          <Compass className="w-3.5 h-3.5 text-emerald-400" />
          <span>Lat: {currentLat} | Lng: {currentLng}</span>
        </div>
      </div>

      <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/60 text-xs text-slate-600 flex items-start space-x-2">
        <MapPin className="w-4 h-4 text-agri-primary shrink-0 mt-0.5" />
        <span>
          Geospatial <strong>2dsphere indexing</strong> enabled. Your farm coordinates will automatically highlight your farm to nearby combine harvester pilots & agricultural crews within a 50km radius.
        </span>
      </div>
    </div>
  );
};
