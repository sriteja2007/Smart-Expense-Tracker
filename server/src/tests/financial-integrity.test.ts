import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { UserRepository } from '../repositories/user.repository.js';
import { FinancialRepository } from '../repositories/financial.repository.js';
import {
  toMinorUnits,
  fromMinorUnits,
  formatCurrency,
  formatMinorUnits
} from '@lumaspend/shared';

describe('Phase 9 Financial Integrity & Arithmetic Suite', () => {
  const app = createApp();

  let userCookie: string;
  let userId: string;
  let sourceAccountId: string;
  let destAccountId: string;

  const testUser = {
    displayName: 'Priya Finance',
    email: 'priya.finance@example.com',
    password: 'Password123!',
    defaultCurrency: 'INR'
  };

  beforeEach(async () => {
    UserRepository.clearInMemory();
    FinancialRepository.clearInMemory();

    // Register User
    const regRes = await request(app).post('/api/auth/register').send(testUser);
    const cookies = regRes.headers['set-cookie'];
    userCookie = Array.isArray(cookies) ? cookies[0] : (cookies || '');
    userId = regRes.body.data.user.id;

    // Create Source Checking Account (initial: ₹10,000.00 = 1,000,000 paise)
    const acc1 = await request(app)
      .post('/api/accounts')
      .set('Cookie', userCookie)
      .send({
        name: 'HDFC Checking',
        type: 'checking',
        currency: 'INR',
        initialBalanceMinorUnits: 1000000
      });
    sourceAccountId = acc1.body.data.id;

    // Create Destination Savings Account (initial: ₹5,000.00 = 500,000 paise)
    const acc2 = await request(app)
      .post('/api/accounts')
      .set('Cookie', userCookie)
      .send({
        name: 'SBI Savings',
        type: 'savings',
        currency: 'INR',
        initialBalanceMinorUnits: 500000
      });
    destAccountId = acc2.body.data.id;
  });

  // ==========================================
  // 1. Minor-Unit Conventions & Boundary Testing
  // ==========================================
  describe('Minor-Unit Precision & Input Boundaries', () => {
    it('converts decimal amounts to minor units correctly across 2-decimal and 0-decimal currencies', () => {
      // INR (2 decimal digits)
      expect(toMinorUnits(10.5, 'INR')).toBe(1050);
      expect(toMinorUnits(0.01, 'INR')).toBe(1);
      expect(toMinorUnits(99.99, 'INR')).toBe(9999);
      expect(fromMinorUnits(1050, 'INR')).toBe(10.5);

      // USD (2 decimal digits)
      expect(toMinorUnits(250.75, 'USD')).toBe(25075);
      expect(fromMinorUnits(25075, 'USD')).toBe(250.75);

      // JPY (0 decimal digits - no minor subunit)
      expect(toMinorUnits(5000, 'JPY')).toBe(5000);
      expect(fromMinorUnits(5000, 'JPY')).toBe(5000);
    });

    it('formats currencies accurately with appropriate symbols and formatting', () => {
      const inrFormatted = formatCurrency(1250.5, 'INR');
      expect(inrFormatted).toContain('1,250.50');

      const usdFormatted = formatCurrency(50.25, 'USD');
      expect(usdFormatted).toContain('50.25');

      const jpyFormatted = formatMinorUnits(1500, 'JPY');
      expect(jpyFormatted).toContain('1,500');
    });

    it('rejects negative transaction amounts with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Cookie', userCookie)
        .send({
          type: 'expense',
          amountMinorUnits: -5000,
          currency: 'INR',
          sourceAccountId,
          description: 'Invalid Negative Amount',
          dateUtc: new Date().toISOString()
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects zero amount transactions with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Cookie', userCookie)
        .send({
          type: 'expense',
          amountMinorUnits: 0,
          currency: 'INR',
          sourceAccountId,
          description: 'Zero Amount Expense',
          dateUtc: new Date().toISOString()
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects non-integer / floating-point minor units with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Cookie', userCookie)
        .send({
          type: 'expense',
          amountMinorUnits: 1250.75, // Fractional paise is illegal
          currency: 'INR',
          sourceAccountId,
          description: 'Fractional Minor Unit Attempt',
          dateUtc: new Date().toISOString()
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects unsupported currency codes with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Cookie', userCookie)
        .send({
          type: 'expense',
          amountMinorUnits: 5000,
          currency: 'XYZ', // Unknown currency
          sourceAccountId,
          description: 'Invalid Currency',
          dateUtc: new Date().toISOString()
        });

      expect(res.status).toBe(400);
    });
  });

  // ==========================================
  // 2. Transfer Arithmetic & Analytics Isolation
  // ==========================================
  describe('Transfer Arithmetic & Analytics Isolation', () => {
    it('accurately updates account balances on transfer without counting as income or expense', async () => {
      // Transfer ₹2,000.00 (200,000 paise) from source (1,000,000) to dest (500,000)
      const transferRes = await request(app)
        .post('/api/transactions')
        .set('Cookie', userCookie)
        .send({
          type: 'transfer',
          amountMinorUnits: 200000,
          currency: 'INR',
          sourceAccountId,
          destinationAccountId: destAccountId,
          description: 'Savings Transfer',
          dateUtc: new Date().toISOString()
        });

      expect(transferRes.status).toBe(201);

      // Verify Source Account Balance: 1,000,000 - 200,000 = 800,000 paise
      const acc1Res = await request(app)
        .get(`/api/accounts/${sourceAccountId}`)
        .set('Cookie', userCookie);
      expect(acc1Res.body.data.balanceMinorUnits).toBe(800000);

      // Verify Dest Account Balance: 500,000 + 200,000 = 700,000 paise
      const acc2Res = await request(app)
        .get(`/api/accounts/${destAccountId}`)
        .set('Cookie', userCookie);
      expect(acc2Res.body.data.balanceMinorUnits).toBe(700000);

      // Verify Analytics Summary: Transfers MUST NOT be counted as income or expense
      const analyticsRes = await request(app)
        .get('/api/analytics/summary')
        .set('Cookie', userCookie);

      expect(analyticsRes.status).toBe(200);
      expect(analyticsRes.body.data.monthlyIncomeMinorUnits).toBe(0);
      expect(analyticsRes.body.data.monthlyExpenseMinorUnits).toBe(0);
      // Total balance across accounts: 800,000 + 700,000 = 1,500,000 paise
      expect(analyticsRes.body.data.totalBalanceMinorUnits).toBe(1500000);
    });
  });

  // ==========================================
  // 3. Recurring Execution & Idempotency
  // ==========================================
  describe('Recurring Schedule Idempotency & Date Math', () => {
    it('prevents duplicate transactions when recurring processing is triggered multiple times in same cycle', async () => {
      // Create a recurring expense rule due now
      const recurringRes = await request(app)
        .post('/api/recurring')
        .set('Cookie', userCookie)
        .send({
          name: 'Broadband Bill',
          type: 'expense',
          amountMinorUnits: 99900, // ₹999.00
          currency: 'INR',
          sourceAccountId,
          frequency: 'monthly',
          timezone: 'Asia/Kolkata',
          startDateUtc: new Date(Date.now() - 3600000).toISOString(),
          description: 'Internet Connection'
        });

      expect(recurringRes.status).toBe(201);

      // First run: processes 1 transaction
      const run1 = await FinancialRepository.processDueRecurring(userId);
      expect(run1.processedCount).toBe(1);

      // Immediate retry in same cycle: idempotency check must ensure 0 new transactions created
      const run2 = await FinancialRepository.processDueRecurring(userId);
      expect(run2.processedCount).toBe(0);
    });

    it('calculates leap year dates and month transitions correctly', () => {
      // Feb 29 on leap year (2024) -> monthly -> March 29
      const leapStartDate = new Date(Date.UTC(2024, 1, 29)); // 2024-02-29
      const nextMonth = FinancialRepository.calculateNextRunDate(leapStartDate, leapStartDate, 'monthly');

      expect(nextMonth.getUTCFullYear()).toBe(2024);
      expect(nextMonth.getUTCMonth()).toBe(2); // March
      expect(nextMonth.getUTCDate()).toBe(29);
    });
  });

  // ==========================================
  // 4. Savings Goal Progression & Double-Counting Safeguard
  // ==========================================
  describe('Savings Goal Calculations & Double-Counting Safeguard', () => {
    it('prevents manual contributions on linked-account goals to eliminate double-counting', async () => {
      // Goal linked to HDFC Checking
      const goalRes = await request(app)
        .post('/api/goals')
        .set('Cookie', userCookie)
        .send({
          name: 'Home Renovation',
          targetAmountMinorUnits: 5000000,
          currency: 'INR',
          fundingMode: 'linked_account',
          linkedAccountId: sourceAccountId
        });

      expect(goalRes.status).toBe(201);
      const goalId = goalRes.body.data.id;

      // Attempt manual contribution to linked goal -> Rejected with 400
      const contributeRes = await request(app)
        .post(`/api/goals/${goalId}/contribute`)
        .set('Cookie', userCookie)
        .send({
          amountMinorUnits: 50000,
          sourceAccountId: destAccountId
        });

      expect(contributeRes.status).toBe(400);
      expect(contributeRes.body.error.message).toContain('linked account balance');
    });

    it('correctly tracks manual contributions and updates pace on contribution goals', async () => {
      // Goal funded by explicit contributions
      const goalRes = await request(app)
        .post('/api/goals')
        .set('Cookie', userCookie)
        .send({
          name: 'Vacation',
          targetAmountMinorUnits: 100000, // ₹1,000.00
          currency: 'INR',
          fundingMode: 'explicit_contribution',
          targetDateUtc: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });

      const goalId = goalRes.body.data.id;

      // Contribute ₹500.00 (50,000 paise)
      const contributeRes = await request(app)
        .post(`/api/goals/${goalId}/contribute`)
        .set('Cookie', userCookie)
        .send({
          amountMinorUnits: 50000,
          sourceAccountId
        });

      expect(contributeRes.status).toBe(200);
      expect(contributeRes.body.data.currentAmountMinorUnits).toBe(50000);
      expect(contributeRes.body.data.progressPercent).toBe(50);
    });
  });
});
