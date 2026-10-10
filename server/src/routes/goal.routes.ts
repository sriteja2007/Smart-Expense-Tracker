import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../middlewares/async.middleware.js';
import { FinancialRepository } from '../repositories/financial.repository.js';
import {
  createGoalSchema,
  updateGoalSchema,
  goalContributionSchema,
  AppError,
  HttpStatus
} from '@lumaspend/shared';

export const goalRouter = Router();

goalRouter.use(requireAuth);

// GET /api/goals - List savings goals
goalRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const goals = await FinancialRepository.listGoals(userId);
    res.status(HttpStatus.OK).json({ success: true, data: goals });
  })
);

// POST /api/goals - Create a savings goal
goalRouter.post(
  '/',
  validateRequest(createGoalSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const goal = await FinancialRepository.createGoal(userId, req.body);
    res.status(HttpStatus.CREATED).json({ success: true, data: goal });
  })
);

// GET /api/goals/:id - Get goal details
goalRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const goal = await FinancialRepository.getGoalById(id, userId);
    if (!goal) {
      throw AppError.notFound('Savings goal not found.');
    }
    res.status(HttpStatus.OK).json({ success: true, data: goal });
  })
);

// PATCH /api/goals/:id - Update goal details
goalRouter.patch(
  '/:id',
  validateRequest(updateGoalSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const goal = await FinancialRepository.getGoalById(id, userId);
    if (!goal) {
      throw AppError.notFound('Savings goal not found.');
    }
    const updated = await FinancialRepository.updateGoal(id, userId, req.body);
    res.status(HttpStatus.OK).json({ success: true, data: updated });
  })
);

// POST /api/goals/:id/contribute - Contribute funds from an account to goal
goalRouter.post(
  '/:id/contribute',
  validateRequest(goalContributionSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const updated = await FinancialRepository.contributeToGoal(
      id,
      userId,
      req.body.amountMinorUnits,
      req.body.sourceAccountId
    );
    res.status(HttpStatus.OK).json({ success: true, data: updated });
  })
);

// DELETE /api/goals/:id - Delete savings goal
goalRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const deleted = await FinancialRepository.deleteGoal(id, userId);
    if (!deleted) {
      throw AppError.notFound('Savings goal not found.');
    }
    res.status(HttpStatus.OK).json({ success: true, message: 'Goal deleted successfully.' });
  })
);
