import React, { useMemo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { WorkerMarker } from './WorkerMarker';
import { isValidCoordinate } from './mapConfig';

export interface WorkerItem {
  worker: {
    _id: string;
    ownerId: string;
    name: string;
    profileImage?: string;
    isVerified?: boolean;
    title?: string;
    bio?: string;
    skills: string[];
    experience: number;
    languages: string[];
    education?: string;
    expectedDailyWage: number;
    availability: string;
    preferredDistrict?: string;
    preferredState?: string;
    rating: number;
    totalJobsCompleted: number;
    address?: {
      village?: string;
      district?: string;
      state?: string;
      pincode?: string;
    } | null;
  };
  distanceKm: number;
  location: {
    type: string;
    coordinates: [number, number];
  };
}

interface WorkerMarkerClusterProps {
  workers: WorkerItem[];
  clusterRadiusDegree?: number; // ~0.012 deg ~= 1.2km
  onWorkerSelect?: (workerId: string) => void;
}

interface WorkerClusterGroup {
  id: string;
  center: [number, number];
  items: WorkerItem[];
}

export const WorkerMarkerCluster: React.FC<WorkerMarkerClusterProps> = ({
  workers,
  clusterRadiusDegree = 0.012,
  onWorkerSelect,
}) => {
  // Group worker profiles into spatial clusters with approximate coordinate jitter for privacy
  const clusters = useMemo(() => {
    const validWorkers = workers.filter((item) => {
      const lat = item.location?.coordinates[1] || item.worker.address?.village ? 31.634 : 0;
      const lng = item.location?.coordinates[0] || 75.8573;
      return isValidCoordinate(lat, lng);
    });

    const groups: WorkerClusterGroup[] = [];

    validWorkers.forEach((item) => {
      // Apply subtle spatial jitter (~300m offset) to protect exact worker residence privacy
      const origLat = item.location?.coordinates[1] || 31.634;
      const origLng = item.location?.coordinates[0] || 75.8573;

      // Hash worker ID to produce deterministic small privacy offset
      const hash = item.worker._id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const latJitter = ((hash % 11) - 5) * 0.0015; // ~150m jitter
      const lngJitter = (((hash * 7) % 11) - 5) * 0.0015;

      const approxLat = origLat + latJitter;
      const approxLng = origLng + lngJitter;

      const existing = groups.find((g) => {
        const dLat = Math.abs(g.center[0] - approxLat);
        const dLng = Math.abs(g.center[1] - approxLng);
        return dLat < clusterRadiusDegree && dLng < clusterRadiusDegree;
      });

      if (existing) {
        existing.items.push(item);
        const total = existing.items.length;
        const sumLat = existing.center[0] * (total - 1) + approxLat;
        const sumLng = existing.center[1] * (total - 1) + approxLng;
        existing.center = [sumLat / total, sumLng / total];
      } else {
        groups.push({
          id: `worker-cluster-${item.worker._id}`,
          center: [approxLat, approxLng],
          items: [item],
        });
      }
    });

    return groups;
  }, [workers, clusterRadiusDegree]);

  return (
    <>
      {clusters.map((group) => {
        // Single Worker -> Render WorkerMarker with privacy notice
        if (group.items.length === 1) {
          const item = group.items[0];
          return (
            <WorkerMarker
              key={item.worker._id}
              position={group.center}
              name={item.worker.name}
              title={item.worker.title}
              skills={item.worker.skills}
              experience={item.worker.experience}
              expectedDailyWage={item.worker.expectedDailyWage}
              rating={item.worker.rating}
              availability={item.worker.availability}
            />
          );
        }

        // Multiple Workers -> Render Cluster Badge Marker
        const clusterIcon = L.divIcon({
          className: 'custom-worker-cluster-icon',
          html: `<div style="
            background: linear-gradient(135deg, #0284c7, #38bdf8);
            color: #ffffff;
            font-weight: 800;
            font-size: 12px;
            width: 38px;
            height: 38px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 3px solid #ffffff;
            box-shadow: 0 4px 12px rgba(56, 189, 248, 0.4);
          ">${group.items.length}</div>`,
          iconSize: [38, 38],
          iconAnchor: [19, 19],
        });

        return (
          <Marker key={group.id} position={group.center} icon={clusterIcon}>
            <Popup className="agri-worker-cluster-popup">
              <div className="p-2 space-y-2 max-w-xs text-slate-900 font-sans">
                <div className="flex items-center justify-between border-b pb-1.5">
                  <span className="font-extrabold text-xs text-sky-800">
                    👨‍🌾 {group.items.length} Workers in this Area
                  </span>
                  <span className="text-[9px] text-gray-500 font-medium">Approximate Area</span>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {group.items.map((item) => (
                    <div
                      key={item.worker._id}
                      className="p-2 bg-sky-50 rounded-xl border border-sky-100 hover:bg-sky-100 transition-colors text-left cursor-pointer"
                      onClick={() => onWorkerSelect && onWorkerSelect(item.worker._id)}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs text-sky-950 truncate">{item.worker.name}</h4>
                        <span className="text-[10px] font-bold text-amber-600">⭐ {item.worker.rating || 5.0}</span>
                      </div>
                      <p className="text-[11px] text-sky-700 font-medium truncate">{item.worker.title || 'Agricultural Specialist'}</p>
                      <div className="flex items-center justify-between text-[10px] text-gray-600 mt-1">
                        <span>{item.worker.experience} Yrs Exp</span>
                        <span className="font-extrabold text-emerald-700">₹{item.worker.expectedDailyWage}/day</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
};
