import { Router, type Request, type Response } from 'express';
import mongoose from 'mongoose';
import {
  type ApiSuccessResponse,
  type HealthCheckData,
  HTTP_STATUS
} from '@lumaspend/shared';
import { env } from '../config/env.js';

export const healthRouter = Router();

const startTime = Date.now();

healthRouter.get('/', (_req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  let dbStatus: 'connected' | 'disconnected' | 'connecting' | 'unconfigured' = 'disconnected';

  if (dbState === 1) {
    dbStatus = 'connected';
  } else if (dbState === 2) {
    dbStatus = 'connecting';
  } else if (!env.MONGODB_URI || env.MONGODB_URI.includes('localhost')) {
    dbStatus = 'unconfigured';
  }

  const aiStatus = env.GEMINI_API_KEY && env.GEMINI_API_KEY.length > 5 ? 'configured' : 'unconfigured';

  const healthData: HealthCheckData = {
    status: 'healthy',
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: env.NODE_ENV,
    services: {
      database: {
        status: dbStatus
      },
      aiEngine: {
        status: aiStatus
      }
    }
  };

  const response: ApiSuccessResponse<HealthCheckData> = {
    success: true,
    data: healthData,
    message: 'LumaSpend Core API is operational',
    timestamp: new Date().toISOString()
  };

  res.status(HTTP_STATUS.OK).json(response);
});
