import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { asyncHandler } from '../middlewares/async.middleware.js';
import { FinancialRepository } from '../repositories/financial.repository.js';
import { AppError, HttpStatus } from '@lumaspend/shared';

export const notificationRouter = Router();

notificationRouter.use(requireAuth);

// GET /api/notifications - List notifications
notificationRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const notifications = await FinancialRepository.listNotifications(userId);
    res.status(HttpStatus.OK).json({ success: true, data: notifications });
  })
);

// PATCH /api/notifications/read-all - Mark all notifications as read
notificationRouter.patch(
  '/read-all',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const count = await FinancialRepository.markAllNotificationsRead(userId);
    res.status(HttpStatus.OK).json({ success: true, updatedCount: count });
  })
);

// PATCH /api/notifications/:id/read - Mark single notification as read
notificationRouter.patch(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const marked = await FinancialRepository.markNotificationRead(id, userId);
    if (!marked) {
      throw AppError.notFound('Notification not found.');
    }
    res.status(HttpStatus.OK).json({ success: true, message: 'Notification marked as read.' });
  })
);
