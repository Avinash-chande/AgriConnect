import React, { useMemo } from 'react';
import { Marker } from 'react-leaflet';
import type { MarkerProps } from 'react-leaflet';
import L from 'leaflet';
import { isValidCoordinate, DEFAULT_MAP_CENTER } from './mapConfig';

export interface MapMarkerProps extends Omit<MarkerProps, 'position'> {
  position?: [number, number] | { lat: number; lng: number } | null;
  latitude?: number | null;
  longitude?: number | null;
  children?: React.ReactNode;
  onDragEndEnd?: (lat: number, lng: number) => void;
  icon?: L.Icon | L.DivIcon;
}

export const MapMarker: React.FC<MapMarkerProps> = ({
  position,
  latitude,
  longitude,
  children,
  onDragEndEnd,
  eventHandlers,
  ...props
}) => {
  const markerPos = useMemo<[number, number]>(() => {
    if (typeof latitude === 'number' && typeof longitude === 'number' && isValidCoordinate(latitude, longitude)) {
      return [latitude, longitude];
    }
    if (position && Array.isArray(position) && isValidCoordinate(position[0], position[1])) {
      return [position[0], position[1]];
    }
    if (position && typeof position === 'object' && 'lat' in position && 'lng' in position && isValidCoordinate(position.lat, position.lng)) {
      return [position.lat, position.lng];
    }
    return DEFAULT_MAP_CENTER;
  }, [position, latitude, longitude]);

  const mergedEventHandlers = useMemo(() => {
    return {
      ...eventHandlers,
      dragend: (e: L.LeafletEvent) => {
        const marker = e.target;
        if (marker && marker.getLatLng) {
          const latLng = marker.getLatLng();
          if (onDragEndEnd) {
            onDragEndEnd(latLng.lat, latLng.lng);
          }
        }
        if (eventHandlers && typeof eventHandlers.dragend === 'function') {
          eventHandlers.dragend(e);
        }
      },
    };
  }, [eventHandlers, onDragEndEnd]);

  return (
    <Marker position={markerPos} eventHandlers={mergedEventHandlers} {...props}>
      {children}
    </Marker>
  );
};
