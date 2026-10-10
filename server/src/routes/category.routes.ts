import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../middlewares/async.middleware.js';
import { FinancialRepository } from '../repositories/financial.repository.js';
import {
  createCategorySchema,
  AppError,
  HttpStatus
} from '@lumaspend/shared';

export const categoryRouter = Router();

categoryRouter.use(requireAuth);

// GET /api/categories - List system categories + user custom categories
categoryRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const categories = await FinancialRepository.listCategories(userId);
    res.status(HttpStatus.OK).json({ success: true, data: categories });
  })
);

// POST /api/categories - Create custom category
categoryRouter.post(
  '/',
  validateRequest(createCategorySchema),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const category = await FinancialRepository.createCategory(userId, req.body);
    res.status(HttpStatus.CREATED).json({ success: true, data: category });
  })
);

// DELETE /api/categories/:id - Delete custom category
categoryRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const deleted = await FinancialRepository.deleteCategory(id, userId);
    if (!deleted) {
      throw AppError.notFound('Category not found or is a system default.');
    }
    res.status(HttpStatus.OK).json({ success: true, message: 'Category deleted successfully.' });
  })
);
