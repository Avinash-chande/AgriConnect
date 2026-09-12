import React, { useMemo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { JobMarker } from './JobMarker';
import { isValidCoordinate } from './mapConfig';

export interface JobItem {
  job: {
    _id: string;
    title: string;
    category: string;
    workType: string;
    dailyWage?: number;
    monthlySalary?: number;
    isUrgent?: boolean;
    isFeatured?: boolean;
    jobAddress: {
      village?: string;
      district: string;
      state: string;
      latitude?: number;
      longitude?: number;
    };
  };
  distanceKm?: number;
  location?: {
    type: string;
    coordinates: [number, number];
  };
}

interface JobMarkerClusterProps {
  jobs: JobItem[];
  clusterRadiusDegree?: number; // approx cluster threshold in degrees (~0.015 degrees ~= 1.5km)
  onJobSelect?: (jobId: string) => void;
}

interface ClusterGroup {
  id: string;
  center: [number, number];
  items: JobItem[];
}

export const JobMarkerCluster: React.FC<JobMarkerClusterProps> = ({
  jobs,
  clusterRadiusDegree = 0.012,
  onJobSelect,
}) => {
  // Group jobs into spatial clusters
  const clusters = useMemo(() => {
    const validJobs = jobs.filter((item) => {
      const lat = item.job.jobAddress?.latitude || item.location?.coordinates[1];
      const lng = item.job.jobAddress?.longitude || item.location?.coordinates[0];
      return isValidCoordinate(lat, lng);
    });

    const groups: ClusterGroup[] = [];

    validJobs.forEach((item) => {
      const lat = (item.job.jobAddress?.latitude || item.location?.coordinates[1])!;
      const lng = (item.job.jobAddress?.longitude || item.location?.coordinates[0])!;

      // Find an existing cluster within clusterRadiusDegree distance
      const existingCluster = groups.find((g) => {
        const dLat = Math.abs(g.center[0] - lat);
        const dLng = Math.abs(g.center[1] - lng);
        return dLat < clusterRadiusDegree && dLng < clusterRadiusDegree;
      });

      if (existingCluster) {
        existingCluster.items.push(item);
        // Recalculate cluster center centroid
        const total = existingCluster.items.length;
        const sumLat = existingCluster.items.reduce(
          (sum, i) => sum + (i.job.jobAddress?.latitude || i.location?.coordinates[1]!),
          0
        );
        const sumLng = existingCluster.items.reduce(
          (sum, i) => sum + (i.job.jobAddress?.longitude || i.location?.coordinates[0]!),
          0
        );
        existingCluster.center = [sumLat / total, sumLng / total];
      } else {
        groups.push({
          id: `cluster-${item.job._id}`,
          center: [lat, lng],
          items: [item],
        });
      }
    });

    return groups;
  }, [jobs, clusterRadiusDegree]);

  return (
    <>
      {clusters.map((group) => {
        // Single item -> Render standard JobMarker pin
        if (group.items.length === 1) {
          const item = group.items[0];
          const lat = item.job.jobAddress?.latitude || item.location?.coordinates[1]!;
          const lng = item.job.jobAddress?.longitude || item.location?.coordinates[0]!;

          return (
            <JobMarker
              key={item.job._id}
              position={[lat, lng]}
              title={item.job.title}
              category={item.job.category}
              wageText={
                item.job.dailyWage
                  ? `₹${item.job.dailyWage}/day`
                  : item.job.monthlySalary
                  ? `₹${item.job.monthlySalary}/month`
                  : 'Negotiable'
              }
              district={item.job.jobAddress?.district || ''}
              state={item.job.jobAddress?.state || ''}
            />
          );
        }

        // Multiple items -> Render Cluster Count Badge Marker
        const clusterIcon = L.divIcon({
          className: 'custom-job-cluster-icon',
          html: `<div style="
            background: linear-gradient(135deg, #059669, #10b981);
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
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
          ">${group.items.length}</div>`,
          iconSize: [38, 38],
          iconAnchor: [19, 19],
        });

        return (
          <Marker key={group.id} position={group.center} icon={clusterIcon}>
            <Popup className="agri-job-cluster-popup">
              <div className="p-2 space-y-2 max-w-xs text-slate-900 font-sans">
                <div className="flex items-center justify-between border-b pb-1.5">
                  <span className="font-extrabold text-xs text-emerald-700">
                    📍 {group.items.length} Jobs in this Cluster Area
                  </span>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {group.items.map((item) => (
                    <div
                      key={item.job._id}
                      className="p-2 bg-emerald-50 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-colors text-left cursor-pointer"
                      onClick={() => onJobSelect && onJobSelect(item.job._id)}
                    >
                      <h4 className="font-bold text-xs text-emerald-950 truncate">{item.job.title}</h4>
                      <div className="flex items-center justify-between text-[11px] text-emerald-700 font-medium mt-0.5">
                        <span>{item.job.jobAddress?.district}</span>
                        <span className="font-bold">
                          ₹{item.job.dailyWage || item.job.monthlySalary}
                        </span>
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
