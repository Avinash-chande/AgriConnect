import React, { useMemo } from 'react';
import { MapMarker } from './MapMarker';
import { MapPopup } from './MapPopup';
import { createCustomDivIcon, isValidCoordinate } from './mapConfig';
import { UserCheck, Star, MapPin, IndianRupee, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface WorkerMarkerData {
  id: string;
  name: string;
  title: string;
  skills: string[];
  expectedDailyWage: number;
  rating?: number;
  availability?: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  profileImage?: string;
}

export interface WorkerMarkerProps {
  worker: WorkerMarkerData;
  onClick?: (worker: WorkerMarkerData) => void;
}

export const WorkerMarker: React.FC<WorkerMarkerProps> = ({ worker, onClick }) => {
  const isPosValid = isValidCoordinate(worker.latitude, worker.longitude);

  const customIcon = useMemo(() => {
    const html = `
      <div className="relative flex flex-col items-center group">
        <div className="w-8 h-8 rounded-full bg-amber-500 border-2 border-white shadow-md flex items-center justify-center text-white font-bold text-xs overflow-hidden">
          ${
            worker.profileImage
              ? `<img src="${worker.profileImage}" alt="${worker.name}" class="w-full h-full object-cover" />`
              : `<span class="text-[11px]">${worker.name.charAt(0)}</span>`
          }
        </div>
        <div className="px-1.5 py-0.2 bg-slate-900 text-amber-300 text-[9px] font-bold rounded-md shadow-sm -mt-1 flex items-center space-x-0.5 border border-slate-700">
          <span>★ ${worker.rating || 5.0}</span>
        </div>
      </div>
    `;
    return createCustomDivIcon(html, 'worker-map-marker', [40, 44]);
  }, [worker]);

  if (!isPosValid) return null;

  return (
    <MapMarker
      position={[worker.latitude, worker.longitude]}
      icon={customIcon}
      eventHandlers={{
        click: () => onClick && onClick(worker),
      }}
    >
      <MapPopup minWidth={210}>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
              {worker.profileImage ? (
                <img src={worker.profileImage} alt={worker.name} className="w-full h-full object-cover" />
              ) : (
                worker.name.charAt(0)
              )}
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-xs">{worker.name}</h4>
              <p className="text-[10px] text-slate-500">{worker.title}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            {worker.skills.slice(0, 3).map((skill, idx) => (
              <span key={idx} className="px-1.5 py-0.5 text-[9px] font-semibold bg-slate-100 text-slate-700 rounded-md">
                {skill}
              </span>
            ))}
          </div>

          <div className="space-y-1 text-[11px] text-slate-600 border-t border-slate-100 pt-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1 text-slate-500">
                <MapPin className="w-3 h-3 text-emerald-600" />
                <span>{worker.district}, {worker.state}</span>
              </span>
              <span className="font-bold text-emerald-700 flex items-center">
                <IndianRupee className="w-3 h-3" />
                {worker.expectedDailyWage}/day
              </span>
            </div>

            {worker.availability && (
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400">Availability:</span>
                <span className="font-medium text-emerald-600">{worker.availability}</span>
              </div>
            )}
          </div>

          <Link
            to={`/workers/${worker.id}`}
            className="w-full inline-flex items-center justify-center space-x-1 py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-colors"
          >
            <span>View Worker Profile</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </MapPopup>
    </MapMarker>
  );
};
