import { HTTP_STATUS, ERROR_CODES, type HttpStatusCode, type ErrorCode } from '../constants/status-codes.js';
import type { ApiErrorDetail } from '../types/api.js';

export class AppError extends Error {
  public readonly statusCode: HttpStatusCode;
  public readonly code: ErrorCode;
  public readonly isOperational: boolean;
  public readonly details?: ApiErrorDetail[];

  constructor(
    message: string,
    statusCode: HttpStatusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    code: ErrorCode = ERROR_CODES.INTERNAL_ERROR,
    isOperational: boolean = true,
    details?: ApiErrorDetail[]
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: ApiErrorDetail[]): AppError {
    return new AppError(message, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST, true, details);
  }

  static validation(message: string, details?: ApiErrorDetail[]): AppError {
    return new AppError(message, HTTP_STATUS.UNPROCESSABLE_ENTITY, ERROR_CODES.VALIDATION_ERROR, true, details);
  }

  static unauthorized(message: string = 'Authentication required'): AppError {
    return new AppError(message, HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED, true);
  }

  static forbidden(message: string = 'Access denied'): AppError {
    return new AppError(message, HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN, true);
  }

  static notFound(message: string = 'Resource not found'): AppError {
    return new AppError(message, HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND, true);
  }

  static conflict(message: string): AppError {
    return new AppError(message, HTTP_STATUS.CONFLICT, ERROR_CODES.CONFLICT, true);
  }

  static internal(message: string = 'Internal server error'): AppError {
    return new AppError(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, ERROR_CODES.INTERNAL_ERROR, false);
  }
}
