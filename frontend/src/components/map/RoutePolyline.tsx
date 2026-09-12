import React from 'react';
import { Polyline } from 'react-leaflet';

interface RoutePolylineProps {
  positions: Array<[number, number]>;
  color?: string;
  weight?: number;
  opacity?: number;
}

export const RoutePolyline: React.FC<RoutePolylineProps> = ({
  positions,
  color = '#10b981', // Emerald 500
  weight = 5,
  opacity = 0.85,
}) => {
  if (!positions || positions.length < 2) return null;

  return (
    <>
      {/* Outer Glow Halo */}
      <Polyline
        positions={positions}
        pathOptions={{
          color: '#064e3b',
          weight: weight + 4,
          opacity: 0.3,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
      {/* Primary Route Line */}
      <Polyline
        positions={positions}
        pathOptions={{
          color,
          weight,
          opacity,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
    </>
  );
};
