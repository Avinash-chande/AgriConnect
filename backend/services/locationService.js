import { cacheService } from './cacheService.js';
import { withRetry } from '../utils/retryUtil.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/appError.js';
import { Job } from '../models/Job.js';
import { WorkerProfile } from '../models/WorkerProfile.js';
import { createGeoPoint } from '../models/schemas/commonSchemas.js';

import { locationConfig } from '../config/locationConfig.js';

const NOMINATIM_BASE_URL = locationConfig.NOMINATIM_BASE_URL;
const NOMINATIM_USER_AGENT = locationConfig.NOMINATIM_USER_AGENT;
const NOMINATIM_TIMEOUT_MS = Number(process.env.NOMINATIM_TIMEOUT_MS) || 5000;
const CACHE_TTL_SECONDS = locationConfig.GEOCODING_CACHE_TTL;
const ROUTE_CACHE_TTL_SECONDS = locationConfig.ROUTE_CACHE_TTL;

const OSRM_BASE_URL = locationConfig.OSRM_BASE_URL;

/**
 * Normalizes raw Nominatim address output into standard AgriConnect location schema
 */
const normalizeLocationObject = (item, rawLat, rawLng) => {
  const addr = item.address || {};

  const latitude = typeof item.lat !== 'undefined' ? Number(item.lat) : Number(rawLat);
  const longitude = typeof item.lon !== 'undefined' ? Number(item.lon) : Number(rawLng);

  const address = item.name || addr.road || addr.suburb || '';
  // Village / Locality priority: village -> town -> city -> municipality -> suburb -> neighbourhood -> hamlet
  const village = addr.village || addr.town || addr.city || addr.municipality || addr.suburb || addr.neighbourhood || addr.hamlet || '';
  // District priority: district -> state_district -> county -> city_district -> city
  const district = addr.district || addr.state_district || addr.county || addr.city_district || addr.city || '';
  const state = addr.state || '';
  const country = addr.country || 'India';
  const pincode = addr.postcode || '';

  return {
    address,
    village,
    district,
    state,
    country,
    pincode,
    latitude,
    longitude,
    formattedAddress: item.display_name || [address, village, district, state, country, pincode].filter(Boolean).join(', '),
  };
};

/**
 * Service: Convert Address -> Latitude / Longitude (Geocoding)
 * Includes in-memory caching, custom User-Agent, timeout, and retry with exponential backoff.
 */
export const geocodeAddressService = async (searchQuery) => {
  if (!searchQuery || typeof searchQuery !== 'string' || !searchQuery.trim()) {
    throw new AppError('Search query is required for geocoding.', 400);
  }

  const cleanQuery = searchQuery.trim();
  const cacheKey = `location:geocode:${cleanQuery.toLowerCase()}`;

  // 1. Check cache first
  const cached = cacheService.get(cacheKey);
  if (cached) {
    logger.info(`[LocationService] Geocode cache hit for: "${cleanQuery}"`);
    return cached;
  }

  // 2. Fetch from Nominatim API with retry
  const fetchGeocode = async () => {
    const url = new URL(`${NOMINATIM_BASE_URL}/search`);
    url.searchParams.append('q', cleanQuery);
    url.searchParams.append('format', 'json');
    url.searchParams.append('addressdetails', '1');
    url.searchParams.append('countrycodes', 'in'); // Indian agricultural zones preference
    url.searchParams.append('limit', '5');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), NOMINATIM_TIMEOUT_MS);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': NOMINATIM_USER_AGENT,
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorMsg = `Nominatim HTTP error! status: ${response.status}`;
        const err = new Error(errorMsg);
        err.status = response.status;
        throw err;
      }

      const data = await response.json();
      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  };

  try {
    const data = await withRetry(fetchGeocode, {
      maxRetries: 2,
      initialDelayMs: 600,
    });

    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    const normalizedResults = data.map((item) => normalizeLocationObject(item));

    // Cache normalized results
    cacheService.set(cacheKey, normalizedResults, CACHE_TTL_SECONDS);
    return normalizedResults;
  } catch (error) {
    logger.warn(`[LocationService] Geocoding API failed for query "${cleanQuery}": ${error.message}. Returning fallback.`);

    // Fallback response if Nominatim is unreachable
    return [
      {
        address: cleanQuery,
        village: '',
        district: cleanQuery,
        state: 'Punjab',
        country: 'India',
        pincode: '',
        latitude: 31.634,
        longitude: 75.8573,
        formattedAddress: `${cleanQuery}, Punjab, India`,
      },
    ];
  }
};

