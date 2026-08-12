import React, { useMemo } from 'react';
import { MapMarker } from './MapMarker';
import { MapPopup } from './MapPopup';
import { createCustomDivIcon, isValidCoordinate } from './mapConfig';
import { Briefcase, MapPin, IndianRupee, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface JobMarkerData {
  id: string;
  title: string;
  category: string;
  cropType?: string;
  dailyWage?: number;
  monthlySalary?: number;
  wageType?: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  isUrgent?: boolean;
}

export interface JobMarkerProps {
  job?: JobMarkerData;
  position?: [number, number] | number[] | null;
  title?: string;
  category?: string;
  wageText?: string;
  district?: string;
  state?: string;
  onClick?: (job: JobMarkerData) => void;
}

export const JobMarker: React.FC<JobMarkerProps> = ({
  job: jobProp,
  position,
  title: titleProp,
  category: categoryProp,
  wageText: wageTextProp,
  district: districtProp,
  state: stateProp,
  onClick,
}) => {
  const latitude = jobProp?.latitude ?? (position && Array.isArray(position) ? position[0] : 0);
  const longitude = jobProp?.longitude ?? (position && Array.isArray(position) ? position[1] : 0);
  const title = jobProp?.title || titleProp || 'Agricultural Job';
  const category = jobProp?.category || categoryProp || 'General';
  const district = jobProp?.district || districtProp || '';
  const state = jobProp?.state || stateProp || '';
  const wageText = wageTextProp || (jobProp ? `₹${jobProp.dailyWage || jobProp.monthlySalary || 'Wage'}` : 'Wage');
  const jobId = jobProp?.id;

  const isPosValid = isValidCoordinate(latitude, longitude);

  const customIcon = useMemo(() => {
    const badgeColor = jobProp?.isUrgent ? 'bg-rose-500' : 'bg-emerald-600';
    const html = `
      <div className="relative flex flex-col items-center group">
        <div className="px-2 py-0.5 ${badgeColor} text-white font-bold text-[10px] rounded-full shadow-md whitespace-nowrap mb-0.5 border border-white">
          ${wageText}
        </div>
        <div className="w-8 h-8 rounded-2xl bg-white border-2 border-emerald-600 shadow-md flex items-center justify-center text-emerald-700">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
          </svg>
        </div>
      </div>
    `;
    return createCustomDivIcon(html, 'job-map-marker', [48, 48]);
  }, [jobProp, wageText]);

  if (!isPosValid) return null;

  return (
    <MapMarker
      position={[latitude, longitude]}
      icon={customIcon}
      eventHandlers={{
        click: () => onClick && jobProp && onClick(jobProp),
      }}
    >
      <MapPopup minWidth={220}>
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-emerald-100 text-emerald-800">
              {category}
            </span>
            {jobProp?.isUrgent && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-rose-100 text-rose-700">
                Urgent
              </span>
            )}
          </div>

          <h4 className="font-bold text-slate-900 text-xs leading-snug line-clamp-2">
            {title}
          </h4>

          <div className="space-y-1 text-[11px] text-slate-600">
            {(district || state) && (
              <div className="flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{district}{district && state ? ', ' : ''}{state}</span>
              </div>
            )}

            <div className="flex items-center space-x-1.5 font-semibold text-emerald-700">
              <IndianRupee className="w-3.5 h-3.5 shrink-0" />
              <span>{wageText}</span>
            </div>

            {jobProp?.cropType && (
              <div className="flex items-center space-x-1.5 text-slate-500">
                <Briefcase className="w-3.5 h-3.5 shrink-0" />
                <span>Crop: {jobProp.cropType}</span>
              </div>
            )}
          </div>

          {jobId && (
            <Link
              to={`/jobs/${jobId}`}
              className="w-full inline-flex items-center justify-center space-x-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors"
            >
              <span>View Job Vacancy</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </MapPopup>
    </MapMarker>
  );
};
