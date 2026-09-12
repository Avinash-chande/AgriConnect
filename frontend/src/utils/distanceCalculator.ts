/**
 * Reusable Distance Calculation Utility for AgriConnect Frontend
 * Supports Haversine math, entity coordinate extraction, unit formatting, and caching.
 */

const EARTH_RADIUS_KM = 6371.0088;
const EARTH_RADIUS_MILES = 3958.756;
const EARTH_RADIUS_METERS = 6371008.8;

const distanceCache = new Map<string, DistanceResult>();
const MAX_CACHE_SIZE = 2000;

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface DistanceResult {
  meters: number;
  kilometers: number;
  miles: number;
  formatted: string;
}

/**
 * Validate latitude and longitude coordinate bounds
 */
export const isValidCoordinates = (lat: any, lng: any): boolean => {
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
 * Flexibly extract { latitude, longitude } from various entity structures:
 * - GeoJSON Point: { type: "Point", coordinates: [lng, lat] }
 * - Object: { latitude, longitude } or { lat, lng }
 * - Array: [lng, lat]
 * - Entities with jobAddress / address / farmAddress / location
 */
export const extractCoordinates = (entity: any): Coordinates | null => {
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
export const formatDistance = (km: number): string => {
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
 * Calculates distance between two points or entity objects with caching.
 */
export const calculateDistance = (
  origin: any,
  destination: any,
  options: { precisionDigits?: number; useCache?: boolean } = {}
): DistanceResult | null => {
  const coordA = extractCoordinates(origin);
  const coordB = extractCoordinates(destination);

  if (!coordA || !coordB) {
    return null;
  }

  const { precisionDigits = 1, useCache = true } = options;

  // Optimization for identical coordinates
  if (coordA.latitude === coordB.latitude && coordA.longitude === coordB.longitude) {
    return {
      meters: 0,
      kilometers: 0,
      miles: 0,
      formatted: '0 m away',
    };
  }

  const cacheKey = `${coordA.latitude.toFixed(4)},${coordA.longitude.toFixed(4)}->${coordB.latitude.toFixed(4)},${coordB.longitude.toFixed(4)}`;

  if (useCache && distanceCache.has(cacheKey)) {
    return distanceCache.get(cacheKey)!;
  }

  // Haversine formula
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

  const result: DistanceResult = {
    meters,
    kilometers,
    miles,
    formatted,
  };

  if (useCache) {
    if (distanceCache.size >= MAX_CACHE_SIZE) {
      const firstKey = distanceCache.keys().next().value;
      if (firstKey) distanceCache.delete(firstKey);
    }
    distanceCache.set(cacheKey, result);
  }

  return result;
};

/** Entity Helper: job -> worker distance */
export const calculateJobToWorkerDistance = (job: any, workerProfile: any): DistanceResult | null => {
  return calculateDistance(job, workerProfile);
};

/** Entity Helper: worker -> job distance */
export const calculateWorkerToJobDistance = (workerProfile: any, job: any): DistanceResult | null => {
  return calculateDistance(workerProfile, job);
};

/** Entity Helper: farmer -> worker distance */
export const calculateFarmerToWorkerDistance = (farmerProfile: any, workerProfile: any): DistanceResult | null => {
  return calculateDistance(farmerProfile, workerProfile);
};

/** Entity Helper: user -> job distance */
export const calculateUserToJobDistance = (userOrCoords: any, job: any): DistanceResult | null => {
  return calculateDistance(userOrCoords, job);
};
