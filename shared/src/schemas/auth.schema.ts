import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password is too long')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  displayName: z
    .string()
    .trim()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name cannot exceed 50 characters'),
  defaultCurrency: z
    .enum(['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AED', 'CAD', 'AUD', 'SGD'])
    .default('INR')
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
});

export type LoginInput = z.infer<typeof loginSchema>;

export const googleAuthSchema = z.object({
  idToken: z
    .string()
    .min(1, 'Google ID token is required')
});

export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name cannot exceed 50 characters')
    .optional(),
  defaultCurrency: z
    .enum(['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AED', 'CAD', 'AUD', 'SGD'])
    .optional(),
  theme: z.enum(['dark', 'light', 'system']).optional(),
  reducedMotion: z.boolean().optional(),
  timezone: z.string().trim().max(60).optional(),
  inAppNotifications: z.boolean().optional(),
  budgetAlertsEnabled: z.boolean().optional(),
  recurringRemindersEnabled: z.boolean().optional(),
  goalMilestonesEnabled: z.boolean().optional(),
  weeklySummaryEmail: z.boolean().optional(),
  browserPushEnabled: z.boolean().optional()
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const deleteAccountSchema = z.object({
  confirmPhrase: z
    .string()
    .trim()
    .refine((val) => val === 'DELETE MY ACCOUNT', {
      message: 'Please type "DELETE MY ACCOUNT" exactly to confirm account deletion.'
    }),
  password: z.string().optional()
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
