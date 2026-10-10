import type { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { AppError } from '@lumaspend/shared';
import { JwtService } from '../services/jwt.service.js';
import { UserRepository } from '../repositories/user.repository.js';
import type { UserProfile } from '@lumaspend/shared';

// Extend Express Request interface to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: UserProfile;
    }
  }
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 1. Check HTTP-only cookie first, then Authorization header
    let token = req.cookies?.token;

    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      throw AppError.unauthorized('Authentication required. No session token provided.');
    }

    // 2. Verify JWT signature & expiration
    const payload = JwtService.verifyToken(token);

    // 3. Find user record
    const userDoc = await UserRepository.findById(payload.userId);
    if (!userDoc) {
      throw AppError.unauthorized('User associated with this session no longer exists.');
    }

    // 4. Attach safe user profile
    req.user = typeof userDoc.toProfile === 'function' ? userDoc.toProfile() : userDoc;
    next();
  } catch (error) {
    next(error);
  }
}

// Rate Limiter for Authentication Endpoints (Brute Force Protection)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 authentication attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please try again after 15 minutes.'
    },
    timestamp: new Date().toISOString()
  }
});
