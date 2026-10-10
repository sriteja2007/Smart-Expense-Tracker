import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import {
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
  type ApiErrorResponse,
  type ApiErrorDetail
} from '@lumaspend/shared';
import { env } from '../config/env.js';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const timestamp = new Date().toISOString();

  // 1. Handled Domain & App Errors
  if (err instanceof AppError) {
    const responsePayload: ApiErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        ...(env.NODE_ENV === 'development' && { stack: err.stack })
      },
      timestamp
    };

    res.status(err.statusCode).json(responsePayload);
    return;
  }

  // 2. Zod Schema Validation Errors
  if (err instanceof ZodError) {
    const details: ApiErrorDetail[] = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code
    }));

    const responsePayload: ApiErrorResponse = {
      success: false,
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Request payload validation failed',
        details,
        ...(env.NODE_ENV === 'development' && { stack: err.stack })
      },
      timestamp
    };

    res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json(responsePayload);
    return;
  }

  // 3. Malformed JSON Body Parsing Error
  if (err instanceof SyntaxError && 'status' in err && (err as { status: number }).status === 400) {
    const responsePayload: ApiErrorResponse = {
      success: false,
      error: {
        code: ERROR_CODES.BAD_REQUEST,
        message: 'Invalid JSON payload received',
        ...(env.NODE_ENV === 'development' && { stack: (err as Error).stack })
      },
      timestamp
    };

    res.status(HTTP_STATUS.BAD_REQUEST).json(responsePayload);
    return;
  }

  // 4. Uncaught / Generic Internal Server Errors
  const genericError = err instanceof Error ? err : new Error(String(err));
  console.error('[Unhandled Exception]:', genericError);

  const responsePayload: ApiErrorResponse = {
    success: false,
    error: {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: env.NODE_ENV === 'production' ? 'An unexpected server error occurred' : genericError.message,
      ...(env.NODE_ENV === 'development' && { stack: genericError.stack })
    },
    timestamp
  };

  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(responsePayload);
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound(`Endpoint not found: ${req.method} ${req.originalUrl}`));
}
