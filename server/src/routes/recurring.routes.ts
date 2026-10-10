import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../middlewares/async.middleware.js';
import { FinancialRepository } from '../repositories/financial.repository.js';
import {
  createRecurringSchema,
  AppError,
  HttpStatus
} from '@lumaspend/shared';

export const recurringRouter = Router();

recurringRouter.use(requireAuth);

// GET /api/recurring - List recurring transaction schedules
recurringRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const list = await FinancialRepository.listRecurring(userId);
    res.status(HttpStatus.OK).json({ success: true, data: list });
  })
);

// POST /api/recurring - Create recurring transaction rule
recurringRouter.post(
  '/',
  validateRequest(createRecurringSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const schedule = await FinancialRepository.createRecurring(userId, req.body);
    res.status(HttpStatus.CREATED).json({ success: true, data: schedule });
  })
);

// DELETE /api/recurring/:id - Cancel/delete recurring rule
recurringRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const deleted = await FinancialRepository.deleteRecurring(id, userId);
    if (!deleted) {
      throw AppError.notFound('Recurring schedule not found.');
    }
    res.status(HttpStatus.OK).json({ success: true, message: 'Recurring schedule removed.' });
  })
);
