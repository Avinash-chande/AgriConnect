import React, { useMemo } from 'react';
import { MapMarker } from './MapMarker';
import { MapPopup } from './MapPopup';
import { createCustomDivIcon, isValidCoordinate } from './mapConfig';
import { Sprout, MapPin, ExternalLink, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface FarmMarkerData {
  id: string;
  farmName: string;
  farmSize: number;
  farmSizeUnit?: string;
  cropTypes?: string[];
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  ownerName?: string;
}

export interface FarmMarkerProps {
  farm: FarmMarkerData;
  onClick?: (farm: FarmMarkerData) => void;
}

export const FarmMarker: React.FC<FarmMarkerProps> = ({ farm, onClick }) => {
  const isPosValid = isValidCoordinate(farm.latitude, farm.longitude);

  const customIcon = useMemo(() => {
    const html = `
      <div className="relative flex flex-col items-center group">
        <div className="w-8 h-8 rounded-2xl bg-emerald-700 text-white border-2 border-emerald-300 shadow-md flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M7 20h10"/>
            <path d="M10 20c0-2.5 1.5-4.5 4-5.5"/>
            <path d="M12 3v17"/>
            <path d="M12 8c-3-2-6-1-8 2 2 3 5 3 8-2Z"/>
            <path d="M12 12c3-2 6-1 8 2-2 3-5 3-8-2Z"/>
          </svg>
        </div>
      </div>
    `;
    return createCustomDivIcon(html, 'farm-map-marker', [36, 36]);
  }, []);

  if (!isPosValid) return null;

  return (
    <MapMarker
      position={[farm.latitude, farm.longitude]}
      icon={customIcon}
      eventHandlers={{
        click: () => onClick && onClick(farm),
      }}
    >
      <MapPopup minWidth={200}>
        <div className="space-y-2">
          <div className="flex items-center space-x-1.5 text-emerald-800 font-bold text-xs">
            <Sprout className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{farm.farmName}</span>
          </div>

          <div className="text-[11px] text-slate-600 space-y-1">
            <div className="flex items-center space-x-1 text-slate-500">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{farm.district}, {farm.state}</span>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 font-medium">
              <span className="text-slate-500">Farm Size:</span>
              <span className="font-bold text-slate-900">{farm.farmSize} {farm.farmSizeUnit || 'Acres'}</span>
            </div>

            {farm.cropTypes && farm.cropTypes.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {farm.cropTypes.slice(0, 3).map((crop, idx) => (
                  <span key={idx} className="px-1.5 py-0.5 text-[9px] font-semibold bg-emerald-50 text-emerald-700 rounded">
                    {crop}
                  </span>
                ))}
              </div>
            )}
          </div>

          <Link
            to={`/farmers/${farm.id}`}
            className="w-full inline-flex items-center justify-center space-x-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors"
          >
            <span>Farm Details</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </MapPopup>
    </MapMarker>
  );
};
