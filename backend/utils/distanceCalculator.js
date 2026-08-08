/**
 * Reusable Distance Calculation Utility for AgriConnect
 * Supports Haversine spherical math, entity extraction, caching, and unit formatting.
 */

const EARTH_RADIUS_KM = 6371.0088; // Earth radius in km
const EARTH_RADIUS_MILES = 3958.756; // Earth radius in miles
const EARTH_RADIUS_METERS = 6371008.8; // Earth radius in meters

// In-memory cache for fast coordinate pair lookups
const distanceCache = new Map();
const MAX_CACHE_SIZE = 5000;

/**
 * Validate latitude and longitude coordinate bounds
 * @param {number|string} lat
 * @param {number|string} lng
 * @returns {boolean}
 */
export const isValidCoordinates = (lat, lng) => {
  const nLat = Number(lat);
  const nLng = Number(lng);
  return (
    !isNaN(nLat) &&
    !isNaN(nLng) &&
    nLat >= -90 &&
    nLat <= 90 &&
    nLng >= -180 &&
    nLng <= 180
  );
};

/**
 * Flexibly extract { latitude, longitude } from various entity schemas:
 * - GeoJSON Point: { type: "Point", coordinates: [lng, lat] }
 * - Object: { latitude, longitude } or { lat, lng }
 * - Array: [lng, lat]
 * - Document with address or location property
 */
export const extractCoordinates = (entity) => {
  if (!entity) return null;

  // Case 1: Direct { latitude, longitude }
  if (isValidCoordinates(entity.latitude, entity.longitude)) {
    return { latitude: Number(entity.latitude), longitude: Number(entity.longitude) };
  }

  // Case 2: Direct { lat, lng }
  if (isValidCoordinates(entity.lat, entity.lng)) {
    return { latitude: Number(entity.lat), longitude: Number(entity.lng) };
  }

  // Case 3: GeoJSON Point object { type: 'Point', coordinates: [lng, lat] }
  if (
    entity.type === 'Point' &&
    Array.isArray(entity.coordinates) &&
    entity.coordinates.length >= 2 &&
    isValidCoordinates(entity.coordinates[1], entity.coordinates[0])
  ) {
    return { latitude: Number(entity.coordinates[1]), longitude: Number(entity.coordinates[0]) };
  }

  // Case 4: Nested location property
  if (entity.location) {
    const coords = extractCoordinates(entity.location);
    if (coords) return coords;
  }

  // Case 5: Nested jobAddress / address / farmAddress property
  const addr = entity.jobAddress || entity.address || entity.farmAddress;
  if (addr) {
    const coords = extractCoordinates(addr);
    if (coords) return coords;
  }

  // Case 6: Array format [lng, lat]
  if (Array.isArray(entity) && entity.length >= 2 && isValidCoordinates(entity[1], entity[0])) {
    return { latitude: Number(entity[1]), longitude: Number(entity[0]) };
  }

  return null;
};

/**
 * Format numeric distance into human-readable string
 * Example: "850 m away" or "2.4 km away"
 */
export const formatDistance = (km) => {
  if (typeof km !== 'number' || isNaN(km) || km < 0) {
    return 'Distance unavailable';
  }

  if (km < 1) {
    const meters = Math.round(km * 1000);
    return `${meters} m away`;
  }

  return `${km.toFixed(1)} km away`;
};

/**
 * Core Reusable Utility: calculateDistance()
 * Calculates distance between two points/entities using Haversine math with caching.
 */
export const calculateDistance = (origin, destination, options = {}) => {
  const coordA = extractCoordinates(origin);
  const coordB = extractCoordinates(destination);

  if (!coordA || !coordB) {
    return null;
  }

  const { precisionDigits = 1, useCache = true } = options;

  // Zero distance optimization if coordinates match
  if (coordA.latitude === coordB.latitude && coordA.longitude === coordB.longitude) {
    return {
      meters: 0,
      kilometers: 0,
      miles: 0,
      formatted: '0 m away',
    };
  }

  // Generate cache key rounded to 4 decimal places (~11 meters precision)
  const cacheKey = `${coordA.latitude.toFixed(4)},${coordA.longitude.toFixed(4)}->${coordB.latitude.toFixed(4)},${coordB.longitude.toFixed(4)}`;

  if (useCache && distanceCache.has(cacheKey)) {
    return distanceCache.get(cacheKey);
  }

  // Haversine Trigonometric Formula
  const radLat1 = (coordA.latitude * Math.PI) / 180;
  const radLat2 = (coordB.latitude * Math.PI) / 180;
  const deltaLat = ((coordB.latitude - coordA.latitude) * Math.PI) / 180;
  const deltaLng = ((coordB.longitude - coordA.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const rawKm = EARTH_RADIUS_KM * c;
  const rawMeters = EARTH_RADIUS_METERS * c;
  const rawMiles = EARTH_RADIUS_MILES * c;

  const kilometers = Number(rawKm.toFixed(precisionDigits));
  const meters = Math.round(rawMeters);
  const miles = Number(rawMiles.toFixed(precisionDigits));
  const formatted = formatDistance(rawKm);

  const result = {
    meters,
    kilometers,
    miles,
    formatted,
  };

  if (useCache) {
    if (distanceCache.size >= MAX_CACHE_SIZE) {
      // Clear oldest entries if cache exceeds max size
      const firstKey = distanceCache.keys().next().value;
      if (firstKey) distanceCache.delete(firstKey);
    }
    distanceCache.set(cacheKey, result);
  }

  return result;
};

/**
 * Entity Helper: job -> worker distance
 */
export const calculateJobToWorkerDistance = (job, workerProfile) => {
  return calculateDistance(job, workerProfile);
};

/**
 * Entity Helper: worker -> job distance
 */
export const calculateWorkerToJobDistance = (workerProfile, job) => {
  return calculateDistance(workerProfile, job);
};

/**
 * Entity Helper: farmer -> worker distance
 */
export const calculateFarmerToWorkerDistance = (farmerProfile, workerProfile) => {
  return calculateDistance(farmerProfile, workerProfile);
};

/**
 * Entity Helper: user -> job distance
 */
export const calculateUserToJobDistance = (userOrCoords, job) => {
  return calculateDistance(userOrCoords, job);
};
