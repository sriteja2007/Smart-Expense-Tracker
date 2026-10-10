import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../middlewares/async.middleware.js';
import { FinancialRepository } from '../repositories/financial.repository.js';
import {
  createAccountSchema,
  updateAccountSchema,
  AppError,
  HttpStatus
} from '@lumaspend/shared';

export const accountRouter = Router();

accountRouter.use(requireAuth);

// GET /api/accounts - List user accounts
accountRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const householdId = req.query.householdId as string | undefined;
    const accounts = await FinancialRepository.listAccounts(userId, householdId);
    res.status(HttpStatus.OK).json({ success: true, data: accounts });
  })
);

// POST /api/accounts - Create new account
accountRouter.post(
  '/',
  validateRequest(createAccountSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const account = await FinancialRepository.createAccount(userId, req.body);
    res.status(HttpStatus.CREATED).json({ success: true, data: account });
  })
);

// GET /api/accounts/:id - Get account details
accountRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const account = await FinancialRepository.getAccountById(id, userId);
    if (!account) {
      throw AppError.notFound('Account not found.');
    }
    res.status(HttpStatus.OK).json({ success: true, data: account });
  })
);

// PATCH /api/accounts/:id - Update account
accountRouter.patch(
  '/:id',
  validateRequest(updateAccountSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const updated = await FinancialRepository.updateAccount(id, userId, req.body);
    if (!updated) {
      throw AppError.notFound('Account not found.');
    }
    res.status(HttpStatus.OK).json({ success: true, data: updated });
  })
);

// DELETE /api/accounts/:id - Delete account
accountRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const deleted = await FinancialRepository.deleteAccount(id, userId);
    if (!deleted) {
      throw AppError.notFound('Account not found.');
    }
    res.status(HttpStatus.OK).json({ success: true, message: 'Account deleted successfully.' });
  })
);
