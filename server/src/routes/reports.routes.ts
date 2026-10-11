import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { asyncHandler } from '../middlewares/async.middleware.js';
import { FinancialRepository } from '../repositories/financial.repository.js';
import { PdfReportService } from '../services/pdf-report.service.js';
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

    const [accounts, budgets, summary, categoryBreakdown, { transactions }] = await Promise.all([
      FinancialRepository.listAccounts(userId),
      FinancialRepository.listBudgets(userId, month, year),
      FinancialRepository.getAnalyticsSummary(userId, { startDateUtc: startOfMonth, endDateUtc: endOfMonth }),
      FinancialRepository.getCategoryBreakdown(userId, { month, year }),
      FinancialRepository.listTransactions(userId, {
        startDateUtc: startOfMonth,
        endDateUtc: endOfMonth,
        limit: 2000
      })
    ]);

    res.status(HttpStatus.OK).json({
      success: true,
      data: {
        period: { month, year },
        totalIncomeMinorUnits: summary.monthlyIncomeMinorUnits,
        totalExpenseMinorUnits: summary.monthlyExpenseMinorUnits,
        netSavingsMinorUnits: summary.netSavingsMinorUnits,
        savingsRatePct: summary.savingsRatePct,
        transactionCount: transactions.length,
        budgets,
        accounts,
        categoryBreakdown,
        summary
      }
    });
  })
);

// GET /api/reports/export-csv - Stream CSV file of transactions with safe CSV escaping
reportsRouter.get(
  '/export-csv',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const startDateUtc = req.query.startDateUtc as string | undefined;
    const endDateUtc = req.query.endDateUtc as string | undefined;

    const { transactions } = await FinancialRepository.listTransactions(userId, {
      startDateUtc,
      endDateUtc,
      limit: 2000
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="lumaspend-transactions.csv"');

    const csvRows = [
      ['Date', 'Type', 'Description', 'Merchant', 'Notes', 'Amount', 'Currency', 'Payment Method', 'Status'].join(',')
    ];

    for (const t of transactions) {
      const decimalAmount = fromMinorUnits(t.amountMinorUnits, t.currency);
      const safeDesc = `"${(t.description || '').replace(/"/g, '""')}"`;
      const safeMerchant = `"${(t.merchantName || '').replace(/"/g, '""')}"`;
      const safeNotes = `"${(t.notes || '').replace(/"/g, '""')}"`;
      csvRows.push([
        t.dateUtc,
        t.type,
        safeDesc,
        safeMerchant,
        safeNotes,
        decimalAmount.toFixed(2),
        t.currency,
        t.paymentMethod,
        t.status
      ].join(','));
    }

    res.status(HttpStatus.OK).send(csvRows.join('\n'));
  })
);

// GET /api/reports/export-pdf - Generate and stream executive PDF financial report
reportsRouter.get(
  '/export-pdf',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const now = new Date();
    const month = req.query.month ? parseInt(req.query.month as string, 10) : now.getUTCMonth() + 1;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : now.getUTCFullYear();

    const startOfMonth = new Date(Date.UTC(year, month - 1, 1)).toISOString();
    const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)).toISOString();

    const [accounts, budgets, summary, categoryBreakdown, { transactions }] = await Promise.all([
      FinancialRepository.listAccounts(userId),
      FinancialRepository.listBudgets(userId, month, year),
      FinancialRepository.getAnalyticsSummary(userId, { startDateUtc: startOfMonth, endDateUtc: endOfMonth }),
      FinancialRepository.getCategoryBreakdown(userId, { month, year }),
      FinancialRepository.listTransactions(userId, {
        startDateUtc: startOfMonth,
        endDateUtc: endOfMonth,
        limit: 2000
      })
    ]);

    const filename = `lumaspend-financial-report-${year}-${String(month).padStart(2, '0')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    PdfReportService.generateFinancialReportStream(
      {
        user: {
          displayName: req.user!.displayName,
          email: req.user!.email
        },
        period: {
          month,
          year,
          startDateUtc: startOfMonth,
          endDateUtc: endOfMonth
        },
        summary,
        categoryBreakdown,
        budgets,
        transactions,
        accounts
      },
      res
    );
  })
);