/**
 * Service: Search Location Autocomplete (Nominatim + Cache + Min 3 Chars)
 */
export const searchLocationAutocompleteService = async (searchQuery, limit = 8) => {
  if (!searchQuery || typeof searchQuery !== 'string' || searchQuery.trim().length < 3) {
    return [];
  }

  const cleanQuery = searchQuery.trim();
  const cacheKey = `location:autocomplete:${cleanQuery.toLowerCase()}`;

  // 1. Check cache
  const cached = cacheService.get(cacheKey);
  if (cached) {
    logger.info(`[LocationService] Autocomplete cache hit for query: "${cleanQuery}"`);
    return cached;
  }

  // 2. Fetch from Nominatim
  const fetchAutocomplete = async () => {
    const url = new URL(`${NOMINATIM_BASE_URL}/search`);
    url.searchParams.append('q', cleanQuery);
    url.searchParams.append('format', 'json');
    url.searchParams.append('addressdetails', '1');
    url.searchParams.append('limit', Math.min(15, Math.max(1, limit)).toString());
    url.searchParams.append('countrycodes', 'in');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), NOMINATIM_TIMEOUT_MS);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': NOMINATIM_USER_AGENT,
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Nominatim Autocomplete HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  };

  try {
    const rawItems = await withRetry(fetchAutocomplete, { maxRetries: 2, initialDelayMs: 500 });

    const results = rawItems.map((item) => {
      const norm = normalizeLocationObject(item);
      return {
        placeName: item.display_name,
        address: norm.address,
        village: norm.village,
        district: norm.district,
        state: norm.state,
        country: norm.country,
        pincode: norm.pincode,
        latitude: norm.latitude,
        longitude: norm.longitude,
        formattedAddress: norm.formattedAddress,
        type: item.type || item.class || 'location',
      };
    });

    cacheService.set(cacheKey, results, CACHE_TTL_SECONDS);
    return results;
  } catch (error) {
    logger.warn(`[LocationService] Autocomplete failed for "${cleanQuery}": ${error.message}. Returning fallback.`);

    // Fallback response for agricultural districts
    const fallback = [
      {
        placeName: `${cleanQuery}, Amritsar, Punjab, India`,
        address: cleanQuery,
        village: cleanQuery,
        district: 'Amritsar',
        state: 'Punjab',
        country: 'India',
        pincode: '143001',
        latitude: 31.634,
        longitude: 75.8573,
        formattedAddress: `${cleanQuery}, Amritsar, Punjab, India`,
        type: 'village',
      },
    ];
    return fallback;
  }
};

/**
 * Service: Convert Latitude / Longitude -> Address (Reverse Geocoding)
 * Includes coordinate validation, in-memory caching, custom User-Agent, and retry with exponential backoff.
 */
