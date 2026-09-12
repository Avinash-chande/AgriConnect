import { z } from 'zod';

/**
 * Zod Validation Schemas for Application Operations
 */

/**
 * 1. Apply for Job Payload Validation Schema
 */
export const applyJobSchema = z.object({
  coverLetter: z
    .string()
    .min(15, { message: 'Cover letter must be at least 15 characters long' })
    .max(2000, { message: 'Cover letter cannot exceed 2000 characters' }),
  expectedJoiningDate: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const date = new Date(val);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return !isNaN(date.getTime()) && date >= today;
      },
      { message: 'Expected joining date must be today or a future date' }
    ),
  expectedDailyWage: z
    .number({ message: 'Expected daily wage must be a valid number' })
    .positive({ message: 'Expected daily wage must be greater than 0' })
    .max(100000, { message: 'Expected daily wage cannot exceed ₹1,00,000/day' })
    .optional()
    .nullable(),
  notes: z
    .string()
    .max(1000, { message: 'Notes cannot exceed 1000 characters' })
    .optional(),
});

export type ApplyJobFormValues = z.infer<typeof applyJobSchema>;

/**
 * 2. Accept Application Payload Validation Schema
 */
export const acceptApplicationSchema = z.object({
  farmerFeedback: z
    .string()
    .max(1000, { message: 'Farmer feedback cannot exceed 1000 characters' })
    .optional(),
  rejectOthers: z.boolean().optional(),
  rejectionFeedback: z
    .string()
    .max(1000, { message: 'Rejection feedback cannot exceed 1000 characters' })
    .optional(),
});

export type AcceptApplicationFormValues = z.infer<typeof acceptApplicationSchema>;

/**
 * 3. Reject Application Payload Validation Schema
 */
export const rejectApplicationSchema = z.object({
  reason: z
    .string()
    .min(5, { message: 'Rejection reason must be at least 5 characters long' })
    .max(1000, { message: 'Rejection reason cannot exceed 1000 characters' })
    .optional()
    .or(z.literal('')),
});

export type RejectApplicationFormValues = z.infer<typeof rejectApplicationSchema>;

/**
 * 4. Cancel Hiring Payload Validation Schema
 */
export const cancelHiringSchema = z.object({
  reason: z
    .string()
    .min(10, { message: 'Cancellation reason must be at least 10 characters long' })
    .max(1000, { message: 'Cancellation reason cannot exceed 1000 characters' }),
});

export type CancelHiringFormValues = z.infer<typeof cancelHiringSchema>;

/**
 * 5. Application Status State Machine Transitions
 */
export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  Pending: ['Shortlisted', 'Accepted', 'Rejected', 'Withdrawn'],
  Shortlisted: ['Accepted', 'Rejected', 'Withdrawn', 'Pending'],
  Accepted: ['Hired', 'Cancelled', 'Withdrawn'],
  Hired: ['Cancelled'],
  Rejected: [],
  Withdrawn: [],
  Cancelled: [],
};

export const validateStatusTransition = (
  currentStatus: string,
  targetStatus: string
): { isValid: boolean; message?: string } => {
  const allowed = VALID_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    return {
      isValid: false,
      message: `Invalid status transition from '${currentStatus}' to '${targetStatus}'.`,
    };
  }
  return { isValid: true };
};
