import { z } from 'zod';

// Indian Mobile Number Regex (8-15 digits, supports +91 prefix)
const indianMobileRegex = /^[0-9+\-\s]{8,15}$/;

// Indian Postal Pincode Regex (6 digits starting with 1-9)
const indianPincodeRegex = /^[1-9][0-9]{5}$/;

// Aadhaar 12-Digit Numeric Regex
const aadhaarRegex = /^\d{12}$/;

/**
 * Zod Schema for Farmer Profile Validation
 */
export const farmerProfileZodSchema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
  farmName: z.string().min(2, 'Farm name must be at least 2 characters').max(150, 'Farm name cannot exceed 150 characters'),
  farmDescription: z.string().max(2000, 'Farm description cannot exceed 2000 characters').optional(),
  farmSize: z.number().min(0.1, 'Farm size must be at least 0.1'),
  farmSizeUnit: z.enum(['Acres', 'Hectares', 'Bigha', 'Gunta', 'Sq Ft']),
  cropTypes: z.array(z.string()).min(1, 'Please select at least 1 primary crop type'),
  livestock: z.array(z.string()).optional(),
  equipment: z.array(z.string()).optional(),
  irrigationType: z.string().min(1, 'Please select an irrigation system type'),
  workingDays: z.array(z.string()).optional(),
  farmAddress: z.object({
    addressLine: z.string().max(250, 'Address line cannot exceed 250 characters').optional(),
    village: z.string().optional(),
    district: z.string().min(1, 'District is required'),
    state: z.string().min(1, 'State is required'),
    pincode: z
      .string()
      .regex(indianPincodeRegex, 'Please enter a valid 6-digit Indian PIN code')
      .optional()
      .or(z.literal('')),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  }),
  phone: z
    .string()
    .regex(indianMobileRegex, 'Please enter a valid mobile number')
    .optional()
    .or(z.literal('')),
  email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
});

/**
 * Zod Schema for Worker Profile Validation
 */
export const workerProfileZodSchema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
  title: z.string().min(2, 'Work specialty title must be at least 2 characters').max(150),
  bio: z.string().max(2000, 'Bio cannot exceed 2000 characters').optional(),
  skills: z.array(z.string()).min(1, 'Please select at least 1 primary agricultural skill'),
  experience: z.number().min(0, 'Experience cannot be negative'),
  languages: z.array(z.string()).optional(),
  education: z.enum(['Below 10th', '10th Pass', '12th Pass', 'Diploma in Agriculture', 'Graduate', 'Other']),
  expectedDailyWage: z.number().min(50, 'Daily wage must be at least ₹50/day'),
  expectedMonthlySalary: z.number().min(0).optional(),
  availability: z.enum(['Immediate', 'Within 3 Days', 'Seasonal', 'Unavailable']),
  preferredWorkType: z.enum(['Full-Time', 'Part-Time', 'Contractual / Seasonal', 'Daily Basis']),
  preferredDistrict: z.string().min(1, 'Preferred district is required'),
  preferredState: z.string().min(1, 'Preferred state is required'),
  preferredVillage: z.string().optional(),
  aadhaarNumber: z
    .string()
    .regex(aadhaarRegex, 'Aadhaar number must be exactly 12 digits')
    .optional()
    .or(z.literal('')),
});

/**
 * Client-Side File Upload Validator
 */
export const validateImageFile = (file: File, maxSizeMB = 5): string | null => {
  const allowedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (!allowedFormats.includes(file.type)) {
    return `Invalid format for '${file.name}'. Only JPEG, PNG, and WEBP images are supported.`;
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    return `File '${file.name}' exceeds maximum allowed size of ${maxSizeMB}MB.`;
  }
  return null;
};

export type FarmerProfileFormValues = z.infer<typeof farmerProfileZodSchema>;
export type WorkerProfileFormValues = z.infer<typeof workerProfileZodSchema>;
