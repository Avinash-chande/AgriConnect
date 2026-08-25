import React from 'react';
import { MapPin, Navigation, Compass } from 'lucide-react';
import { LocationMap } from '../map/LocationMap';

interface MapCardProps {
  district: string;
  state: string;
  village?: string;
  latitude?: number;
  longitude?: number;
  className?: string;
}

export const MapCard: React.FC<MapCardProps> = ({
  district = '',
  state = '',
  village,
  latitude = 0,
  longitude = 0,
  className = '',
}) => {
  const openStreetMapDirectionsUrl = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=;${latitude}%2C${longitude}`;

  return (
    <div className={`bg-white rounded-3xl border border-slate-200 p-5 shadow-soft-sm text-left space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MapPin className="w-5 h-5 text-agri-primary" />
          <h4 className="text-sm font-bold font-heading text-slate-900">
            {village ? `${village}, ` : ''}{district}, {state}
          </h4>
        </div>

        <a
          href={openStreetMapDirectionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-bold text-agri-primary hover:text-agri-hover flex items-center space-x-1 transition-colors"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Get Directions</span>
        </a>
      </div>

      <div className="relative rounded-2xl overflow-hidden h-44 border border-slate-200 bg-slate-100">
        <LocationMap
          latitude={latitude}
          longitude={longitude}
          height="h-44"
          zoom={12}
          showControls={false}
        />

        <div className="absolute bottom-2 right-2 z-[1000] bg-slate-900/90 text-white px-2.5 py-1 rounded-xl text-[10px] font-mono flex items-center space-x-1 shadow-sm pointer-events-none">
          <Compass className="w-3 h-3 text-emerald-400" />
          <span>{latitude.toFixed(4)}, {longitude.toFixed(4)}</span>
        </div>
      </div>
    </div>
  );
};
