import express from 'express';
import {
  geocodeAddressController,
  reverseGeocodeController,
  searchLocationAutocompleteController,
  calculateRouteController,
  calculateDistanceController,
  findNearbyJobsController,
  findNearbyWorkersController,
} from '../controllers/locationController.js';
import {
  validateGeocodeQuery,
  validateReverseQuery,
  validateRouteQuery,
  validateNearbyQuery,
} from '../validators/locationValidator.js';
import { locationRateLimiter } from '../middleware/rateLimiter.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { USER_ROLES } from '../constants/index.js';
import { publicCacheControl } from './profileRoutes.js';

const router = express.Router();

// Apply location rate limiter to all location endpoints
router.use(locationRateLimiter);

/**
 * @route   GET /api/v1/location/search-autocomplete
 * @desc    Search location autocomplete (Min 3 chars)
 * @access  Public
 */
router.get('/search-autocomplete', publicCacheControl, searchLocationAutocompleteController);

/**
 * @route   GET /api/v1/location/geocode
 * @desc    Geocode address string -> normalized location object
 * @access  Public
 */
router.get('/geocode', publicCacheControl, validateGeocodeQuery, geocodeAddressController);

/**
 * @route   GET /api/v1/location/reverse
 * @desc    Reverse geocode latitude/longitude -> normalized location object
 * @access  Public
 */
router.get('/reverse', publicCacheControl, validateReverseQuery, reverseGeocodeController);

/**
 * @route   GET /api/v1/location/distance
 * @desc    Calculate geodesic distance (meters, kilometers, miles, formatted)
 * @access  Public
 */
router.get('/distance', publicCacheControl, calculateDistanceController);

/**
 * @route   GET /api/v1/location/route
 * @desc    Calculate driving distance & route geometry via OSRM
 * @access  Public
 */
router.get('/route', publicCacheControl, validateRouteQuery, calculateRouteController);

/**
 * @route   GET /api/v1/location/nearby-jobs
 * @desc    Find active jobs near coordinates via 2dsphere index
 * @access  Public
 */
router.get('/nearby-jobs', publicCacheControl, validateNearbyQuery, findNearbyJobsController);

/**
 * @route   GET /api/v1/location/nearby-workers
 * @desc    Find worker profiles near coordinates via 2dsphere index (Farmers Only)
 * @access  Private (Farmer Only)
 */
router.get(
  '/nearby-workers',
  protect,
  authorize(USER_ROLES.FARMER),
  validateNearbyQuery,
  findNearbyWorkersController
);

export default router;
