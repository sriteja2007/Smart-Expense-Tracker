import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { apiRouter } from './routes/index.js';
import rateLimit from 'express-rate-limit';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';
import { env } from './config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(): Express {
  const app = express();

  // Security Middleware
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows cross-origin client in development
      crossOriginEmbedderPolicy: false
    })
  );

  // CORS Configuration
  const configuredOrigins = env.CLIENT_URL
    ? env.CLIENT_URL.split(',').map((u) => u.trim().replace(/\/$/, ''))
    : [];
  const allowedOrigins = Array.from(
    new Set([
      ...configuredOrigins,
      'http://localhost:5173',
      'http://127.0.0.1:5173'
    ])
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow mobile apps, curl, or same-origin requests with no origin header
        if (!origin || allowedOrigins.includes(origin) || env.NODE_ENV !== 'production') {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not permitted by CORS policy`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    })
  );

  // Body & Cookie Parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Root welcome ping
  app.get('/', (_req, res) => {
    res.json({
      name: 'LumaSpend API',
      status: 'active',
      docs: '/api/docs',
      health: '/api/health'
    });
  });

  // OpenAPI Documentation endpoint
  app.get('/api/docs', (_req, res) => {
    try {
      const openApiSpec = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, 'docs', 'openapi.json'), 'utf-8')
      );
      res.json(openApiSpec);
    } catch {
      res.status(500).json({ error: 'OpenAPI documentation unavailable' });
    }
  });

  // General API Rate Limiter (Protects against DoS / resource exhaustion; bypassed in test suite)
  const apiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test' || env.NODE_ENV === 'test',
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please slow down and try again later.'
      },
      timestamp: new Date().toISOString()
    }
  });

  // Mount API endpoints
  app.use('/api', apiRateLimiter, apiRouter);

  // Fallback 404 & Centralized Error Handler
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
