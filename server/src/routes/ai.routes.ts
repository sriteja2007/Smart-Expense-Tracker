import { Router, type Request, type Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../middlewares/async.middleware.js';
import { FinancialRepository } from '../repositories/financial.repository.js';
import { GeminiService } from '../services/gemini.service.js';
import {
  createAiConversationSchema,
  aiChatQuerySchema,
  HttpStatus,
  AppError,
  type CurrencyCode
} from '@lumaspend/shared';
import rateLimit from 'express-rate-limit';

export const aiRouter = Router();

// Protect all AI routes with authentication
aiRouter.use(requireAuth);

// Rate limiter for AI interactions to prevent API exhaustion and abuse (30 requests per 15 minutes)
const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'AI advisor query rate limit exceeded. Please wait a few minutes before asking more questions.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// GET /api/ai/insights - Deterministic rule-based insights and financial metrics
aiRouter.get(
  '/insights',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;

    const summary = await FinancialRepository.getAiInsightSummary(userId, month, year);

    res.status(HttpStatus.OK).json({
      success: true,
      data: summary
    });
  })
);

// GET /api/ai/conversations - List user's active AI conversations
aiRouter.get(
  '/conversations',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const conversations = await FinancialRepository.listAiConversations(userId);
    res.status(HttpStatus.OK).json({ success: true, data: conversations });
  })
);

// POST /api/ai/conversations - Create new AI conversation thread
aiRouter.post(
  '/conversations',
  validateRequest(createAiConversationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const conversation = await FinancialRepository.createAiConversation(userId, req.body);
    res.status(HttpStatus.CREATED).json({ success: true, data: conversation });
  })
);

// GET /api/ai/conversations/:id - Get specific conversation thread with ownership validation
aiRouter.get(
  '/conversations/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const conversation = await FinancialRepository.getAiConversationById(id, userId);
    if (!conversation) {
      throw AppError.notFound('Conversation not found or unauthorized.');
    }

    res.status(HttpStatus.OK).json({ success: true, data: conversation });
  })
);

// DELETE /api/ai/conversations/:id - Archive/delete conversation thread
aiRouter.delete(
  '/conversations/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const deleted = await FinancialRepository.deleteAiConversation(id, userId);
    if (!deleted) {
      throw AppError.notFound('Conversation not found or unauthorized.');
    }

    res.status(HttpStatus.OK).json({
      success: true,
      data: { message: 'Conversation archived successfully.' }
    });
  })
);

// POST /api/ai/chat - Standalone or threaded chat query with financial context
aiRouter.post(
  '/chat',
  aiRateLimiter,
  validateRequest(aiChatQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { content, conversationId } = req.body;
    const currency: CurrencyCode = (req.user as any)?.preferences?.currency || 'INR';

    // 1. Resolve or create conversation
    let convId = conversationId;
    let existingConversation = null;

    if (convId) {
      existingConversation = await FinancialRepository.getAiConversationById(convId, userId);
      if (!existingConversation) {
        throw AppError.notFound('Conversation not found or unauthorized.');
      }
    } else {
      const newConv = await FinancialRepository.createAiConversation(userId, {
        title: content.slice(0, 40) || 'Financial Advice',
        retentionDays: 30
      });
      convId = newConv.id;
      existingConversation = newConv;
    }

    // 2. Append user message to conversation
    const updatedWithUser = await FinancialRepository.addAiMessage(convId, userId, {
      role: 'user',
      content: content.trim()
    });

    const userMsg = updatedWithUser.messages[updatedWithUser.messages.length - 1];

    // 3. Fetch user's deterministic financial summary for current period
    const summary = await FinancialRepository.getAiInsightSummary(userId);

    // 4. Generate financial advice via GeminiService (with guardrails and fallback)
    const advice = await GeminiService.generateFinancialAdvice(
      content,
      summary,
      currency,
      existingConversation.messages
    );

    // 5. Append model response to conversation
    const updatedWithAi = await FinancialRepository.addAiMessage(convId, userId, {
      role: 'model',
      content: advice.text
    });

    const aiMsg = updatedWithAi.messages[updatedWithAi.messages.length - 1];

    res.status(HttpStatus.OK).json({
      success: true,
      data: {
        conversationId: convId,
        userMessage: userMsg,
        aiMessage: aiMsg,
        isAiGenerated: advice.isAiGenerated,
        isFallback: advice.isFallback,
        model: advice.model,
        analysisPeriod: advice.analysisPeriod,
        disclaimer: advice.disclaimer
      }
    });
  })
);

// POST /api/ai/conversations/:id/messages - Append message to existing thread
aiRouter.post(
  '/conversations/:id/messages',
  aiRateLimiter,
  validateRequest(aiChatQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    req.body.conversationId = req.params.id;
    const userId = req.user!.id;
    const { content } = req.body;
    const convId = req.params.id as string;
    const currency: CurrencyCode = (req.user as any)?.preferences?.currency || 'INR';

    // 1. Verify conversation ownership
    const conversation = await FinancialRepository.getAiConversationById(convId, userId);
    if (!conversation) {
      throw AppError.notFound('Conversation not found or unauthorized.');
    }

    // 2. Append user message
    const updatedWithUser = await FinancialRepository.addAiMessage(convId, userId, {
      role: 'user',
      content: content.trim()
    });

    const userMsg = updatedWithUser.messages[updatedWithUser.messages.length - 1];

    // 3. Fetch user's deterministic financial summary for current period
    const summary = await FinancialRepository.getAiInsightSummary(userId);

    // 4. Generate financial advice
    const advice = await GeminiService.generateFinancialAdvice(
      content,
      summary,
      currency,
      conversation.messages
    );

    // 5. Append assistant response
    const updatedWithAi = await FinancialRepository.addAiMessage(convId, userId, {
      role: 'model',
      content: advice.text
    });

    const aiMsg = updatedWithAi.messages[updatedWithAi.messages.length - 1];

    res.status(HttpStatus.OK).json({
      success: true,
      data: {
        conversationId: convId,
        userMessage: userMsg,
        aiMessage: aiMsg,
        isAiGenerated: advice.isAiGenerated,
        isFallback: advice.isFallback,
        model: advice.model,
        analysisPeriod: advice.analysisPeriod,
        disclaimer: advice.disclaimer
      }
    });
  })
);
