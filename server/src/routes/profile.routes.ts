import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../middlewares/async.middleware.js';
import { UserRepository } from '../repositories/user.repository.js';
import { FinancialRepository } from '../repositories/financial.repository.js';
import { updateProfileSchema, deleteAccountSchema, HttpStatus } from '@lumaspend/shared';
import { env } from '../config/env.js';

export const profileRouter = Router();

profileRouter.use(requireAuth);

// GET /api/profile - Get current user profile
profileRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.status(HttpStatus.OK).json({ success: true, data: req.user });
  })
);

// GET /api/profile/export - Full GDPR data export archive
profileRouter.get(
  '/export',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const exportData = await FinancialRepository.exportUserData(userId);
    res.status(HttpStatus.OK).json({
      success: true,
      data: exportData,
      message: 'User data archive generated successfully.'
    });
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

// DELETE /api/profile - Cascading account and personal data deletion
profileRouter.delete(
  '/',
  validateRequest(deleteAccountSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    await FinancialRepository.deleteUserDataCascade(userId);
    await UserRepository.deleteUser(userId);

    res.clearCookie('token', {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Your account and all associated personal data have been permanently deleted.'
    });
  })
);

