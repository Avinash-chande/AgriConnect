import { body, query } from 'express-validator';
import { validateRequest } from '../middleware/validationMiddleware.js';
import { FARM_SIZE_UNITS, IRRIGATION_TYPES, EDUCATION_LEVELS, AVAILABILITY_STATUS, PREFERRED_WORK_TYPES } from '../constants/index.js';

// Custom Validators
export const isValidIndianMobile = (value) => {
  if (!value) return true; // Optional unless required
  return /^[0-9+\-\s]{8,15}$/.test(value.toString().trim());
};

export const isValidIndianPincode = (value) => {
  if (!value) return true; // Optional unless required
  return /^[1-9][0-9]{5}$/.test(value.toString().trim());
};

export const isValidAadhaarNumber = (value) => {
  if (!value) return true; // Optional unless required
  return /^\d{12}$/.test(value.toString().trim());
};

/**
 * Farmer Profile Express Validator Chain
 */
export const validateFarmerProfileInput = [
  body('farmName')
    .trim()
    .notEmpty()
    .withMessage('Farm name is required')
    .isLength({ min: 2, max: 150 })
    .withMessage('Farm name must be between 2 and 150 characters'),
  body('farmSize')
    .notEmpty()
    .withMessage('Farm size is required')
    .isNumeric()
    .withMessage('Farm size must be a number')
    .custom((val) => Number(val) > 0)
    .withMessage('Farm size must be greater than 0'),
  body('farmSizeUnit')
    .optional()
    .isIn(FARM_SIZE_UNITS)
    .withMessage(`Farm size unit must be one of: ${FARM_SIZE_UNITS.join(', ')}`),
  body('cropTypes')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Crop types must be an array with at least 1 primary crop'),
  body('irrigationType')
    .optional()
    .isIn(IRRIGATION_TYPES)
    .withMessage(`Irrigation type must be one of: ${IRRIGATION_TYPES.join(', ')}`),
  body('farmAddress.district')
    .optional({ checkFalsy: true })
    .trim(),
  body('farmAddress.state')
    .optional({ checkFalsy: true })
    .trim(),
  body('farmAddress.pincode')
    .optional({ checkFalsy: true })
    .custom((val) => !val || isValidIndianPincode(val))
    .withMessage('Please enter a valid 6-digit Indian PIN code'),
  body('farmAddress.latitude')
    .optional({ nullable: true })
    .custom((val) => val === null || val === undefined || (typeof val === 'number' && val >= -90 && val <= 90))
    .withMessage('Latitude must be between -90 and 90'),
  body('farmAddress.longitude')
    .optional({ nullable: true })
    .custom((val) => val === null || val === undefined || (typeof val === 'number' && val >= -180 && val <= 180))
    .withMessage('Longitude must be between -180 and 180'),
  body('phone')
    .optional()
    .custom(isValidIndianMobile)
    .withMessage('Please enter a valid mobile number'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please enter a valid email address'),
  validateRequest,
];

/**
 * Worker Profile Express Validator Chain
 */
export const validateWorkerProfileInput = [
  body('expectedDailyWage')
    .notEmpty()
    .withMessage('Expected daily wage is required')
    .isNumeric()
    .withMessage('Expected daily wage must be a number')
    .custom((val) => Number(val) >= 50)
    .withMessage('Expected daily wage must be at least ₹50/day'),
  body('skills')
    .isArray({ min: 1 })
    .withMessage('Skills must be an array with at least 1 primary skill'),
  body('experience')
    .optional()
    .isNumeric()
    .withMessage('Experience years must be a number')
    .custom((val) => Number(val) >= 0)
    .withMessage('Experience cannot be negative'),
  body('education')
    .optional()
    .isIn(EDUCATION_LEVELS)
    .withMessage(`Education must be one of: ${EDUCATION_LEVELS.join(', ')}`),
  body('availability')
    .optional()
    .isIn(AVAILABILITY_STATUS)
    .withMessage(`Availability must be one of: ${AVAILABILITY_STATUS.join(', ')}`),
  body('preferredWorkType')
    .optional()
    .isIn(PREFERRED_WORK_TYPES)
    .withMessage(`Preferred work type must be one of: ${PREFERRED_WORK_TYPES.join(', ')}`),
  body('preferredDistrict')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Preferred district cannot be empty'),
  body('preferredState')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Preferred state cannot be empty'),
  body('aadhaarNumber')
    .optional()
    .custom(isValidAadhaarNumber)
    .withMessage('Aadhaar number must be exactly 12 digits'),
  validateRequest,
];

/**
 * Pagination & Search Query Express Validator
 */
export const validateProfileQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  validateRequest,
];

/**
 * Farm Location Express Validator Chain
 */
export const validateFarmLocationInput = [
  body('latitude')
    .notEmpty()
    .withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('longitude')
    .notEmpty()
    .withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  body('district')
    .trim()
    .notEmpty()
    .withMessage('District is required'),
  body('state')
    .trim()
    .notEmpty()
    .withMessage('State is required'),
  validateRequest,
];

