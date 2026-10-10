import { Router, type Request, type Response, type CookieOptions } from 'express';
import bcrypt from 'bcryptjs';
import {
  registerSchema,
  loginSchema,
  googleAuthSchema,
  updateProfileSchema,
  AppError,
  HTTP_STATUS,
  type ApiSuccessResponse,
  type UserProfile
} from '@lumaspend/shared';
import { UserRepository } from '../repositories/user.repository.js';
import { JwtService } from '../services/jwt.service.js';
import { GoogleAuthService } from '../services/google-auth.service.js';
import { requireAuth, authRateLimiter } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../middlewares/async.middleware.js';
import { env } from '../config/env.js';

export const authRouter = Router();

// Cookie security options
const COOKIE_NAME = 'token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: COOKIE_MAX_AGE,
  path: '/'
};

/**
 * POST /api/auth/register
 * Creates a new user with bcrypt password hashing and issues a secure session
 */
authRouter.post(
  '/register',
  authRateLimiter,
  validateRequest({ body: registerSchema }),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password, displayName, defaultCurrency } = req.body;

    // Check if account already exists
    const existing = await UserRepository.findByEmail(email);
    if (existing) {
      throw AppError.conflict('An account with this email address is already registered. Please sign in.');
    }

    // Hash password with bcrypt (salt rounds = 10)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Persist new user
    const newUser = await UserRepository.create({
      email,
      passwordHash,
      displayName,
      defaultCurrency,
      authProvider: 'local'
    });

    const profile: UserProfile = newUser.toProfile();
    const token = JwtService.signToken({
      userId: profile.id,
      email: profile.email,
      role: profile.role
    });

    // Set secure HTTP-only cookie
    res.cookie(COOKIE_NAME, token, cookieOptions);

    const response: ApiSuccessResponse<{ user: UserProfile; token: string }> = {
      success: true,
      data: { user: profile, token },
      message: 'Account registered successfully',
      timestamp: new Date().toISOString()
    };

    res.status(HTTP_STATUS.CREATED).json(response);
  })
);

/**
 * POST /api/auth/login
 * Validates credentials and returns an authenticated session
 */
authRouter.post(
  '/login',
  authRateLimiter,
  validateRequest({ body: loginSchema }),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;

    // Find user with passwordHash
    const userDoc = await UserRepository.findByEmail(email, true);

    // Generic error message to prevent user enumeration
    if (!userDoc || !userDoc.passwordHash) {
      throw AppError.unauthorized('Invalid email or password.');
    }

    const isMatch = await userDoc.comparePassword(password);
    if (!isMatch) {
      throw AppError.unauthorized('Invalid email or password.');
    }

    const profile: UserProfile = userDoc.toProfile();
    const token = JwtService.signToken({
      userId: profile.id,
      email: profile.email,
      role: profile.role
    });

    res.cookie(COOKIE_NAME, token, cookieOptions);

    const response: ApiSuccessResponse<{ user: UserProfile; token: string }> = {
      success: true,
      data: { user: profile, token },
      message: 'Logged in successfully',
      timestamp: new Date().toISOString()
    };

    res.status(HTTP_STATUS.OK).json(response);
  })
);

/**
 * POST /api/auth/google
 * Verifies Google ID token server-side and logs in or creates user
 */
authRouter.post(
  '/google',
  authRateLimiter,
  validateRequest({ body: googleAuthSchema }),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { idToken } = req.body;

    // Server-side verification with Google
    const googleUser = await GoogleAuthService.verifyIdToken(idToken);

    // Check if user exists by googleId or verified email
    let userDoc = await UserRepository.findByGoogleId(googleUser.googleId);

    if (!userDoc) {
      userDoc = await UserRepository.findByEmail(googleUser.email);

      if (userDoc) {
        // Safe account linking: Email was verified by Google
        userDoc = await UserRepository.updateProfile(userDoc.id || userDoc._id, {
          googleId: googleUser.googleId,
          authProvider: userDoc.passwordHash ? 'both' : 'google'
        });
      } else {
        // Create new Google-authenticated user
        userDoc = await UserRepository.create({
          email: googleUser.email,
          displayName: googleUser.displayName,
          avatarUrl: googleUser.avatarUrl,
          googleId: googleUser.googleId,
          authProvider: 'google',
          defaultCurrency: 'INR'
        });
      }
    }

    const profile: UserProfile = userDoc.toProfile();
    const token = JwtService.signToken({
      userId: profile.id,
      email: profile.email,
      role: profile.role
    });

    res.cookie(COOKIE_NAME, token, cookieOptions);

    const response: ApiSuccessResponse<{ user: UserProfile; token: string }> = {
      success: true,
      data: { user: profile, token },
      message: 'Google authentication successful',
      timestamp: new Date().toISOString()
    };

    res.status(HTTP_STATUS.OK).json(response);
  })
);

/**
 * POST /api/auth/logout
 * Invalidates session by clearing the authentication cookie
 */
authRouter.post('/logout', (_req: Request, res: Response): void => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });

  const response: ApiSuccessResponse<{ message: string }> = {
    success: true,
    data: { message: 'Logged out successfully' },
    message: 'Session terminated',
    timestamp: new Date().toISOString()
  };

  res.status(HTTP_STATUS.OK).json(response);
});

/**
 * GET /api/auth/me
 * Restores session profile for authenticated user
 */
authRouter.get('/me', requireAuth, (req: Request, res: Response): void => {
  const response: ApiSuccessResponse<UserProfile> = {
    success: true,
    data: req.user!,
    message: 'Authenticated user profile restored',
    timestamp: new Date().toISOString()
  };

  res.status(HTTP_STATUS.OK).json(response);
});

/**
 * PATCH /api/auth/profile
 * Updates display name, currency, or UI preferences
 */
authRouter.patch(
  '/profile',
  requireAuth,
  validateRequest({ body: updateProfileSchema }),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const updated = await UserRepository.updateProfile(req.user!.id, req.body);

    if (!updated) {
      throw AppError.notFound('User not found');
    }

    const response: ApiSuccessResponse<UserProfile> = {
      success: true,
      data: updated.toProfile(),
      message: 'Profile updated successfully',
      timestamp: new Date().toISOString()
    };

    res.status(HTTP_STATUS.OK).json(response);
  })
);
