import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { asyncHandler } from '../middlewares/async.middleware.js';
import { FinancialRepository } from '../repositories/financial.repository.js';
import { fromMinorUnits, HttpStatus } from '@lumaspend/shared';

export const reportsRouter = Router();

reportsRouter.use(requireAuth);

// GET /api/reports/monthly - Monthly financial executive summary
reportsRouter.get(
  '/monthly',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const now = new Date();
    const month = req.query.month ? parseInt(req.query.month as string, 10) : now.getUTCMonth() + 1;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : now.getUTCFullYear();

    const startOfMonth = new Date(Date.UTC(year, month - 1, 1)).toISOString();
    const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)).toISOString();

    const [accounts, budgets, { transactions }] = await Promise.all([
      FinancialRepository.listAccounts(userId),
      FinancialRepository.listBudgets(userId, month, year),
      FinancialRepository.listTransactions(userId, {
        startDateUtc: startOfMonth,
        endDateUtc: endOfMonth,
        limit: 1000
      })
    ]);

    let totalIncome = 0;
    let totalExpense = 0;
    for (const t of transactions) {
      if (t.type === 'income') totalIncome += t.amountMinorUnits;
      if (t.type === 'expense') totalExpense += t.amountMinorUnits;
    }

    res.status(HttpStatus.OK).json({
      success: true,
      data: {
        period: { month, year },
        totalIncomeMinorUnits: totalIncome,
        totalExpenseMinorUnits: totalExpense,
        netSavingsMinorUnits: totalIncome - totalExpense,
        transactionCount: transactions.length,
        budgets,
        accounts
      }
    });
  })
);

// GET /api/reports/export-csv - Stream CSV file of transactions
reportsRouter.get(
  '/export-csv',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { transactions } = await FinancialRepository.listTransactions(userId, {
      limit: 1000
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="lumaspend-transactions.csv"');

    const csvRows = [
      ['Date', 'Type', 'Description', 'Merchant', 'Amount', 'Currency', 'Payment Method', 'Status'].join(',')
    ];

    for (const t of transactions) {
      const decimalAmount = fromMinorUnits(t.amountMinorUnits, t.currency);
      const safeDesc = `"${(t.description || '').replace(/"/g, '""')}"`;
      const safeMerchant = `"${(t.merchantName || '').replace(/"/g, '""')}"`;
      csvRows.push([
        t.dateUtc,
        t.type,
        safeDesc,
        safeMerchant,
        decimalAmount.toFixed(2),
        t.currency,
        t.paymentMethod,
        t.status
      ].join(','));
    }

    res.status(HttpStatus.OK).send(csvRows.join('\n'));
  })
);
