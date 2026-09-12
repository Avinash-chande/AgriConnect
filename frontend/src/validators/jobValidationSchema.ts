import { z } from 'zod';
import { JOB_CATEGORIES, WAGE_TYPES, PREFERRED_WORK_TYPES } from '../constants/jobConstants';

/**
 * Zod Schema for Job Address & Geolocation Validation
 */
export const jobAddressSchema = z.object({
  addressLine: z.string().optional(),
  village: z.string().optional(),
  district: z.string().min(1, 'District is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z
    .string()
    .optional()
    .refine((val) => !val || /^[1-9][0-9]{5}$/.test(val), {
      message: 'PIN code must be a valid 6-digit Indian postal code',
    }),
  latitude: z
    .number()
    .optional()
    .refine((val) => val === undefined || (val >= -90 && val <= 90), {
      message: 'Latitude must be between -90 and 90',
    }),
  longitude: z
    .number()
    .optional()
    .refine((val) => val === undefined || (val >= -180 && val <= 180), {
      message: 'Longitude must be between -180 and 180',
    }),
});

/**
 * Complete Zod Schema for Agricultural Job Posting (Create & Edit)
 */
export const jobValidationSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(5, 'Job title must be at least 5 characters')
      .max(120, 'Job title cannot exceed 120 characters'),

    description: z
      .string()
      .trim()
      .min(20, 'Job description must be at least 20 characters')
      .max(2000, 'Job description cannot exceed 2000 characters'),

    category: z
      .string()
      .min(1, 'Job category is required')
      .refine((val) => (JOB_CATEGORIES as unknown as string[]).includes(val), {
        message: 'Invalid job category selection',
      }),

    cropType: z.string().optional(),

    workType: z
      .string()
      .min(1, 'Work type is required')
      .refine((val) => (PREFERRED_WORK_TYPES as unknown as string[]).includes(val), {
        message: 'Invalid work type selection',
      }),

    numberOfWorkers: z
      .number()
      .int('Number of workers must be a whole integer')
      .min(1, 'Must hire at least 1 worker')
      .max(1000, 'Maximum 1000 workers per posting'),

    genderPreference: z
      .enum(['Male', 'Female', 'Any'] as const)
      .default('Any'),

    minimumAge: z
      .number()
      .int()
      .min(18, 'Minimum age must be at least 18 years')
      .max(70, 'Minimum age cannot exceed 70 years')
      .optional()
      .default(18),

    maximumAge: z
      .number()
      .int()
      .min(18, 'Maximum age must be at least 18 years')
      .max(70, 'Maximum age cannot exceed 70 years')
      .optional()
      .default(60),

    requiredSkills: z
      .array(z.string().min(1, 'Skill cannot be empty'))
      .min(1, 'At least one required skill must be selected'),

    wageType: z
      .enum(['Daily', 'Monthly', 'Per Acre', 'Per Quintal', 'Contract'] as const)
      .refine((val) => (WAGE_TYPES as unknown as string[]).includes(val), {
        message: 'Invalid wage type selection',
      }),

    dailyWage: z
      .number()
      .min(50, 'Minimum daily wage is ₹50')
      .max(50000, 'Maximum daily wage is ₹50,000')
      .optional(),

    monthlySalary: z
      .number()
      .min(1000, 'Minimum monthly salary is ₹1,000')
      .max(500000, 'Maximum monthly salary is ₹500,000')
      .optional(),

    startDate: z
      .string()
      .min(1, 'Start date is required')
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Start date must be a valid date format',
      }),

    endDate: z
      .string()
      .optional()
      .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: 'End date must be a valid date format',
      }),

    workingHours: z
      .number()
      .int()
      .min(1, 'Working hours must be at least 1 hour')
      .max(24, 'Working hours cannot exceed 24 hours per day')
      .optional()
      .default(8),

    accommodationProvided: z.boolean().default(false),
    foodProvided: z.boolean().default(false),
    transportProvided: z.boolean().default(false),

    jobAddress: jobAddressSchema,

    contactPerson: z.string().optional(),
    contactMobile: z
      .string()
      .optional()
      .refine((val) => !val || /^[6-9]\d{9}$/.test(val.replace(/\s+/g, '')), {
        message: 'Please enter a valid 10-digit Indian mobile number',
      }),

    isFeatured: z.boolean().default(false),
    isUrgent: z.boolean().default(false),
  })
  // 1. Custom Refine: Age Range check
  .refine(
    (data) => {
      if (data.minimumAge && data.maximumAge) {
        return data.maximumAge >= data.minimumAge;
      }
      return true;
    },
    {
      message: 'Maximum age must be greater than or equal to minimum age',
      path: ['maximumAge'],
    }
  )
  // 2. Custom Refine: Date Sequence check
  .refine(
    (data) => {
      if (data.startDate && data.endDate && data.endDate.trim() !== '') {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: 'End date must be on or after the start date',
      path: ['endDate'],
    }
  )
  // 3. Custom Refine: Daily Wage Matching check
  .refine(
    (data) => {
      if (data.wageType === 'Daily') {
        return data.dailyWage !== undefined && data.dailyWage >= 50;
      }
      return true;
    },
    {
      message: 'Daily wage amount (₹50 - ₹50,000) is required for Daily wage type',
      path: ['dailyWage'],
    }
  )
  // 4. Custom Refine: Monthly Salary Matching check
  .refine(
    (data) => {
      if (data.wageType === 'Monthly') {
        return data.monthlySalary !== undefined && data.monthlySalary >= 1000;
      }
      return true;
    },
    {
      message: 'Monthly salary amount (₹1,000 - ₹500,000) is required for Monthly salary type',
      path: ['monthlySalary'],
    }
  );

export type JobFormValues = z.infer<typeof jobValidationSchema>;
