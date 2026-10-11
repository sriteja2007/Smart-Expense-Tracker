import { z } from 'zod';

// Client environment schema only - server environment schema is maintained strictly inside the server directory

export const clientEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().default('http://localhost:5000/api'),
  VITE_GOOGLE_CLIENT_ID: z.string().optional().default(''),
  VITE_DEFAULT_CURRENCY: z.enum(['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AED', 'CAD', 'AUD', 'SGD']).default('INR')
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;
