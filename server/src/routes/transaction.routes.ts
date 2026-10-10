import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../middlewares/async.middleware.js';
import { FinancialRepository } from '../repositories/financial.repository.js';
import {
  createTransactionSchema,
  transactionQuerySchema,
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
