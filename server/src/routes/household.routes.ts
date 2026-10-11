import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../middlewares/async.middleware.js';
import { FinancialRepository } from '../repositories/financial.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import {
  createHouseholdSchema,
  inviteMemberSchema,
  createHouseholdInvitationSchema,
  acceptHouseholdInvitationSchema,
  updateHouseholdMemberRoleSchema,
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

// POST /api/households/invitations/accept - Accept invitation token (must be declared before /:id)
householdRouter.post(
  '/invitations/accept',
  validateRequest(acceptHouseholdInvitationSchema),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const { token } = req.body;
    const household = await FinancialRepository.acceptHouseholdInvitation(
      token,
      user.id,
      user.email,
      user.displayName
    );
    res.status(HttpStatus.OK).json({ success: true, data: household, message: 'Invitation accepted successfully' });
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

// POST /api/households/:id/invitations - Create single-use expiring invite token with role
householdRouter.post(
  '/:id/invitations',
  validateRequest(createHouseholdInvitationSchema),
  asyncHandler(async (req, res) => {
    const inviter = req.user!;
    const householdId = req.params.id as string;
    const result = await FinancialRepository.createHouseholdInvitation(
      householdId,
      inviter.id,
      inviter.displayName,
      req.body
    );
    res.status(HttpStatus.CREATED).json({
      success: true,
      data: result.invitation,
      inviteLink: result.inviteLink,
      message: `Invitation issued for ${result.invitation.inviteeEmail}`
    });
  })
);

// DELETE /api/households/:id/invitations/:inviteId - Revoke invitation token
householdRouter.delete(
  '/:id/invitations/:inviteId',
  asyncHandler(async (req, res) => {
    const ownerId = req.user!.id;
    const householdId = req.params.id as string;
    const inviteId = req.params.inviteId as string;
    const updated = await FinancialRepository.revokeHouseholdInvitation(householdId, ownerId, inviteId);
    res.status(HttpStatus.OK).json({ success: true, data: updated, message: 'Invitation revoked successfully' });
  })
);

// DELETE /api/households/:id/members/:memberId - Remove member from household (owner only)
householdRouter.delete(
  '/:id/members/:memberId',
  asyncHandler(async (req, res) => {
    const ownerId = req.user!.id;
    const householdId = req.params.id as string;
    const memberId = req.params.memberId as string;
    const updated = await FinancialRepository.removeHouseholdMember(householdId, ownerId, memberId);
    res.status(HttpStatus.OK).json({ success: true, data: updated, message: 'Member removed successfully' });
  })
);

// PATCH /api/households/:id/members/:memberId/role - Change member role (owner only)
householdRouter.patch(
  '/:id/members/:memberId/role',
  validateRequest(updateHouseholdMemberRoleSchema),
  asyncHandler(async (req, res) => {
    const ownerId = req.user!.id;
    const householdId = req.params.id as string;
    const memberId = req.params.memberId as string;
    const updated = await FinancialRepository.updateHouseholdMemberRole(
      householdId,
      ownerId,
      memberId,
      req.body.role
    );
    res.status(HttpStatus.OK).json({ success: true, data: updated, message: 'Member role updated successfully' });
  })
);

// DELETE /api/households/:id - Delete household (owner only)
householdRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const ownerId = req.user!.id;
    const householdId = req.params.id as string;
    await FinancialRepository.deleteHousehold(householdId, ownerId);
    res.status(HttpStatus.OK).json({ success: true, message: 'Household deleted successfully' });
  })
);

// POST /api/households/:id/invite - Legacy direct add
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
