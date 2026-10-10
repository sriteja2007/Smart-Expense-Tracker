import { z } from 'zod';

export const serverEnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required').default('mongodb://localhost:27017/lumaspend_dev'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters').default('dev_secret_jwt_key_lumaspend_32_chars_minimum!'),
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GEMINI_API_KEY: z.string().optional().default(''),
  EMAIL_PROVIDER_API_KEY: z.string().optional().default(''),
  EMAIL_FROM: z.string().optional().default('noreply@lumaspend.local'),
  VAPID_PUBLIC_KEY: z.string().optional().default(''),
  VAPID_PRIVATE_KEY: z.string().optional().default(''),
  VAPID_SUBJECT: z.string().optional().default('mailto:admin@lumaspend.local')
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export const clientEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().default('http://localhost:5000/api'),
  VITE_GOOGLE_CLIENT_ID: z.string().optional().default(''),
  VITE_DEFAULT_CURRENCY: z.enum(['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AED', 'CAD', 'AUD', 'SGD']).default('INR')
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;
