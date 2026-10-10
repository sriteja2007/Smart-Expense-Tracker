import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../middlewares/async.middleware.js';
import { UserRepository } from '../repositories/user.repository.js';
import { updateProfileSchema, HttpStatus } from '@lumaspend/shared';

export const profileRouter = Router();

profileRouter.use(requireAuth);

// GET /api/profile - Get current user profile
profileRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.status(HttpStatus.OK).json({ success: true, data: req.user });
  })
);

// PATCH /api/profile - Update user preferences
profileRouter.patch(
  '/',
  validateRequest(updateProfileSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const updated = await UserRepository.updateProfile(userId, req.body);
    const profile = typeof updated?.toProfile === 'function' ? updated.toProfile() : updated;
    res.status(HttpStatus.OK).json({ success: true, data: profile });
  })
);
