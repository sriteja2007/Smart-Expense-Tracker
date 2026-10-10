import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { apiRouter } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';
import { env } from './config/env.js';

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

  // Body Parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Root welcome ping
  app.get('/', (_req, res) => {
    res.json({
      name: 'LumaSpend API',
      status: 'active',
      docs: '/api/docs',
      health: '/api/health'
    });
  });

  // Mount API endpoints
  app.use('/api', apiRouter);

  // Fallback 404 & Centralized Error Handler
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
