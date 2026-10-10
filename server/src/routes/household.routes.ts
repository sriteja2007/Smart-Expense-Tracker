import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../middlewares/async.middleware.js';
import { FinancialRepository } from '../repositories/financial.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import {
  createHouseholdSchema,
  inviteMemberSchema,
  AppError,
  HttpStatus
} from '@lumaspend/shared';

export const householdRouter = Router();

householdRouter.use(requireAuth);

// GET /api/households - List my households
householdRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const households = await FinancialRepository.listHouseholdsForUser(userId);
    res.status(HttpStatus.OK).json({ success: true, data: households });
  })
);

// POST /api/households - Create new shared household budget space
householdRouter.post(
  '/',
  validateRequest(createHouseholdSchema),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const household = await FinancialRepository.createHousehold(
      user.id,
      user.email,
      user.displayName,
      req.body
    );
    res.status(HttpStatus.CREATED).json({ success: true, data: household });
  })
);

// GET /api/households/:id - Get household details
householdRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const household = await FinancialRepository.getHouseholdById(id, userId);
    if (!household) {
      throw AppError.notFound('Household not found or you are not a member.');
    }
    res.status(HttpStatus.OK).json({ success: true, data: household });
  })
);

// POST /api/households/:id/invite - Invite a registered member into the household
householdRouter.post(
  '/:id/invite',
  validateRequest(inviteMemberSchema),
  asyncHandler(async (req, res) => {
    const inviterId = req.user!.id;
    const id = req.params.id as string;
    const { email } = req.body;

    const targetUser = await UserRepository.findByEmail(email);
    if (!targetUser) {
      throw AppError.notFound('User with this email is not registered on LumaSpend.');
    }

    const updated = await FinancialRepository.inviteMember(
      id,
      inviterId,
      req.body,
      { id: targetUser._id ? targetUser._id.toString() : targetUser.id, displayName: targetUser.displayName }
    );

    res.status(HttpStatus.OK).json({ success: true, data: updated });
  })
);
