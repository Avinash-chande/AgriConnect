import L from 'leaflet';

/**
 * OpenStreetMap Tile & Map Configuration for AgriConnect
 * Configurable via Vite environment variables:
 * - VITE_MAP_TILE_URL
 * - VITE_MAP_TILE_ATTRIBUTION
 * - VITE_MAP_DEFAULT_LAT
 * - VITE_MAP_DEFAULT_LNG
 */

import { locationConfig } from '../../config/locationConfig';

// Centralized agricultural center: Amritsar, Punjab [lat, lng]
export const DEFAULT_MAP_CENTER: [number, number] = locationConfig.DEFAULT_MAP_CENTER;

export const DEFAULT_MAP_ZOOM = locationConfig.DEFAULT_MAP_ZOOM;

export const MAP_TILE_URL = locationConfig.OSM_TILE_URL;

export const MAP_TILE_ATTRIBUTION = locationConfig.OSM_TILE_ATTRIBUTION;

/**
 * Validates if latitude and longitude are valid numeric numbers within boundary ranges.
 */
export const isValidCoordinate = (lat?: number | null, lng?: number | null): boolean => {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

/**
 * Fix default Leaflet marker icon asset paths when bundled with Vite
 */
export const fixLeafletDefaultIcon = () => {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
};

// Execute Leaflet asset fix
fixLeafletDefaultIcon();

/**
 * Helper: Create styled Leaflet DivIcon for custom marker types
 */
export const createCustomDivIcon = (htmlContent: string, className = '', iconSize: [number, number] = [36, 36]) => {
  return L.divIcon({
    html: htmlContent,
    className: `custom-leaflet-marker ${className}`,
    iconSize,
    iconAnchor: [iconSize[0] / 2, iconSize[1]],
    popupAnchor: [0, -iconSize[1]],
  });
};