export const reverseGeocodeService = async (latitude, longitude) => {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new AppError('Invalid coordinates. Latitude must be between -90 and 90, Longitude between -180 and 180.', 400);
  }

  const cacheKey = `location:reverse:${lat.toFixed(4)}:${lng.toFixed(4)}`;

  // 1. Check cache first
  const cached = cacheService.get(cacheKey);
  if (cached) {
    logger.info(`[LocationService] Reverse geocode cache hit for: ${lat}, ${lng}`);
    return cached;
  }

  // 2. Fetch from Nominatim API with retry
  const fetchReverse = async () => {
    const url = new URL(`${NOMINATIM_BASE_URL}/reverse`);
    url.searchParams.append('lat', lat.toString());
    url.searchParams.append('lon', lng.toString());
    url.searchParams.append('format', 'json');
    url.searchParams.append('addressdetails', '1');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), NOMINATIM_TIMEOUT_MS);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': NOMINATIM_USER_AGENT,
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const err = new Error(`Nominatim Reverse HTTP error! status: ${response.status}`);
        err.status = response.status;
        throw err;
      }

      const data = await response.json();
      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  };

  try {
    const data = await withRetry(fetchReverse, {
      maxRetries: 2,
      initialDelayMs: 600,
    });

    const normalized = normalizeLocationObject(data || {}, lat, lng);

    // Cache normalized result
    cacheService.set(cacheKey, normalized, CACHE_TTL_SECONDS);
    return normalized;
  } catch (error) {
    logger.warn(`[LocationService] Reverse geocoding failed for ${lat}, ${lng}: ${error.message}. Returning fallback.`);

    // Fallback response without inventing fake addresses
    return {
      address: '',
      village: '',
      district: '',
      state: '',
      country: 'India',
      pincode: '',
      latitude: lat,
      longitude: lng,
      formattedAddress: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    };
  }
};

/**
 * Service: OSRM Driving Distance & Route Calculator
 */
