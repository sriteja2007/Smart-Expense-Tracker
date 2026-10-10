import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { asyncHandler } from '../middlewares/async.middleware.js';
import { FinancialRepository } from '../repositories/financial.repository.js';
import { HttpStatus } from '@lumaspend/shared';

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth);

// GET /api/analytics/summary - High-level financial KPIs in minor units
analyticsRouter.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const accounts = await FinancialRepository.listAccounts(userId);
    const totalBalanceMinorUnits = accounts.reduce((acc, a) => acc + a.balanceMinorUnits, 0);

    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999)).toISOString();

    const { transactions } = await FinancialRepository.listTransactions(userId, {
      startDateUtc: startOfMonth,
      endDateUtc: endOfMonth,
      limit: 1000
    });

    let monthlyIncomeMinorUnits = 0;
    let monthlyExpenseMinorUnits = 0;

    for (const t of transactions) {
      if (t.type === 'income') monthlyIncomeMinorUnits += t.amountMinorUnits;
      if (t.type === 'expense') monthlyExpenseMinorUnits += t.amountMinorUnits;
    }

    const netSavingsMinorUnits = monthlyIncomeMinorUnits - monthlyExpenseMinorUnits;
    const savingsRatePct =
      monthlyIncomeMinorUnits > 0
        ? Math.round(Math.max(0, (netSavingsMinorUnits / monthlyIncomeMinorUnits) * 100))
        : 0;

    res.status(HttpStatus.OK).json({
      success: true,
      data: {
        totalBalanceMinorUnits,
        monthlyIncomeMinorUnits,
        monthlyExpenseMinorUnits,
        netSavingsMinorUnits,
        savingsRatePct,
        accountCount: accounts.length,
        transactionCount: transactions.length
      }
    });
  })
);

// GET /api/analytics/category-breakdown - Spending by category for charts
analyticsRouter.get(
  '/category-breakdown',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const now = new Date();
    const month = req.query.month ? parseInt(req.query.month as string, 10) : now.getUTCMonth() + 1;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : now.getUTCFullYear();

    const startOfMonth = new Date(Date.UTC(year, month - 1, 1)).toISOString();
    const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)).toISOString();

    const [categories, { transactions }] = await Promise.all([
      FinancialRepository.listCategories(userId),
      FinancialRepository.listTransactions(userId, {
        type: 'expense',
        startDateUtc: startOfMonth,
        endDateUtc: endOfMonth,
        limit: 1000
      })
    ]);

    const catMap = new Map(categories.map((c) => [c.id, c]));
    const totalsByCat = new Map<string, number>();

    for (const t of transactions) {
      const catId = t.categoryId || 'uncategorized';
      totalsByCat.set(catId, (totalsByCat.get(catId) || 0) + t.amountMinorUnits);
    }

    const breakdown = Array.from(totalsByCat.entries()).map(([catId, amountMinorUnits]) => {
      const cat = catMap.get(catId);
      return {
        categoryId: catId,
        categoryName: cat ? cat.name : 'Uncategorized',
        color: cat ? cat.color : '#94A3B8',
        amountMinorUnits
      };
    });

    res.status(HttpStatus.OK).json({ success: true, data: breakdown });
  })
);
