/**
 * Centralized Location & Geospatial Module Configuration for Backend
 * Manages provider URLs, cache durations, search radii, and location privacy defaults.
 * Performs environment variable validation on startup to prevent misconfigurations.
 */

import { logger } from '../utils/logger.js';

const VALID_PRIVACY_LEVELS = ['private', 'approximate', 'verified_users', 'public'];

/**
 * Validates a URL string format or Leaflet tile URL template format
 */
const isValidUrlFormat = (urlString) => {
  if (!urlString || typeof urlString !== 'string') return false;
  // Leaflet tile URL templates contain placeholders like {s}, {z}, {x}, {y}
  if (urlString.includes('{z}') || urlString.includes('{x}') || urlString.includes('{y}')) {
    return urlString.startsWith('http://') || urlString.startsWith('https://');
  }
  try {
    const parsed = new URL(urlString);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Parses and validates environment variables with safe development defaults
 */
export const getValidatedLocationConfig = () => {
  const osmTileUrl = process.env.OSM_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const nominatimBaseUrl = process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org';
  const osrmBaseUrl = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org';
  const nominatimUserAgent = process.env.NOMINATIM_USER_AGENT || 'AgriConnect-Platform/1.0 (contact@agriconnect.com)';

  const geocodingCacheTtl = process.env.GEOCODING_CACHE_TTL 
    ? Number(process.env.GEOCODING_CACHE_TTL)
    : (process.env.NOMINATIM_CACHE_TTL_MS ? Math.floor(Number(process.env.NOMINATIM_CACHE_TTL_MS) / 1000) : 3600);
  const routeCacheTtl = Number(process.env.ROUTE_CACHE_TTL || 86400);

  const maxSearchRadiusKm = Number(process.env.MAX_SEARCH_RADIUS_KM || 100);
  const defaultSearchRadiusKm = Number(process.env.DEFAULT_SEARCH_RADIUS_KM || 25);

  const locationPrivacyDefault = (process.env.LOCATION_PRIVACY_DEFAULT || 'approximate').toLowerCase();

  // Startup Validation Checks
  const validationErrors = [];

  if (!isValidUrlFormat(osmTileUrl)) {
    validationErrors.push(`Invalid OSM_TILE_URL: "${osmTileUrl}". Must be a valid HTTP/HTTPS URL template.`);
  }

  if (!isValidUrlFormat(nominatimBaseUrl)) {
    validationErrors.push(`Invalid NOMINATIM_BASE_URL: "${nominatimBaseUrl}". Must be a valid HTTP/HTTPS URL.`);
  }

  if (!isValidUrlFormat(osrmBaseUrl)) {
    validationErrors.push(`Invalid OSRM_BASE_URL: "${osrmBaseUrl}". Must be a valid HTTP/HTTPS URL.`);
  }

  if (!nominatimUserAgent || nominatimUserAgent.trim().length < 5) {
    validationErrors.push(`Invalid NOMINATIM_USER_AGENT: "${nominatimUserAgent}". Must be at least 5 characters long.`);
  }

  if (isNaN(geocodingCacheTtl) || geocodingCacheTtl <= 0) {
    validationErrors.push(`Invalid GEOCODING_CACHE_TTL: "${process.env.GEOCODING_CACHE_TTL}". Must be a positive integer in seconds.`);
  }

  if (isNaN(routeCacheTtl) || routeCacheTtl <= 0) {
    validationErrors.push(`Invalid ROUTE_CACHE_TTL: "${process.env.ROUTE_CACHE_TTL}". Must be a positive integer in seconds.`);
  }

  if (isNaN(maxSearchRadiusKm) || maxSearchRadiusKm <= 0) {
    validationErrors.push(`Invalid MAX_SEARCH_RADIUS_KM: "${process.env.MAX_SEARCH_RADIUS_KM}". Must be a positive number.`);
  }

  if (isNaN(defaultSearchRadiusKm) || defaultSearchRadiusKm <= 0) {
    validationErrors.push(`Invalid DEFAULT_SEARCH_RADIUS_KM: "${process.env.DEFAULT_SEARCH_RADIUS_KM}". Must be a positive number.`);
  }

  if (defaultSearchRadiusKm > maxSearchRadiusKm) {
    validationErrors.push(`DEFAULT_SEARCH_RADIUS_KM (${defaultSearchRadiusKm}) cannot exceed MAX_SEARCH_RADIUS_KM (${maxSearchRadiusKm}).`);
  }

  if (!VALID_PRIVACY_LEVELS.includes(locationPrivacyDefault)) {
    validationErrors.push(`Invalid LOCATION_PRIVACY_DEFAULT: "${locationPrivacyDefault}". Must be one of: ${VALID_PRIVACY_LEVELS.join(', ')}`);
  }

  if (validationErrors.length > 0) {
    const errorMessage = `❌ [LocationConfig] Startup Configuration Errors:\n - ${validationErrors.join('\n - ')}`;
    logger.error(errorMessage);
    if (process.env.NODE_ENV === 'production') {
      throw new Error(errorMessage);
    }
  }

  return {
    OSM_TILE_URL: osmTileUrl,
    NOMINATIM_BASE_URL: nominatimBaseUrl.replace(/\/+$/, ''), // strip trailing slashes
    OSRM_BASE_URL: osrmBaseUrl.replace(/\/+$/, ''),
    NOMINATIM_USER_AGENT: nominatimUserAgent.trim(),
    GEOCODING_CACHE_TTL: geocodingCacheTtl,
    ROUTE_CACHE_TTL: routeCacheTtl,
    MAX_SEARCH_RADIUS_KM: maxSearchRadiusKm,
    DEFAULT_SEARCH_RADIUS_KM: defaultSearchRadiusKm,
    LOCATION_PRIVACY_DEFAULT: locationPrivacyDefault,
  };
};

export const locationConfig = getValidatedLocationConfig();
