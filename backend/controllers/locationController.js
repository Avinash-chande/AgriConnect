import { asyncHandler } from '../utils/asyncHandler.js';
import { sendResponse, sendSuccessResponse } from '../utils/apiResponse.js';
import {
  geocodeAddressService,
  reverseGeocodeService,
  searchLocationAutocompleteService,
  calculateRouteService,
  findNearbyJobsService,
  findNearbyWorkersService,
} from '../services/locationService.js';
import { calculateDistance } from '../utils/distanceCalculator.js';

/**
 * @desc    Search Location Autocomplete (Min 3 Chars)
 * @route   GET /api/v1/location/search-autocomplete
 * @access  Public
 */
export const searchLocationAutocompleteController = asyncHandler(async (req, res) => {
  const query = req.query.q || req.query.query || '';
  const limit = req.query.limit || 8;
  const results = await searchLocationAutocompleteService(query, limit);
  return sendSuccessResponse(res, 200, `Found ${results.length} autocomplete matches.`, results);
});

/**
 * @desc    Geocode Address String -> Normalized Location Object(s)
 * @route   GET /api/v1/location/geocode
 * @access  Public
 */
export const geocodeAddressController = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const results = await geocodeAddressService(q);
  return sendSuccessResponse(res, 200, 'Geocoding completed successfully.', results);
});

/**
 * @desc    Reverse Geocode Latitude/Longitude -> Normalized Location Object
 * @route   GET /api/v1/location/reverse
 * @access  Public
 */
export const reverseGeocodeController = asyncHandler(async (req, res) => {
  const { lat, lng } = req.query;
  const result = await reverseGeocodeService(lat, lng);
  return sendSuccessResponse(res, 200, 'Reverse geocoding completed successfully.', result);
});

/**
 * @desc    Calculate Geodesic Distance between Coordinates (meters, kilometers, miles, formatted)
 * @route   GET /api/v1/location/distance
 * @access  Public
 */
export const calculateDistanceController = asyncHandler(async (req, res) => {
  const startLat = req.query.startLat || req.query.lat1;
  const startLng = req.query.startLng || req.query.lng1;
  const endLat = req.query.endLat || req.query.lat2;
  const endLng = req.query.endLng || req.query.lng2;

  const result = calculateDistance(
    { latitude: startLat, longitude: startLng },
    { latitude: endLat, longitude: endLng }
  );

  if (!result) {
    return sendResponse(res, 400, 'Invalid coordinates provided for distance calculation.');
  }

  return sendResponse(res, 200, 'Distance calculated successfully', result);
});

/**
 * @desc    Calculate OSRM Route & Distance
 * @route   GET /api/v1/location/route
 * @access  Public
 */
export const calculateRouteController = asyncHandler(async (req, res) => {
  const { startLat, startLng, endLat, endLng } = req.query;
  const routeData = await calculateRouteService(startLat, startLng, endLat, endLng);
  return sendSuccessResponse(res, 200, 'Route calculation completed successfully.', routeData);
});

/**
 * @desc    Find Nearby Active Jobs via 2dsphere Index
 * @route   GET /api/v1/location/nearby-jobs
 * @access  Public
 */
export const findNearbyJobsController = asyncHandler(async (req, res) => {
  const targetLat = req.query.latitude || req.query.lat;
  const targetLng = req.query.longitude || req.query.lng;
  const targetRadius = req.query.radius || req.query.radiusKm || 10;

  const data = await findNearbyJobsService(targetLng, targetLat, targetRadius, req.query);

  return sendResponse(res, 200, `Found ${data.results.length} open jobs within ${targetRadius}km radius.`, data.results, {
    pagination: data.pagination,
    radiusKm: Number(targetRadius),
    coordinates: {
      latitude: Number(targetLat),
      longitude: Number(targetLng),
    },
  });
});

/**
 * @desc    Find Nearby Workers via 2dsphere Index
 * @route   GET /api/v1/location/nearby-workers
 * @access  Public
 */
export const findNearbyWorkersController = asyncHandler(async (req, res) => {
  const targetLat = req.query.latitude || req.query.lat;
  const targetLng = req.query.longitude || req.query.lng;
  const targetRadius = req.query.radius || req.query.radiusKm || 10;

  const data = await findNearbyWorkersService(targetLng, targetLat, targetRadius, req.query);

  return sendResponse(res, 200, `Found ${data.results.length} available workers within ${targetRadius}km radius.`, data.results, {
    pagination: data.pagination,
    radiusKm: Number(targetRadius),
    coordinates: {
      latitude: Number(targetLat),
      longitude: Number(targetLng),
    },
  });
});
