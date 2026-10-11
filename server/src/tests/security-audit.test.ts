import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { UserRepository } from '../repositories/user.repository.js';
import { FinancialRepository } from '../repositories/financial.repository.js';
import { env } from '../config/env.js';

describe('Phase 9 Security Audit & Vulnerability Suite', () => {
  const app = createApp();

  let user1Cookie: string;
  let user1Id: string;
  let user2Cookie: string;

  const testUser1 = {
    displayName: 'Aarav Mehta',
    email: 'aarav.security@example.com',
    password: 'SecurePassword123!',
    defaultCurrency: 'INR'
  };

  const testUser2 = {
    displayName: 'Diya Patel',
    email: 'diya.security@example.com',
    password: 'SecurePassword123!',
    defaultCurrency: 'INR'
  };

  beforeEach(async () => {
    UserRepository.clearInMemory();
    FinancialRepository.clearInMemory();

    // Register User 1
    const res1 = await request(app).post('/api/auth/register').send(testUser1);
    const cookies1 = res1.headers['set-cookie'];
    user1Cookie = Array.isArray(cookies1) ? cookies1[0] : (cookies1 || '');
    user1Id = res1.body.data.user.id;

    // Register User 2
    const res2 = await request(app).post('/api/auth/register').send(testUser2);
    const cookies2 = res2.headers['set-cookie'];
    user2Cookie = Array.isArray(cookies2) ? cookies2[0] : (cookies2 || '');
  });

  // ==========================================
  // 1. Authentication Bypass & Session Tampering
  // ==========================================
  describe('Authentication Bypass & Session Tampering', () => {
    it('rejects requests with missing session token with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/accounts');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects forged JWT tokens signed with a bogus secret', async () => {
      const forgedToken = jwt.sign(
        { userId: user1Id, email: testUser1.email, role: 'user' },
        'forged_secret_attacker_key_32_chars!'
      );

      const res = await request(app)
        .get('/api/accounts')
        .set('Cookie', `token=${forgedToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects malformed or gibberish session tokens', async () => {
      const res = await request(app)
        .get('/api/accounts')
        .set('Cookie', 'token=not.a.valid.jwt.token');

      expect(res.status).toBe(401);
    });

    it('rejects expired session tokens', async () => {
      const expiredToken = jwt.sign(
        { userId: user1Id, email: testUser1.email, role: 'user', exp: Math.floor(Date.now() / 1000) - 3600 },
        env.JWT_SECRET
      );

      const res = await request(app)
        .get('/api/accounts')
        .set('Cookie', `token=${expiredToken}`);

      expect(res.status).toBe(401);
    });
  });

  // ==========================================
  // 2. Broken Object-Level Authorization (BOLA/IDOR)
  // ==========================================
  describe('Broken Object-Level Authorization (BOLA / IDOR)', () => {
    let user1AccountId: string;
    let user1TxnId: string;
    let user1BudgetId: string;
    let user1GoalId: string;

    beforeEach(async () => {
      // User 1 creates Account
      const accRes = await request(app)
        .post('/api/accounts')
        .set('Cookie', user1Cookie)
        .send({
          name: 'Aarav Vault',
          type: 'savings',
          currency: 'INR',
          initialBalanceMinorUnits: 1000000
        });
      user1AccountId = accRes.body.data.id;

      // User 1 creates Transaction
      const txnRes = await request(app)
        .post('/api/transactions')
        .set('Cookie', user1Cookie)
        .send({
          type: 'expense',
          amountMinorUnits: 25000,
          currency: 'INR',
          sourceAccountId: user1AccountId,
          description: 'Aarav Private Purchase',
          dateUtc: new Date().toISOString()
        });
      user1TxnId = txnRes.body.data.id;

      // User 1 creates Budget
      const bRes = await request(app)
        .post('/api/budgets')
        .set('Cookie', user1Cookie)
        .send({
          periodMonth: new Date().getMonth() + 1,
          periodYear: new Date().getFullYear(),
          limitAmountMinorUnits: 500000,
          currency: 'INR',
          alertThresholdPct: 80
        });
      user1BudgetId = bRes.body.data.id;

      // User 1 creates Goal
      const gRes = await request(app)
        .post('/api/goals')
        .set('Cookie', user1Cookie)
        .send({
          name: 'Aarav Emergency Fund',
          targetAmountMinorUnits: 2000000,
          currency: 'INR',
          fundingMode: 'explicit_contribution'
        });
      user1GoalId = gRes.body.data.id;
    });

    it('prevents User 2 from reading User 1 account details', async () => {
      const res = await request(app)
        .get(`/api/accounts/${user1AccountId}`)
        .set('Cookie', user2Cookie);

      expect(res.status).toBe(404);
    });

    it('prevents User 2 from updating User 1 account', async () => {
      const res = await request(app)
        .patch(`/api/accounts/${user1AccountId}`)
        .set('Cookie', user2Cookie)
        .send({ name: 'Hacked Account Name' });

      expect(res.status).toBe(404);
    });

    it('prevents User 2 from reading User 1 transaction details', async () => {
      const res = await request(app)
        .get(`/api/transactions/${user1TxnId}`)
        .set('Cookie', user2Cookie);

      expect(res.status).toBe(404);
    });

    it('prevents User 2 from updating User 1 transaction', async () => {
      const res = await request(app)
        .patch(`/api/transactions/${user1TxnId}`)
        .set('Cookie', user2Cookie)
        .send({ description: 'Tampered Description' });

      expect(res.status).toBe(404);
    });

    it('prevents User 2 from deleting User 1 transaction', async () => {
      const res = await request(app)
        .delete(`/api/transactions/${user1TxnId}`)
        .set('Cookie', user2Cookie);

      expect(res.status).toBe(404);
    });

    it('strictly blocks cross-user transfer (User 2 cannot transfer from or to User 1 account)', async () => {
      // User 2 creates their own account
      const acc2 = await request(app)
        .post('/api/accounts')
        .set('Cookie', user2Cookie)
        .send({
          name: 'Diya Wallet',
          type: 'checking',
          currency: 'INR',
          initialBalanceMinorUnits: 500000
        });
      const user2AccountId = acc2.body.data.id;

      // User 2 attempts transfer from User 1 account (source hijack)
      const res1 = await request(app)
        .post('/api/transactions')
        .set('Cookie', user2Cookie)
        .send({
          type: 'transfer',
          amountMinorUnits: 50000,
          currency: 'INR',
          sourceAccountId: user1AccountId,
          destinationAccountId: user2AccountId,
          description: 'Theft Attempt',
          dateUtc: new Date().toISOString()
        });
      expect(res1.status).toBe(404);

      // User 2 attempts transfer to User 1 account (unauthorized cross-tenant destination)
      const res2 = await request(app)
        .post('/api/transactions')
        .set('Cookie', user2Cookie)
        .send({
          type: 'transfer',
          amountMinorUnits: 50000,
          currency: 'INR',
          sourceAccountId: user2AccountId,
          destinationAccountId: user1AccountId,
          description: 'Cross-Tenant Push Attempt',
          dateUtc: new Date().toISOString()
        });
      expect(res2.status).toBe(404);
    });

    it('prevents User 2 from updating User 1 budget', async () => {
      const res = await request(app)
        .patch(`/api/budgets/${user1BudgetId}`)
        .set('Cookie', user2Cookie)
        .send({ limitAmountMinorUnits: 100 });

      expect(res.status).toBe(404);
    });

    it('prevents User 2 from contributing to User 1 goal', async () => {
      // User 2 account
      const acc2 = await request(app)
        .post('/api/accounts')
        .set('Cookie', user2Cookie)
        .send({
          name: 'Diya Wallet',
          type: 'checking',
          currency: 'INR',
          initialBalanceMinorUnits: 500000
        });

      const res = await request(app)
        .post(`/api/goals/${user1GoalId}/contribute`)
        .set('Cookie', user2Cookie)
        .send({
          amountMinorUnits: 10000,
          sourceAccountId: acc2.body.data.id
        });

      expect(res.status).toBe(404);
    });
  });

  // ==========================================
  // 3. Regex Injection (ReDoS) Resilience
  // ==========================================
  describe('Regex Injection & ReDoS Protection', () => {
    it('handles search queries with unclosed regex brackets and special characters safely', async () => {
      // Queries with unescaped regex characters: '(', '[', '+', '?', '.*.*.*'
      const queries = ['(', '[a-z', 'test.*+?', '(((', '{10,}', '.*.*.*.*.*'];

      for (const q of queries) {
        const res = await request(app)
          .get(`/api/transactions?search=${encodeURIComponent(q)}`)
          .set('Cookie', user1Cookie);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.transactions)).toBe(true);
      }
    });
  });

  // ==========================================
  // 4. File Upload & Request Validation Security
  // ==========================================
  describe('File Upload & Request Validation', () => {
    it('rejects receipt scan with invalid magic bytes / spoofed MIME type', async () => {
      const fakeBuffer = Buffer.from('FAKE_SHELL_SCRIPT_DATA_MALICIOUS');

      const res = await request(app)
        .post('/api/receipts/scan')
        .set('Cookie', user1Cookie)
        .attach('receipt', fakeBuffer, { filename: 'exploit.png', contentType: 'image/png' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects oversized receipt images exceeding 5MB', async () => {
      const oversizedBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB

      const res = await request(app)
        .post('/api/receipts/scan')
        .set('Cookie', user1Cookie)
        .attach('receipt', oversizedBuffer, { filename: 'huge.png', contentType: 'image/png' });

      // Multer limits file size
      expect([400, 500]).toContain(res.status);
    });
  });

  // ==========================================
  // 5. Sensitive Data & Error Sanitization
  // ==========================================
  describe('Sensitive Data & Error Sanitization', () => {
    it('does not leak internal stack traces on 404 or validation errors in production', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'wrong' });

      expect(res.status).toBe(401);
      expect(res.body.error).not.toHaveProperty('stack');
    });

    it('does not reveal password hash in user registration or profile responses', async () => {
      const res = await request(app)
        .get('/api/profile')
        .set('Cookie', user1Cookie);

      expect(res.status).toBe(200);
      expect(res.body.data).not.toHaveProperty('password');
      expect(res.body.data).not.toHaveProperty('passwordHash');
    });
  });
});
