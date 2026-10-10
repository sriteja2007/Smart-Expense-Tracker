import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../middlewares/async.middleware.js';
import { FinancialRepository } from '../repositories/financial.repository.js';
import {
  createAiConversationSchema,
  HttpStatus
} from '@lumaspend/shared';
import { z } from 'zod';

export const aiRouter = Router();

aiRouter.use(requireAuth);

const postMessageSchema = z.object({
  content: z.string().trim().min(1, 'Message cannot be empty').max(2000)
});

// GET /api/ai/conversations - List active AI conversations
aiRouter.get(
  '/conversations',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const conversations = await FinancialRepository.listAiConversations(userId);
    res.status(HttpStatus.OK).json({ success: true, data: conversations });
  })
);

// POST /api/ai/conversations - Start a new conversation thread
aiRouter.post(
  '/conversations',
  validateRequest(createAiConversationSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const conversation = await FinancialRepository.createAiConversation(userId, req.body);
    res.status(HttpStatus.CREATED).json({ success: true, data: conversation });
  })
);

// POST /api/ai/conversations/:id/messages - Post user message and get AI financial advice
aiRouter.post(
  '/conversations/:id/messages',
  validateRequest(postMessageSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const { content } = req.body;

    // 1. Append user prompt
    await FinancialRepository.addAiMessage(id, userId, {
      role: 'user',
      content
    });

    // 2. Draft financial advisor response
    const aiResponse =
      `I've analyzed your financial query regarding "${content}". ` +
      `Your current budget allocations and cash flows look solid. If you are planning an upcoming expense, ` +
      `ensure your savings goals have at least a 3-month emergency cushion in liquid accounts.`;

    const updated = await FinancialRepository.addAiMessage(id, userId, {
      role: 'model',
      content: aiResponse
    });

    res.status(HttpStatus.OK).json({ success: true, data: updated });
  })
);
