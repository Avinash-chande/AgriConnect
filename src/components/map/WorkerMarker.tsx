import React, { useMemo } from 'react';
import { MapMarker } from './MapMarker';
import { MapPopup } from './MapPopup';
import { createCustomDivIcon, isValidCoordinate } from './mapConfig';
import { MapPin, IndianRupee, ExternalLink } from 'lucide-react';
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
  worker?: WorkerMarkerData;
  position?: [number, number] | number[] | null;
  name?: string;
  title?: string;
  skills?: string[];
  experience?: number;
  expectedDailyWage?: number;
  rating?: number;
  availability?: string;
  district?: string;
  state?: string;
  onClick?: (worker: WorkerMarkerData) => void;
}

export const WorkerMarker: React.FC<WorkerMarkerProps> = ({
  worker: workerProp,
  position,
  name: nameProp,
  title: titleProp,
  skills: skillsProp,
  expectedDailyWage: wageProp,
  rating: ratingProp,
  availability: availProp,
  district: districtProp,
  state: stateProp,
  onClick,
}) => {
  const latitude = workerProp?.latitude ?? (position && Array.isArray(position) ? position[0] : 0);
  const longitude = workerProp?.longitude ?? (position && Array.isArray(position) ? position[1] : 0);
  const name = workerProp?.name || nameProp || 'Worker';
  const title = workerProp?.title || titleProp || 'Farm Worker';
  const skills = workerProp?.skills || skillsProp || [];
  const expectedDailyWage = workerProp?.expectedDailyWage || wageProp || 0;
  const rating = workerProp?.rating ?? ratingProp ?? 5.0;
  const availability = workerProp?.availability || availProp;
  const district = workerProp?.district || districtProp || '';
  const state = workerProp?.state || stateProp || '';
  const workerId = workerProp?.id;

  const isPosValid = isValidCoordinate(latitude, longitude);

  const customIcon = useMemo(() => {
    const html = `
      <div className="relative flex flex-col items-center group">
        <div className="w-8 h-8 rounded-full bg-amber-500 border-2 border-white shadow-md flex items-center justify-center text-white font-bold text-xs overflow-hidden">
          ${
            workerProp?.profileImage
              ? `<img src="${workerProp.profileImage}" alt="${name}" class="w-full h-full object-cover" />`
              : `<span class="text-[11px]">${name.charAt(0)}</span>`
          }
        </div>
        <div className="px-1.5 py-0.2 bg-slate-900 text-amber-300 text-[9px] font-bold rounded-md shadow-sm -mt-1 flex items-center space-x-0.5 border border-slate-700">
          <span>★ ${rating}</span>
        </div>
      </div>
    `;
    return createCustomDivIcon(html, 'worker-map-marker', [40, 44]);
  }, [workerProp, name, rating]);

  if (!isPosValid) return null;

  return (
    <MapMarker
      position={[latitude, longitude]}
      icon={customIcon}
      eventHandlers={{
        click: () => onClick && workerProp && onClick(workerProp),
      }}
    >
      <MapPopup minWidth={210}>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
              {workerProp?.profileImage ? (
                <img src={workerProp.profileImage} alt={name} className="w-full h-full object-cover" />
              ) : (
                name.charAt(0)
              )}
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-xs">{name}</h4>
              <p className="text-[10px] text-slate-500">{title}</p>
            </div>
          </div>

          {skills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {skills.slice(0, 3).map((skill, idx) => (
                <span key={idx} className="px-1.5 py-0.5 text-[9px] font-semibold bg-slate-100 text-slate-700 rounded-md">
                  {skill}
                </span>
              ))}
            </div>
          )}

          <div className="space-y-1 text-[11px] text-slate-600 border-t border-slate-100 pt-1.5">
            {(district || state) && (
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-1 text-slate-500">
                  <MapPin className="w-3 h-3 text-emerald-600" />
                  <span>{district}{district && state ? ', ' : ''}{state}</span>
                </span>
                {expectedDailyWage > 0 && (
                  <span className="font-bold text-emerald-700 flex items-center">
                    <IndianRupee className="w-3 h-3" />
                    {expectedDailyWage}/day
                  </span>
                )}
              </div>
            )}

            {availability && (
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400">Availability:</span>
                <span className="font-medium text-emerald-600">{availability}</span>
              </div>
            )}
          </div>

          {workerId && (
            <Link
              to={`/workers/${workerId}`}
              className="w-full inline-flex items-center justify-center space-x-1 py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-colors"
            >
              <span>View Worker Profile</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>
      </MapPopup>
    </MapMarker>
  );
};
