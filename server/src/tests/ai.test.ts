import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { FinancialRepository } from '../repositories/financial.repository.js';
import { GeminiService } from '../services/gemini.service.js';
import { ReceiptOcrService } from '../services/receipt-ocr.service.js';

// Mock @google/genai SDK
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(() => {
      return {
        models: {
          generateContent: vi.fn().mockImplementation(async ({ contents }) => {
            if (contents.includes('TRIGGER_GEMINI_FAILURE')) {
              throw new Error('Gemini API 503 Service Unavailable');
            }
            return {
              text: `### Verified Financial Intelligence\n\nBased on your ledger records, your monthly spending is well within limits. Verified savings rate is 45%.`
            };
          })
        }
      };
    })
  };
});

describe('Phase 7: AI Financial Assistant & Receipt OCR Suite', () => {
  const app = createApp();
  let userToken: string;
  let userId: string;
  let otherUserToken: string;

  beforeEach(async () => {
    // Register User 1
    const email1 = `test.ai.${Date.now()}@example.com`;
    const regRes1 = await request(app)
      .post('/api/auth/register')
      .send({
        email: email1,
        password: 'Password123!',
        displayName: 'AI Test User'
      });
    userToken = regRes1.body.data.token;
    userId = regRes1.body.data.user.id;

    // Register User 2 for authorization and isolation testing
    const email2 = `other.ai.${Date.now()}@example.com`;
    const regRes2 = await request(app)
      .post('/api/auth/register')
      .send({
        email: email2,
        password: 'Password123!',
        displayName: 'Other User'
      });
    otherUserToken = regRes2.body.data.token;

    // Create an account and some transactions for User 1
    const acc = await FinancialRepository.createAccount(userId, {
      name: 'Primary Checking',
      type: 'checking',
      currency: 'INR',
      initialBalanceMinorUnits: 5000000
    });

    const cat = await FinancialRepository.createCategory(userId, {
      name: 'Groceries',
      type: 'expense'
    });

    await FinancialRepository.createTransaction(userId, {
      type: 'income',
      amountMinorUnits: 10000000, // ₹100,000
      currency: 'INR',
      sourceAccountId: acc.id,
      description: 'Monthly Salary',
      dateUtc: new Date().toISOString(),
      paymentMethod: 'net_banking',
      tags: ['salary']
    });

    await FinancialRepository.createTransaction(userId, {
      type: 'expense',
      amountMinorUnits: 1500000, // ₹15,000
      currency: 'INR',
      sourceAccountId: acc.id,
      categoryId: cat.id,
      description: 'Supermarket Groceries',
      dateUtc: new Date().toISOString(),
      paymentMethod: 'upi',
      tags: ['groceries']
    });
  });

  describe('Deterministic Rule-Based Insights & Core Analytics Continuity', () => {
    it('calculates deterministic summary even when Gemini API key is missing or offline', async () => {
      const summary = await FinancialRepository.getAiInsightSummary(userId);

      expect(summary.totalIncomeMinorUnits).toBe(10000000);
      expect(summary.totalExpenseMinorUnits).toBe(1500000);
      expect(summary.netSavingsMinorUnits).toBe(8500000);
      expect(summary.savingsRatePct).toBe(85);
      expect(summary.ruleBasedSuggestions.length).toBeGreaterThan(0);
    });

    it('GET /api/ai/insights returns authorized rule-based insights', async () => {
      const res = await request(app)
        .get('/api/ai/insights')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalIncomeMinorUnits).toBe(10000000);
      expect(res.body.data.totalExpenseMinorUnits).toBe(1500000);
      expect(res.body.data.savingsRatePct).toBe(85);
    });

    it('rule-based engine answers standard questions accurately without calling Gemini', () => {
      const summary = {
        periodMonth: 10,
        periodYear: 2026,
        totalIncomeMinorUnits: 10000000,
        totalExpenseMinorUnits: 1500000,
        netSavingsMinorUnits: 8500000,
        savingsRatePct: 85,
        overBudgetCategories: [
          { categoryName: 'Dining', spentMinorUnits: 500000, limitMinorUnits: 400000, percent: 125 }
        ],
        topExpenseCategories: [
          { categoryName: 'Groceries', amountMinorUnits: 1500000, percentage: 75 }
        ],
        largestExpenses: [
          { description: 'Supermarket Groceries', amountMinorUnits: 1500000, dateUtc: '2026-10-01T10:00:00.000Z' }
        ],
        ruleBasedSuggestions: ['Trim dining out']
      };

      const whereAnswer = GeminiService.generateRuleBasedAdvice('Where did most of my money go this month?', summary as any, 'INR');
      expect(whereAnswer).toContain('Groceries');
      expect(whereAnswer).toContain('75%');

      const budgetAnswer = GeminiService.generateRuleBasedAdvice('Which categories are over budget?', summary as any, 'INR');
      expect(budgetAnswer).toContain('Dining');
      expect(budgetAnswer).toContain('125%');

      const largestAnswer = GeminiService.generateRuleBasedAdvice('Summarize my biggest expenses', summary as any, 'INR');
      expect(largestAnswer).toContain('Supermarket Groceries');
    });
  });

  describe('AI Assistant & Security Isolation', () => {
    it('POST /api/ai/chat returns grounded advice and never leaks the GEMINI_API_KEY', async () => {
      process.env.GEMINI_API_KEY = 'mock-test-key-ai-xyz-123';

      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Where did most of my money go this month?'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.aiMessage).toBeDefined();
      expect(res.body.data.disclaimer).toContain('personal budgeting guidance');

      // CRITICAL SECURITY CHECK: API key must NEVER be in response payload
      const responseStr = JSON.stringify(res.body);
      expect(responseStr).not.toContain('mock-test-key-ai-xyz-123');
      expect(res.headers).not.toHaveProperty('x-gemini-api-key');
    });

    it('gracefully falls back to rule-based advice when Gemini API fails', async () => {
      process.env.GEMINI_API_KEY = 'mock-test-key-ai-xyz-123';

      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'TRIGGER_GEMINI_FAILURE: Where did most of my money go?'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isFallback).toBe(true);
      expect(res.body.data.aiMessage.content).toContain('Spending Distribution');
    });

    it('rejects unauthenticated requests to AI endpoints', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .send({ content: 'Show me my financial status' });

      expect(res.status).toBe(401);
    });

    it('enforces strict cross-user conversation isolation', async () => {
      // User 1 creates conversation
      const conv = await FinancialRepository.createAiConversation(userId, {
        title: 'User 1 Confidential Strategy',
        retentionDays: 30
      });

      // User 2 attempts to access User 1's conversation
      const res = await request(app)
        .get(`/api/ai/conversations/${conv.id}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.status).toBe(404);

      // User 2 attempts to post into User 1's conversation
      const postRes = await request(app)
        .post(`/api/ai/conversations/${conv.id}/messages`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ content: 'Attempting unauthorized prompt injection' });

      expect(postRes.status).toBe(404);
    });

    it('rejects oversized inputs exceeding 2000 characters', async () => {
      const hugePrompt = 'A'.repeat(2500);

      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: hugePrompt });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Receipt OCR Scanning & Verification Flow', () => {
    it('validates file magic bytes and rejects non-image spoofed payloads', () => {
      const fakePdfAsJpeg = Buffer.from('%PDF-1.4 Fake document pretending to be an image');
      const validation = ReceiptOcrService.validateImageBuffer(fakePdfAsJpeg, 'image/jpeg');

      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('do not match a valid');
    });

    it('rejects files exceeding 5MB size limit', () => {
      const hugeBuffer = Buffer.alloc(6 * 1024 * 1024);
      const validation = ReceiptOcrService.validateImageBuffer(hugeBuffer, 'image/jpeg');

      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('exceeds maximum allowed limit');
    });

    it('recognizes valid image headers (PNG/JPEG)', () => {
      // 1x1 transparent PNG signature
      const validPng = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52
      ]);

      const validation = ReceiptOcrService.validateImageBuffer(validPng, 'image/png');
      expect(validation.isValid).toBe(true);
    });

    it('POST /api/receipts/scan requires auth and returns candidates without creating a transaction', async () => {
      // Valid complete 1x1 transparent PNG image buffer
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      // Count transactions before scanning
      const txnsBefore = await FinancialRepository.listTransactions(userId);

      const res = await request(app)
        .post('/api/receipts/scan')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('receipt', pngBuffer, 'receipt.png');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();

      // VERIFY: OCR scan MUST NOT silently create a financial record!
      const txnsAfter = await FinancialRepository.listTransactions(userId);
      expect(txnsAfter.total).toBe(txnsBefore.total);
    });
  });
});
