import { query, body } from 'express-validator';
import { validateRequest } from '../middleware/validationMiddleware.js';
import { AppError } from '../utils/appError.js';
import { logger } from '../utils/logger.js';

import { locationConfig } from '../config/locationConfig.js';

const MAX_SEARCH_RADIUS_KM = locationConfig.MAX_SEARCH_RADIUS_KM;

/**
 * Sanitizes input string to prevent NoSQL Injection & ReDoS regex attacks
 */
const sanitizeNoSQLInput = (val) => {
  if (typeof val !== 'string') return '';
  // Remove MongoDB query operators and dangerous symbols
  return val.replace(/[\$\{\}\[\]\']/g, '').trim();
};

/**
 * Express Validator Chain for Geocoding Address Search
 */
export const validateGeocodeQuery = [
  query('q')
    .trim()
    .notEmpty()
    .withMessage('Search query parameter "q" is required')
    .isLength({ min: 2, max: 200 })
    .withMessage('Search query must be between 2 and 200 characters')
    .customSanitizer(sanitizeNoSQLInput),
  validateRequest,
];

/**
 * Express Validator Chain for Reverse Geocoding Coordinates
 */
export const validateReverseQuery = [
  query('lat')
    .notEmpty()
    .withMessage('Latitude query parameter "lat" is required')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be a valid float number between -90 and 90'),
  query('lng')
    .notEmpty()
    .withMessage('Longitude query parameter "lng" is required')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be a valid float number between -180 and 180'),
  validateRequest,
];

/**
 * Express Validator Chain for OSRM Route Navigation Calculation
 */
export const validateRouteQuery = [
  query('startLat')
    .notEmpty()
    .withMessage('startLat is required')
    .isFloat({ min: -90, max: 90 })
    .withMessage('startLat must be a float between -90 and 90'),
  query('startLng')
    .notEmpty()
    .withMessage('startLng is required')
    .isFloat({ min: -180, max: 180 })
    .withMessage('startLng must be a float between -180 and 180'),
  query('endLat')
    .notEmpty()
    .withMessage('endLat is required')
    .isFloat({ min: -90, max: 90 })
    .withMessage('endLat must be a float between -90 and 90'),
  query('endLng')
    .notEmpty()
    .withMessage('endLng is required')
    .isFloat({ min: -180, max: 180 })
    .withMessage('endLng must be a float between -180 and 180'),
  validateRequest,
];

/**
 * Express Validator Chain for Geospatial Nearby Radius Queries
 */
export const validateNearbyQuery = [
  query('lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  query('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  query('lng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  query('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  query().custom((_, { req }) => {
    const lat = req.query.latitude || req.query.lat;
    const lng = req.query.longitude || req.query.lng;
    if (!lat || isNaN(Number(lat)) || Number(lat) < -90 || Number(lat) > 90) {
      logger.warn(`[LocationSecurity] Invalid latitude parameter attempt: ${lat}`);
      throw new Error('Latitude coordinate parameter ("lat" or "latitude") must be between -90 and 90');
    }
    if (!lng || isNaN(Number(lng)) || Number(lng) < -180 || Number(lng) > 180) {
      logger.warn(`[LocationSecurity] Invalid longitude parameter attempt: ${lng}`);
      throw new Error('Longitude coordinate parameter ("lng" or "longitude") must be between -180 and 180');
    }
    return true;
  }),
  query('radius')
    .optional()
    .isFloat({ min: 0.1, max: MAX_SEARCH_RADIUS_KM })
    .withMessage(`radius must be a number between 0.1 and ${MAX_SEARCH_RADIUS_KM} km`),
  query('radiusKm')
    .optional()
    .isFloat({ min: 0.1, max: MAX_SEARCH_RADIUS_KM })
    .withMessage(`radiusKm must be a number between 0.1 and ${MAX_SEARCH_RADIUS_KM} km`),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('limit must be an integer between 1 and 50'),
  validateRequest,
];

/**
 * Express Middleware Validator for GeoJSON Point Objects in Request Body
 */
export const validateGeoJSONInput = (req, res, next) => {
  const { location } = req.body;
  if (!location) return next();

  if (typeof location !== 'object' || location === null) {
    return next(new AppError('GeoJSON location must be a valid object.', 400));
  }

  if (location.type !== 'Point') {
    return next(new AppError('GeoJSON location type must be "Point".', 400));
  }

  if (!Array.isArray(location.coordinates) || location.coordinates.length !== 2) {
    return next(new AppError('GeoJSON location coordinates must be an array of [longitude, latitude].', 400));
  }

  const [lng, lat] = location.coordinates;
  if (typeof lng !== 'number' || isNaN(lng) || lng < -180 || lng > 180) {
    return next(new AppError('GeoJSON longitude (coordinates[0]) must be a float between -180 and 180.', 400));
  }

  if (typeof lat !== 'number' || isNaN(lat) || lat < -90 || lat > 90) {
    return next(new AppError('GeoJSON latitude (coordinates[1]) must be a float between -90 and 90.', 400));
  }

  next();
};

/**
 * Middleware: Validates 24-character hexadecimal MongoDB ObjectId parameters
 */
export const validateLocationIdParam = (paramName = 'id') => [
  query(paramName)
    .optional()
    .isMongoId()
    .withMessage(`${paramName} must be a valid 24-character hex MongoDB ObjectId`),
  validateRequest,
];
