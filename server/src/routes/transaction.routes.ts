import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../middlewares/async.middleware.js';
import { FinancialRepository } from '../repositories/financial.repository.js';
import {
  createTransactionSchema,
  updateTransactionSchema,
  transactionQuerySchema,
  csvImportPreviewSchema,
  csvImportConfirmSchema,
  fromMinorUnits,
  AppError,
  HttpStatus
} from '@lumaspend/shared';

export const transactionRouter = Router();

transactionRouter.use(requireAuth);

// GET /api/transactions - List paginated transactions with filters
transactionRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const parsedQuery = transactionQuerySchema.parse(req.query);
    const result = await FinancialRepository.listTransactions(userId, parsedQuery);
    res.status(HttpStatus.OK).json({ success: true, ...result });
  })
);

// POST /api/transactions - Record new transaction
transactionRouter.post(
  '/',
  validateRequest(createTransactionSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const transaction = await FinancialRepository.createTransaction(userId, req.body);
    res.status(HttpStatus.CREATED).json({ success: true, data: transaction });
  })
);

// POST /api/transactions/import/preview - Preview CSV rows, detect errors & duplicates
transactionRouter.post(
  '/import/preview',
  validateRequest(csvImportPreviewSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const preview = await FinancialRepository.previewCsvImport(userId, req.body);
    res.status(HttpStatus.OK).json({ success: true, data: preview });
  })
);

// POST /api/transactions/import/confirm - Confirm & persist validated CSV rows atomically
transactionRouter.post(
  '/import/confirm',
  validateRequest(csvImportConfirmSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const result = await FinancialRepository.confirmCsvImport(userId, req.body.rows);
    res.status(HttpStatus.CREATED).json({
      success: true,
      message: `Successfully imported ${result.importedCount} transactions.`,
      data: result
    });
  })
);

// GET /api/transactions/export-csv - Stream CSV file of transactions
transactionRouter.get(
  '/export-csv',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const query = transactionQuerySchema.parse({
      ...req.query,
      limit: 1000
    });
    const { transactions } = await FinancialRepository.listTransactions(userId, query);

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
      csvRows.push(
        [
          t.dateUtc,
          t.type,
          safeDesc,
          safeMerchant,
          safeNotes,
          decimalAmount.toFixed(2),
          t.currency,
          t.paymentMethod,
          t.status
        ].join(',')
      );
    }

    res.status(HttpStatus.OK).send(csvRows.join('\n'));
  })
);

// GET /api/transactions/:id - Get transaction details
transactionRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const txn = await FinancialRepository.getTransactionById(id, userId);
    if (!txn) {
      throw AppError.notFound('Transaction not found.');
    }
    res.status(HttpStatus.OK).json({ success: true, data: txn });
  })
);

// PATCH /api/transactions/:id - Edit/update existing transaction
transactionRouter.patch(
  '/:id',
  validateRequest(updateTransactionSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const updated = await FinancialRepository.updateTransaction(id, userId, req.body);
    if (!updated) {
      throw AppError.notFound('Transaction not found.');
    }
    res.status(HttpStatus.OK).json({ success: true, data: updated });
  })
);

// DELETE /api/transactions/:id - Delete transaction (reverses account balance)
transactionRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const deleted = await FinancialRepository.deleteTransaction(id, userId);
    if (!deleted) {
      throw AppError.notFound('Transaction not found.');
    }
    res.status(HttpStatus.OK).json({
      success: true,
      message: 'Transaction deleted and balance adjusted.'
    });
  })
);
