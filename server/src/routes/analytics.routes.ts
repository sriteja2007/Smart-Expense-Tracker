import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { asyncHandler } from '../middlewares/async.middleware.js';
import { FinancialRepository } from '../repositories/financial.repository.js';
import { HttpStatus } from '@lumaspend/shared';

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth);

// GET /api/analytics/summary - High-level financial KPIs, previous period comparisons & top drivers
analyticsRouter.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const summary = await FinancialRepository.getAnalyticsSummary(userId, {
      startDateUtc: req.query.startDateUtc as string | undefined,
      endDateUtc: req.query.endDateUtc as string | undefined,
      accountId: req.query.accountId as string | undefined,
      categoryId: req.query.categoryId as string | undefined
    });

    res.status(HttpStatus.OK).json({
      success: true,
      data: summary
    });
  })
);

// GET /api/analytics/trends - Daily, weekly or monthly income/expense trend time series
analyticsRouter.get(
  '/trends',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const interval = (req.query.interval as 'daily' | 'weekly' | 'monthly') || 'daily';

    const trends = await FinancialRepository.getAnalyticsTrends(userId, {
      interval,
      startDateUtc: req.query.startDateUtc as string | undefined,
      endDateUtc: req.query.endDateUtc as string | undefined,
      accountId: req.query.accountId as string | undefined,
      categoryId: req.query.categoryId as string | undefined
    });

    res.status(HttpStatus.OK).json({
      success: true,
      data: trends
    });
  })
);

// GET /api/analytics/category-breakdown - Spending by category with shares and transaction counts
analyticsRouter.get(
  '/category-breakdown',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;

    const breakdown = await FinancialRepository.getCategoryBreakdown(userId, {
      month,
      year,
      startDateUtc: req.query.startDateUtc as string | undefined,
      endDateUtc: req.query.endDateUtc as string | undefined,
      accountId: req.query.accountId as string | undefined
    });

    res.status(HttpStatus.OK).json({
      success: true,
      data: breakdown
    });
  })
);

// GET /api/analytics/budget-vs-actual - Budget performance comparison for period
analyticsRouter.get(
  '/budget-vs-actual',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const now = new Date();
    const month = req.query.month ? parseInt(req.query.month as string, 10) : now.getUTCMonth() + 1;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : now.getUTCFullYear();

    const budgetVsActual = await FinancialRepository.getBudgetVsActual(userId, month, year);

    res.status(HttpStatus.OK).json({
      success: true,
      data: budgetVsActual
    });
  })
);
