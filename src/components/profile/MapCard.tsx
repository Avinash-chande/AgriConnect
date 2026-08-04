import React from 'react';
import { MapPin, Navigation, Compass } from 'lucide-react';

interface MapCardProps {
  district: string;
  state: string;
  village?: string;
  latitude?: number;
  longitude?: number;
  className?: string;
}

export const MapCard: React.FC<MapCardProps> = ({
  district = 'Amritsar',
  state = 'Punjab',
  village,
  latitude = 31.634,
  longitude = 75.8573,
  className = '',
}) => {
  const googleMapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

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
          href={googleMapsDirectionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-bold text-agri-primary hover:text-agri-hover flex items-center space-x-1"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Get Directions</span>
        </a>
      </div>

      <div className="relative rounded-2xl overflow-hidden h-40 border border-slate-200 bg-slate-100">
        <iframe
          title="Map Location"
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          src={`https://maps.google.com/maps?q=${latitude},${longitude}&hl=en&z=12&output=embed`}
          className="w-full h-full border-0"
        />

        <div className="absolute bottom-2 right-2 bg-slate-900/90 text-white px-2.5 py-1 rounded-xl text-[10px] font-mono flex items-center space-x-1">
          <Compass className="w-3 h-3 text-emerald-400" />
          <span>{latitude}, {longitude}</span>
        </div>
      </div>
    </div>
  );
};
