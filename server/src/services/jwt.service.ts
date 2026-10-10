import jwt from 'jsonwebtoken';
import { type AuthTokenPayload, AppError } from '@lumaspend/shared';
import { env } from '../config/env.js';

const JWT_EXPIRES_IN = '7d';

export class JwtService {
  static signToken(payload: { userId: string; email: string; role: string }): string {
    return jwt.sign(
      {
        userId: payload.userId,
        email: payload.email,
        role: payload.role
      },
      env.JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  static verifyToken(token: string): AuthTokenPayload {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw AppError.unauthorized('Authentication token has expired. Please log in again.');
      }
      throw AppError.unauthorized('Invalid authentication token.');
    }
  }
}
