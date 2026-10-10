import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../middlewares/async.middleware.js';
import { FinancialRepository } from '../repositories/financial.repository.js';
import {
  createBudgetSchema,
  updateBudgetSchema,
  AppError,
  HttpStatus
} from '@lumaspend/shared';

export const budgetRouter = Router();

budgetRouter.use(requireAuth);

// GET /api/budgets - List budgets for a period (defaults to current month/year)
budgetRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const now = new Date();
    const periodMonth = req.query.month ? parseInt(req.query.month as string, 10) : now.getUTCMonth() + 1;
    const periodYear = req.query.year ? parseInt(req.query.year as string, 10) : now.getUTCFullYear();

    const budgets = await FinancialRepository.listBudgets(userId, periodMonth, periodYear);
    res.status(HttpStatus.OK).json({ success: true, data: budgets });
  })
);

// POST /api/budgets - Create a new budget
budgetRouter.post(
  '/',
  validateRequest(createBudgetSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const budget = await FinancialRepository.createBudget(userId, req.body);
    res.status(HttpStatus.CREATED).json({ success: true, data: budget });
  })
);

// GET /api/budgets/:id - Get budget details
budgetRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const budget = await FinancialRepository.getBudgetById(id, userId);
    if (!budget) {
      throw AppError.notFound('Budget not found.');
    }
    res.status(HttpStatus.OK).json({ success: true, data: budget });
  })
);

// PATCH /api/budgets/:id - Update budget limit / alert threshold
budgetRouter.patch(
  '/:id',
  validateRequest(updateBudgetSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const updated = await FinancialRepository.updateBudget(id, userId, req.body);
    if (!updated) {
      throw AppError.notFound('Budget not found.');
    }
    res.status(HttpStatus.OK).json({ success: true, data: updated });
  })
);

// DELETE /api/budgets/:id - Delete budget
budgetRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const deleted = await FinancialRepository.deleteBudget(id, userId);
    if (!deleted) {
      throw AppError.notFound('Budget not found.');
    }
    res.status(HttpStatus.OK).json({ success: true, message: 'Budget deleted successfully.' });
  })
);