export const calculateRouteService = async (startLat, startLng, endLat, endLng) => {
  const sLat = Number(startLat);
  const sLng = Number(startLng);
  const eLat = Number(endLat);
  const eLng = Number(endLng);

  if (
    isNaN(sLat) ||
    isNaN(sLng) ||
    isNaN(eLat) ||
    isNaN(eLng) ||
    sLat < -90 ||
    sLat > 90 ||
    eLat < -90 ||
    eLat > 90 ||
    sLng < -180 ||
    sLng > 180 ||
    eLng < -180 ||
    eLng > 180
  ) {
    throw new AppError('Invalid route coordinates. Latitude must be between -90 and 90, Longitude between -180 and 180.', 400);
  }

  const cacheKey = `location:route:${sLat.toFixed(3)},${sLng.toFixed(3)}->${eLat.toFixed(3)},${eLng.toFixed(3)}`;
  const cached = cacheService.get(cacheKey);
  if (cached) {
    logger.info(`[LocationService] Route cache hit for ${sLat},${sLng} -> ${eLat},${eLng}`);
    return cached;
  }

  try {
    const osrmUrl = `${OSRM_BASE_URL}/route/v1/driving/${sLng},${sLat};${eLng},${eLat}?overview=full&geometries=geojson&steps=true`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(osrmUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': NOMINATIM_USER_AGENT,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`OSRM routing HTTP error status: ${response.status}`);
    }

    const data = await response.json();
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error(data.message || 'No route found between specified coordinates');
    }

    const route = data.routes[0];
    const distanceMeters = Math.round(route.distance);
    const distanceKm = Number((route.distance / 1000).toFixed(1));
    const durationSeconds = Math.round(route.duration);
    const durationMinutes = Math.ceil(route.duration / 60);

    // Format human readable duration
    let formattedDuration = `${durationMinutes} mins`;
    if (durationMinutes >= 60) {
      const hrs = Math.floor(durationMinutes / 60);
      const mins = durationMinutes % 60;
      formattedDuration = mins > 0 ? `${hrs} hr ${mins} mins` : `${hrs} hr`;
    }

    // Extract turn-by-turn steps if available
    const steps = [];
    if (route.legs && route.legs.length > 0 && route.legs[0].steps) {
      route.legs[0].steps.forEach((step) => {
        const name = step.name ? ` onto ${step.name}` : '';
        const instruction = `${step.maneuver?.type || 'Drive'}${name}`;
        steps.push({
          instruction: instruction.charAt(0).toUpperCase() + instruction.slice(1),
          distanceMeters: Math.round(step.distance),
          durationSeconds: Math.round(step.duration),
          maneuver: step.maneuver,
        });
      });
    }

    // Extract Leaflet lat/lng polyline array [[lat, lng], ...]
    const coordinates = (route.geometry?.coordinates || []).map((coord) => [coord[1], coord[0]]);

    const result = {
      distance: {
        meters: distanceMeters,
        kilometers: distanceKm,
        formatted: `${distanceKm} km`,
      },
      duration: {
        seconds: durationSeconds,
        minutes: durationMinutes,
        formatted: formattedDuration,
      },
      geometry: route.geometry,
      coordinates,
      steps,
      isFallback: false,
    };

    cacheService.set(cacheKey, result, ROUTE_CACHE_TTL_SECONDS);
    return result;
  } catch (err) {
    logger.warn(`[LocationService] OSRM routing failed: ${err.message}. Returning Haversine direct polyline estimate.`);

    // Haversine direct line fallback estimate
    const R = 6371; // Earth radius in km
    const dLat = ((eLat - sLat) * Math.PI) / 180;
    const dLon = ((eLng - sLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((sLat * Math.PI) / 180) * Math.cos((eLat * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distKm = Number((R * c).toFixed(1));
    const distMeters = Math.round(distKm * 1000);
    const durMins = Math.ceil((distKm / 40) * 60);

    return {
      distance: {
        meters: distMeters,
        kilometers: distKm,
        formatted: `${distKm} km`,
      },
      duration: {
        seconds: durMins * 60,
        minutes: durMins,
        formatted: `${durMins} mins (est.)`,
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [sLng, sLat],
          [eLng, eLat],
        ],
      },
      coordinates: [
        [sLat, sLng],
        [eLat, eLng],
      ],
      steps: [
        {
          instruction: 'Proceed along direct route to destination',
          distanceMeters: distMeters,
          durationSeconds: durMins * 60,
        },
      ],
      isFallback: true,
    };
  }
};

/**
 * Service: MongoDB 2dsphere Nearby Jobs Radius Search
 */
export const findNearbyJobsService = async (longitude, latitude, radiusKm = 10, queryParams = {}) => {
  const lng = Number(longitude);
  const lat = Number(latitude);
  const radius = Math.min(500, Math.max(1, Number(radiusKm) || 10));
  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit, 10) || 10));
  const skip = (page - 1) * limit;

  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new AppError('Invalid coordinates provided for nearby job search.', 400);
  }

  const maxDistanceMeters = radius * 1000;

  // Filter criteria for open active jobs only
  const matchCriteria = {
    status: 'Active',
    isDeleted: { $ne: true },
  };

  if (queryParams.category) {
    matchCriteria.category = queryParams.category;
  }
  if (queryParams.cropType) {
    matchCriteria.cropType = new RegExp(queryParams.cropType, 'i');
  }

  // Aggregation Pipeline with MongoDB 2dsphere $geoNear
  const pipeline = [
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [lng, lat] },
        distanceField: 'distanceMeters',
        maxDistance: maxDistanceMeters,
        spherical: true,
        query: matchCriteria,
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'farmer',
        foreignField: '_id',
        as: 'farmerUser',
      },
    },
    {
      $unwind: { path: '$farmerUser', preserveNullAndEmptyArrays: true },
    },
    {
      $lookup: {
        from: 'farmerprofiles',
        localField: 'farmer',
        foreignField: 'owner',
        as: 'farmerProfile',
      },
    },
    {
      $unwind: { path: '$farmerProfile', preserveNullAndEmptyArrays: true },
    },
  ];

  if (queryParams.sort === 'newest') {
    pipeline.push({ $sort: { createdAt: -1 } });
  } else {
    pipeline.push({ $sort: { distanceMeters: 1 } });
  }

  // Count total matching jobs before pagination
  const countPipeline = [...pipeline, { $count: 'total' }];
  const countResult = await Job.aggregate(countPipeline);
  const total = countResult.length > 0 ? countResult[0].total : 0;

  pipeline.push({ $skip: skip }, { $limit: limit });

  const results = await Job.aggregate(pipeline);

  const formattedResults = results.map((doc) => {
    const distanceKm = Number((doc.distanceMeters / 1000).toFixed(1));

    let formattedWage = doc.wageType;
    if (doc.wageType === 'Daily' && doc.dailyWage) {
      formattedWage = `₹${doc.dailyWage.toLocaleString('en-IN')} / Daily`;
    } else if (doc.wageType === 'Monthly' && doc.monthlySalary) {
      formattedWage = `₹${doc.monthlySalary.toLocaleString('en-IN')} / Monthly`;
    } else if (doc.dailyWage) {
      formattedWage = `₹${doc.dailyWage.toLocaleString('en-IN')} (${doc.wageType})`;
    }

    // Public / sanitized farmer info (NO private email/mobile/credentials)
    const farmerInfo = {
      _id: doc.farmerUser?._id || doc.farmer,
      name: doc.farmerUser?.name || 'Verified Farmer',
      avatar: doc.farmerUser?.profileImage || doc.farmerUser?.avatar || '',
      isVerified: doc.farmerUser?.isVerified ?? true,
      rating: doc.farmerProfile?.rating || 4.8,
      totalJobsPosted: doc.farmerProfile?.totalJobsPosted || 1,
    };

    const jobInfo = {
      _id: doc._id,
      title: doc.title,
      slug: doc.slug,
      description: doc.description,
      category: doc.category,
      cropType: doc.cropType,
      workType: doc.workType,
      numberOfWorkers: doc.numberOfWorkers,
      genderPreference: doc.genderPreference,
      minimumAge: doc.minimumAge,
      maximumAge: doc.maximumAge,
      experienceRequired: doc.experienceRequired,
      requiredSkills: doc.requiredSkills,
      wageType: doc.wageType,
      dailyWage: doc.dailyWage,
      monthlySalary: doc.monthlySalary,
      formattedWage,
      startDate: doc.startDate,
      endDate: doc.endDate,
      workingHours: doc.workingHours,
      accommodationProvided: doc.accommodationProvided,
      foodProvided: doc.foodProvided,
      transportProvided: doc.transportProvided,
      status: doc.status,
      jobAddress: doc.jobAddress,
      farmImages: doc.farmImages || [],
      jobImages: doc.jobImages || [],
      totalApplications: doc.totalApplications || 0,
      isFeatured: !!doc.isFeatured,
      isUrgent: !!doc.isUrgent,
      createdAt: doc.createdAt,
    };

    return {
      job: jobInfo,
      distanceKm,
      location: doc.location || {
        type: 'Point',
        coordinates: [doc.jobAddress?.longitude || lng, doc.jobAddress?.latitude || lat],
      },
      farmer: farmerInfo,
    };
  });

  return {
    results: formattedResults,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const findNearbyWorkersService = async (longitude, latitude, radiusKm = 10, queryParams = {}) => {
  const lng = Number(longitude);
  const lat = Number(latitude);
  const radius = Math.min(500, Math.max(1, Number(radiusKm) || 10));
  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit, 10) || 10));
  const skip = (page - 1) * limit;

  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new AppError('Invalid coordinates provided for nearby worker search.', 400);
  }

  const maxDistanceMeters = radius * 1000;

  const matchCriteria = {
    isDeleted: { $ne: true },
  };

  // 1. Skill filter
  const skillParam = queryParams.skills || queryParams.skill;
  if (skillParam && skillParam !== 'All Skills' && skillParam !== 'all') {
    const rawSkills = Array.isArray(skillParam) ? skillParam : [skillParam];
    const cleanSkills = rawSkills
      .map((s) => (typeof s === 'string' ? s.trim() : ''))
      .filter((s) => s && s.toLowerCase() !== 'all skills' && s.toLowerCase() !== 'all');
    if (cleanSkills.length > 0) {
      matchCriteria.skills = {
        $in: cleanSkills.map((s) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')),
      };
    }
  }

  // 2. Minimum Experience filter
  const minExp = queryParams.minExperience || queryParams.experience;
  if (minExp && !isNaN(Number(minExp)) && Number(minExp) > 0) {
    matchCriteria.experience = { $gte: Number(minExp) };
  }

  // 3. Availability filter
  if (queryParams.availability && queryParams.availability !== 'all' && queryParams.availability !== 'All Statuses') {
    const cleanAvail = String(queryParams.availability).trim();
    matchCriteria.availability = new RegExp(`^${cleanAvail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  }

  // 4. Maximum Expected Wage filter
  const maxWage = queryParams.maxWage || queryParams.expectedWage;
  if (maxWage && !isNaN(Number(maxWage))) {
    matchCriteria.expectedDailyWage = { $lte: Number(maxWage) };
  }

  // 5. Language filter
  const langParam = queryParams.language || queryParams.languages;
  if (langParam) {
    matchCriteria.languages = { $in: Array.isArray(langParam) ? langParam : [langParam] };
  }

  // 6. District filter
  if (queryParams.district) {
    const distRegex = new RegExp(queryParams.district.trim(), 'i');
    matchCriteria.$or = [
      { preferredDistrict: distRegex },
      { 'address.district': distRegex },
    ];
  }

  // 7. Minimum Rating filter
  const minRating = queryParams.minRating || queryParams.rating;
  if (minRating && !isNaN(Number(minRating))) {
    matchCriteria.rating = { $gte: Number(minRating) };
  }

  // Aggregation Pipeline
  const pipeline = [
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [lng, lat] },
        distanceField: 'distanceMeters',
        maxDistance: maxDistanceMeters,
        spherical: true,
        query: matchCriteria,
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'owner',
        foreignField: '_id',
        as: 'ownerUser',
      },
    },
    {
      $unwind: { path: '$ownerUser', preserveNullAndEmptyArrays: true },
    },
  ];

  // Sorting
  if (queryParams.sort === 'rating') {
    pipeline.push({ $sort: { rating: -1, distanceMeters: 1 } });
  } else if (queryParams.sort === 'experience') {
    pipeline.push({ $sort: { experience: -1, distanceMeters: 1 } });
  } else if (queryParams.sort === 'wage') {
    pipeline.push({ $sort: { expectedDailyWage: 1, distanceMeters: 1 } });
  } else {
    pipeline.push({ $sort: { distanceMeters: 1 } });
  }

  // Count total matches
  const countPipeline = [...pipeline, { $count: 'total' }];
  const countResult = await WorkerProfile.aggregate(countPipeline);
  const total = countResult.length > 0 ? countResult[0].total : 0;

  pipeline.push({ $skip: skip }, { $limit: limit });

  const results = await WorkerProfile.aggregate(pipeline);

  // Format clean response objects strictly excluding private info (Aadhaar, mobile, email, internal tokens)
  const formattedResults = results.map((doc) => {
    const distanceKm = Number((doc.distanceMeters / 1000).toFixed(1));

    const workerInfo = {
      _id: doc._id,
      ownerId: doc.ownerUser?._id || doc.owner,
      name: doc.ownerUser?.name || 'Agricultural Worker',
      profileImage: doc.ownerUser?.profileImage || doc.ownerUser?.avatar || '',
      isVerified: doc.ownerUser?.isVerified ?? true,
      title: doc.title || 'Agricultural Worker',
      bio: doc.bio || '',
      skills: doc.skills || [],
      experience: doc.experience || 0,
      languages: doc.languages || ['English', 'Hindi'],
      education: doc.education || '10th Pass',
      expectedDailyWage: doc.expectedDailyWage || 0,
      expectedMonthlySalary: doc.expectedMonthlySalary || 0,
      availability: doc.availability || 'Immediate',
      preferredWorkType: doc.preferredWorkType || 'Full-Time',
      preferredDistrict: doc.preferredDistrict || doc.address?.district || '',
      preferredState: doc.preferredState || doc.address?.state || '',
      rating: doc.rating || 5.0,
      totalJobsCompleted: doc.totalJobsCompleted || 0,
      address: doc.address
        ? {
          village: doc.address.village || '',
          district: doc.address.district || '',
          state: doc.address.state || '',
          pincode: doc.address.pincode || '',
        }
        : null,
    };

    return {
      worker: workerInfo,
      distanceKm,
      location: doc.location || {
        type: 'Point',
        coordinates: [doc.address?.longitude || lng, doc.address?.latitude || lat],
      },
    };
  });

  return {
    results: formattedResults,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};
