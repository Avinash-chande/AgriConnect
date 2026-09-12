/**
 * Centralized Location & GIS Configuration for Frontend
 * Provides driven-by-environment configuration for map tile servers, Nominatim geocoding, OSRM routing,
 * radius boundaries, cache durations, and privacy default settings.
 */

export interface LocationConfig {
  OSM_TILE_URL: string;
  OSM_TILE_ATTRIBUTION: string;
  NOMINATIM_BASE_URL: string;
  OSRM_BASE_URL: string;
  NOMINATIM_USER_AGENT: string;
  GEOCODING_CACHE_TTL: number; // seconds
  ROUTE_CACHE_TTL: number; // seconds
  MAX_SEARCH_RADIUS_KM: number; // km
  DEFAULT_SEARCH_RADIUS_KM: number; // km
  DEFAULT_MAP_CENTER: [number, number]; // [lat, lng]
  DEFAULT_MAP_ZOOM: number;
  LOCATION_PRIVACY_DEFAULT: 'private' | 'approximate' | 'verified_users' | 'public';
}

/**
 * Validates frontend environment variables and returns sanitized location configuration
 */
export const getFrontendLocationConfig = (): LocationConfig => {
  const env = import.meta.env;

  const osmTileUrl = env.VITE_OSM_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const osmTileAttribution =
    env.VITE_MAP_TILE_ATTRIBUTION ||
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  const nominatimBaseUrl = (env.VITE_NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org').replace(/\/+$/, '');
  const osrmBaseUrl = (env.VITE_OSRM_BASE_URL || 'https://router.project-osrm.org').replace(/\/+$/, '');
  const nominatimUserAgent = env.VITE_NOMINATIM_USER_AGENT || 'AgriConnect-Platform/1.0 (contact@agriconnect.com)';

  const geocodingCacheTtl = Number(env.VITE_GEOCODING_CACHE_TTL) || 3600;
  const routeCacheTtl = Number(env.VITE_ROUTE_CACHE_TTL) || 86400;

  const maxSearchRadius = Number(env.VITE_MAX_SEARCH_RADIUS_KM) || 100;
  const defaultSearchRadius = Number(env.VITE_DEFAULT_SEARCH_RADIUS_KM) || 25;

  const defaultLat = Number(env.VITE_MAP_DEFAULT_LAT) || 31.634; // Amritsar, Punjab
  const defaultLng = Number(env.VITE_MAP_DEFAULT_LNG) || 75.8573;
  const defaultZoom = Number(env.VITE_MAP_DEFAULT_ZOOM) || 12;

  const privacySetting = (env.VITE_LOCATION_PRIVACY_DEFAULT || 'approximate').toLowerCase();
  const validPrivacy: LocationConfig['LOCATION_PRIVACY_DEFAULT'] =
    privacySetting === 'private' || privacySetting === 'public' || privacySetting === 'verified_users'
      ? privacySetting
      : 'approximate';

  return {
    OSM_TILE_URL: osmTileUrl,
    OSM_TILE_ATTRIBUTION: osmTileAttribution,
    NOMINATIM_BASE_URL: nominatimBaseUrl,
    OSRM_BASE_URL: osrmBaseUrl,
    NOMINATIM_USER_AGENT: nominatimUserAgent,
    GEOCODING_CACHE_TTL: geocodingCacheTtl,
    ROUTE_CACHE_TTL: routeCacheTtl,
    MAX_SEARCH_RADIUS_KM: maxSearchRadius,
    DEFAULT_SEARCH_RADIUS_KM: defaultSearchRadius,
    DEFAULT_MAP_CENTER: [defaultLat, defaultLng],
    DEFAULT_MAP_ZOOM: defaultZoom,
    LOCATION_PRIVACY_DEFAULT: validPrivacy,
  };
};

export const locationConfig = getFrontendLocationConfig();
