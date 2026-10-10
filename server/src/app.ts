import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { apiRouter } from './routes/index.js';
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
  app.use(
    cors({
      origin: [env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
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

  // Mount API endpoints
  app.use('/api', apiRouter);

  // Fallback 404 & Centralized Error Handler
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
