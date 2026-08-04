import { body, query } from 'express-validator';
import { validateRequest } from '../middleware/validationMiddleware.js';
import {
  JOB_CATEGORIES,
  WAGE_TYPES,
  GENDER_PREFERENCE,
  PREFERRED_WORK_TYPES,
} from '../constants/index.js';
import { isValidIndianMobile, isValidIndianPincode } from './profileValidator.js';

/**
 * Express Validator Chain for Creating a Job Posting
 */
export const validateCreateJobInput = [
  // 1. Title Validation
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Job title is required')
    .isLength({ min: 5, max: 120 })
    .withMessage('Job title must be between 5 and 120 characters'),

  // 2. Description Validation
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Job description is required')
    .isLength({ min: 20, max: 2000 })
    .withMessage('Job description must be between 20 and 2000 characters'),

  // 3. Category & Crop Type Validation
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Job category is required')
    .isIn(JOB_CATEGORIES)
    .withMessage(`Category must be one of: ${JOB_CATEGORIES.join(', ')}`),

  body('cropType')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Crop type name cannot exceed 100 characters'),

  // 4. Work Type Validation
  body('workType')
    .trim()
    .notEmpty()
    .withMessage('Work type is required')
    .isIn(PREFERRED_WORK_TYPES)
    .withMessage(`Work type must be one of: ${PREFERRED_WORK_TYPES.join(', ')}`),

  // 5. Number of Workers Validation
  body('numberOfWorkers')
    .notEmpty()
    .withMessage('Number of workers is required')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Number of workers must be between 1 and 1000'),

  // 6. Gender & Age Range Validation
  body('genderPreference')
    .optional()
    .isIn(GENDER_PREFERENCE)
    .withMessage(`Gender preference must be one of: ${GENDER_PREFERENCE.join(', ')}`),

  body('minimumAge')
    .optional()
    .isInt({ min: 18, max: 70 })
    .withMessage('Minimum age must be between 18 and 70'),

  body('maximumAge')
    .optional()
    .isInt({ min: 18, max: 70 })
    .withMessage('Maximum age must be between 18 and 70')
    .custom((maxAge, { req }) => {
      if (req.body.minimumAge && Number(maxAge) < Number(req.body.minimumAge)) {
        throw new Error('Maximum age must be greater than or equal to minimum age');
      }
      return true;
    }),

  // 7. Required Skills Validation
  body('requiredSkills')
    .custom((val) => {
      let skills = val;
      if (typeof val === 'string') {
        try {
          skills = JSON.parse(val);
        } catch {
          skills = val.split(',').map((s) => s.trim()).filter(Boolean);
        }
      }
      if (!Array.isArray(skills) || skills.length === 0) {
        throw new Error('At least one required skill must be specified');
      }
      return true;
    }),

  // 8. Wage Type & Salary Range Custom Validation
  body('wageType')
    .trim()
    .notEmpty()
    .withMessage('Wage type is required')
    .isIn(WAGE_TYPES)
    .withMessage(`Wage type must be one of: ${WAGE_TYPES.join(', ')}`),

  body('dailyWage')
    .optional()
    .isNumeric()
    .withMessage('Daily wage must be a valid number')
    .custom((val) => {
      const num = Number(val);
      if (num < 50 || num > 50000) {
        throw new Error('Daily wage must be between ₹50 and ₹50,000');
      }
      return true;
    }),

  body('monthlySalary')
    .optional()
    .isNumeric()
    .withMessage('Monthly salary must be a valid number')
    .custom((val) => {
      const num = Number(val);
      if (num < 1000 || num > 500000) {
        throw new Error('Monthly salary must be between ₹1,000 and ₹500,000');
      }
      return true;
    }),

  body('wageType').custom((wageType, { req }) => {
    if (wageType === 'Daily' && (req.body.dailyWage === undefined || req.body.dailyWage === '')) {
      throw new Error('Daily wage amount is required when Daily wage type is selected');
    }
    if (wageType === 'Monthly' && (req.body.monthlySalary === undefined || req.body.monthlySalary === '')) {
      throw new Error('Monthly salary amount is required when Monthly salary type is selected');
    }
    return true;
  }),

  // 9. Dates Validation
  body('startDate')
    .notEmpty()
    .withMessage('Job start date is required')
    .isISO8601()
    .withMessage('Start date must be a valid date'),

  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((endDate, { req }) => {
      if (req.body.startDate && new Date(endDate) < new Date(req.body.startDate)) {
        throw new Error('End date must be on or after the start date');
      }
      return true;
    }),

  body('workingHours')
    .optional()
    .isInt({ min: 1, max: 24 })
    .withMessage('Working hours must be between 1 and 24 hours per day'),

  // 10. Location & Address Validation
  body('jobAddress.district')
    .trim()
    .notEmpty()
    .withMessage('District is required'),

  body('jobAddress.state')
    .trim()
    .notEmpty()
    .withMessage('State is required'),

  body('jobAddress.pincode')
    .optional()
    .custom(isValidIndianPincode)
    .withMessage('Please enter a valid 6-digit Indian PIN code'),

  // 11. Geolocation Coordinates Validation
  body('jobAddress.latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude coordinate must be between -90 and 90'),

  body('jobAddress.longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude coordinate must be between -180 and 180'),

  // 12. Contact Mobile Validation
  body('contactMobile')
    .optional()
    .custom(isValidIndianMobile)
    .withMessage('Please enter a valid contact mobile number'),

  validateRequest,
];

/**
 * Express Validator Chain for Editing an Existing Job Posting
 */
export const validateUpdateJobInput = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 120 })
    .withMessage('Job title must be between 5 and 120 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Job description must be between 20 and 2000 characters'),

  body('category')
    .optional()
    .trim()
    .isIn(JOB_CATEGORIES)
    .withMessage(`Category must be one of: ${JOB_CATEGORIES.join(', ')}`),

  body('workType')
    .optional()
    .trim()
    .isIn(PREFERRED_WORK_TYPES)
    .withMessage(`Work type must be one of: ${PREFERRED_WORK_TYPES.join(', ')}`),

  body('numberOfWorkers')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Number of workers must be between 1 and 1000'),

  body('dailyWage')
    .optional()
    .isNumeric()
    .custom((val) => Number(val) >= 50 && Number(val) <= 50000)
    .withMessage('Daily wage must be between ₹50 and ₹50,000'),

  body('monthlySalary')
    .optional()
    .isNumeric()
    .custom((val) => Number(val) >= 1000 && Number(val) <= 500000)
    .withMessage('Monthly salary must be between ₹1,000 and ₹500,000'),

  body('jobAddress.pincode')
    .optional()
    .custom(isValidIndianPincode)
    .withMessage('Please enter a valid 6-digit Indian PIN code'),

  body('jobAddress.latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude coordinate must be between -90 and 90'),

  body('jobAddress.longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude coordinate must be between -180 and 180'),

  body('contactMobile')
    .optional()
    .custom(isValidIndianMobile)
    .withMessage('Please enter a valid contact mobile number'),

  validateRequest,
];

/**
 * Express Validator Chain for Querying / Searching Jobs
 */
export const validateJobQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  validateRequest,
];
