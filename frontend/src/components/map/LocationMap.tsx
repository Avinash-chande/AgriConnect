import React, { useRef } from 'react';
import { MapContainer } from './MapContainer';
import { MapMarker } from './MapMarker';
import { MapControls } from './MapControls';
import { UserLocationMarker } from './UserLocationMarker';
import { JobMarker } from "./JobMarker";
import type { JobMarkerData } from "./JobMarker";
import { WorkerMarker } from "./WorkerMarker";
import type { WorkerMarkerData } from "./WorkerMarker";
import { FarmMarker } from "./FarmMarker";
import type { FarmMarkerData } from "./FarmMarker";
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, isValidCoordinate } from './mapConfig';

export interface LocationMapProps {
  latitude?: number | null;
  longitude?: number | null;
  center?: [number, number] | number[] | null;
  zoom?: number;
  height?: string;
  className?: string;
  userGps?: { lat: number; lng: number; accuracy?: number } | null;
  jobs?: JobMarkerData[];
  workers?: WorkerMarkerData[];
  farms?: FarmMarkerData[];
  onJobClick?: (job: JobMarkerData) => void;
  onWorkerClick?: (worker: WorkerMarkerData) => void;
  onFarmClick?: (farm: FarmMarkerData) => void;
  showControls?: boolean;
  children?: React.ReactNode;
}

export const LocationMap: React.FC<LocationMapProps> = React.memo(({
  latitude,
  longitude,
  center: centerProp,
  zoom = DEFAULT_MAP_ZOOM,
  height = 'h-96',
  className = '',
  userGps,
  jobs = [],
  workers = [],
  farms = [],
  onJobClick,
  onWorkerClick,
  onFarmClick,
  showControls = true,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const center: [number, number] =
    centerProp && Array.isArray(centerProp) && centerProp.length >= 2 && isValidCoordinate(centerProp[0], centerProp[1])
      ? [centerProp[0], centerProp[1]]
      : isValidCoordinate(latitude, longitude) && latitude && longitude
      ? [latitude, longitude]
      : userGps && isValidCoordinate(userGps.lat, userGps.lng)
      ? [userGps.lat, userGps.lng]
      : DEFAULT_MAP_CENTER;

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-3xl overflow-hidden border border-slate-200 shadow-soft-md ${height} ${className}`}
    >
      <MapContainer center={center} zoom={zoom} className="w-full h-full">
        {/* Single point marker if latitude/longitude provided */}
        {isValidCoordinate(latitude, longitude) && latitude && longitude && (
          <MapMarker position={[latitude, longitude]} />
        )}

        {/* User GPS location marker */}
        {userGps && isValidCoordinate(userGps.lat, userGps.lng) && (
          <UserLocationMarker
            latitude={userGps.lat}
            longitude={userGps.lng}
            accuracy={userGps.accuracy || 30}
          />
        )}

        {/* Domain Job Markers */}
        {jobs.map((job) => (
          <JobMarker key={job.id} job={job} onClick={onJobClick} />
        ))}

        {/* Domain Worker Markers */}
        {workers.map((worker) => (
          <WorkerMarker key={worker.id} worker={worker} onClick={onWorkerClick} />
        ))}

        {/* Domain Farm Markers */}
        {farms.map((farm) => (
          <FarmMarker key={farm.id} farm={farm} onClick={onFarmClick} />
        ))}

        {/* Custom Map Overlay Children */}
        {children}

        {/* Interactive Controls Bar */}
        {showControls && <MapControls containerRef={containerRef} />}
      </MapContainer>
    </div>
  );
});
