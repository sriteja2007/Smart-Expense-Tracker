import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { UserRepository } from '../repositories/user.repository.js';
import { FinancialRepository } from '../repositories/financial.repository.js';

describe('Financial Domain Models, REST APIs & Multi-Tenant Isolation Suite', () => {
  const app = createApp();

  beforeEach(() => {
    UserRepository.clearInMemory();
    FinancialRepository.clearInMemory();
  });

  // Helper to register and obtain cookie session for a user
  async function createSession(email: string, displayName: string) {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        displayName,
        email,
        password: 'Password123!',
        defaultCurrency: 'INR'
      });
    const cookies: string[] = (res.headers['set-cookie'] as unknown as string[]) || [];
    return {
      user: res.body.data.user,
      cookies
    };
  }

  // ==========================================
  // OpenAPI Documentation
  // ==========================================
  it('GET /api/docs should return OpenAPI 3.0 specification with financial endpoints', async () => {
    const res = await request(app).get('/api/docs');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.info.title).toContain('LumaSpend');
    expect(res.body.paths).toHaveProperty('/api/accounts');
    expect(res.body.paths).toHaveProperty('/api/transactions');
    expect(res.body.paths).toHaveProperty('/api/budgets');
  });

  // ==========================================
  // Minor-Unit Precision & Balance Adjustments
  // ==========================================
  it('should store and compute balances exclusively in integer minor units (paise)', async () => {
    const { cookies } = await createSession('aarav@example.com', 'Aarav');

    // 1. Create account with 100,000 paise (₹1,000.00)
    const createAccRes = await request(app)
      .post('/api/accounts')
      .set('Cookie', cookies)
      .send({
        name: 'HDFC Salary Account',
        type: 'savings',
        currency: 'INR',
        initialBalanceMinorUnits: 100000,
        institutionName: 'HDFC Bank'
      });

    expect(createAccRes.status).toBe(201);
    const accountId = createAccRes.body.data.id;
    expect(createAccRes.body.data.balanceMinorUnits).toBe(100000);

    // 2. Add an expense of 25,000 paise (₹250.00)
    const expenseRes = await request(app)
      .post('/api/transactions')
      .set('Cookie', cookies)
      .send({
        type: 'expense',
        amountMinorUnits: 25000,
        sourceAccountId: accountId,
        categoryId: 'sys-cat-2', // Groceries
        description: 'Supermarket Groceries',
        merchantName: 'Nature Basket'
      });

    expect(expenseRes.status).toBe(201);
    expect(expenseRes.body.data.amountMinorUnits).toBe(25000);

    // Verify account balance dropped to 75,000 paise
    const accAfterExpense = await request(app)
      .get(`/api/accounts/${accountId}`)
      .set('Cookie', cookies);
    expect(accAfterExpense.body.data.balanceMinorUnits).toBe(75000);

    // 3. Add income of 50,000 paise (₹500.00)
    const incomeRes = await request(app)
      .post('/api/transactions')
      .set('Cookie', cookies)
      .send({
        type: 'income',
        amountMinorUnits: 50000,
        sourceAccountId: accountId,
        categoryId: 'sys-cat-12', // Freelance
        description: 'Design Consulting'
      });

    expect(incomeRes.status).toBe(201);

    // Verify account balance increased to 125,000 paise
    const accAfterIncome = await request(app)
      .get(`/api/accounts/${accountId}`)
      .set('Cookie', cookies);
    expect(accAfterIncome.body.data.balanceMinorUnits).toBe(125000);
  });

  // ==========================================
  // Atomic Account Transfers
  // ==========================================
  it('should execute atomic transfers between accounts and reverse cleanly on delete', async () => {
    const { cookies } = await createSession('riya@example.com', 'Riya');

    // Create Account A: 100,000 paise
    const accARes = await request(app)
      .post('/api/accounts')
      .set('Cookie', cookies)
      .send({
        name: 'Checking Account',
        type: 'checking',
        initialBalanceMinorUnits: 100000
      });
    const accAId = accARes.body.data.id;

    // Create Account B: 50,000 paise
    const accBRes = await request(app)
      .post('/api/accounts')
      .set('Cookie', cookies)
      .send({
        name: 'UPI Wallet',
        type: 'upi_wallet',
        initialBalanceMinorUnits: 50000
      });
    const accBId = accBRes.body.data.id;

    // Transfer 30,000 paise from Account A to Account B
    const transferRes = await request(app)
      .post('/api/transactions')
      .set('Cookie', cookies)
      .send({
        type: 'transfer',
        amountMinorUnits: 30000,
        sourceAccountId: accAId,
        destinationAccountId: accBId,
        description: 'Wallet top-up'
      });

    expect(transferRes.status).toBe(201);
    const txnId = transferRes.body.data.id;

    // Check balances: Account A should be 70,000, Account B should be 80,000
    const aCheck = await request(app).get(`/api/accounts/${accAId}`).set('Cookie', cookies);
    const bCheck = await request(app).get(`/api/accounts/${accBId}`).set('Cookie', cookies);
    expect(aCheck.body.data.balanceMinorUnits).toBe(70000);
    expect(bCheck.body.data.balanceMinorUnits).toBe(80000);

    // Delete transaction: balance reversal
    const deleteRes = await request(app)
      .delete(`/api/transactions/${txnId}`)
      .set('Cookie', cookies);
    expect(deleteRes.status).toBe(200);

    // Check reverted balances: Account A returns to 100,000, Account B returns to 50,000
    const aRevert = await request(app).get(`/api/accounts/${accAId}`).set('Cookie', cookies);
    const bRevert = await request(app).get(`/api/accounts/${accBId}`).set('Cookie', cookies);
    expect(aRevert.body.data.balanceMinorUnits).toBe(100000);
    expect(bRevert.body.data.balanceMinorUnits).toBe(50000);
  });

  // ==========================================
  // Strict Multi-Tenant Isolation
  // ==========================================
  it('should enforce strict multi-tenant isolation: User B cannot access User A data', async () => {
    const userA = await createSession('userA@example.com', 'User A');
    const userB = await createSession('userB@example.com', 'User B');

    // User A creates an account and transaction
    const accRes = await request(app)
      .post('/api/accounts')
      .set('Cookie', userA.cookies)
      .send({
        name: 'Secret Savings',
        type: 'savings',
        initialBalanceMinorUnits: 500000
      });
    const accountAId = accRes.body.data.id;

    const txnRes = await request(app)
      .post('/api/transactions')
      .set('Cookie', userA.cookies)
      .send({
        type: 'expense',
        amountMinorUnits: 15000,
        sourceAccountId: accountAId,
        description: 'Confidential Payment'
      });
    const transactionAId = txnRes.body.data.id;

    // 1. User B attempts to read User A account -> 404
    const getAccRes = await request(app)
      .get(`/api/accounts/${accountAId}`)
      .set('Cookie', userB.cookies);
    expect(getAccRes.status).toBe(404);

    // 2. User B attempts to modify User A account -> 404
    const patchAccRes = await request(app)
      .patch(`/api/accounts/${accountAId}`)
      .set('Cookie', userB.cookies)
      .send({ name: 'Hacked Name' });
    expect(patchAccRes.status).toBe(404);

    // 3. User B attempts to delete User A account -> 404
    const deleteAccRes = await request(app)
      .delete(`/api/accounts/${accountAId}`)
      .set('Cookie', userB.cookies);
    expect(deleteAccRes.status).toBe(404);

    // 4. User B attempts to read User A transaction -> 404
    const getTxnRes = await request(app)
      .get(`/api/transactions/${transactionAId}`)
      .set('Cookie', userB.cookies);
    expect(getTxnRes.status).toBe(404);

    // 5. User B listing accounts must not contain User A account
    const listAccRes = await request(app)
      .get('/api/accounts')
      .set('Cookie', userB.cookies);
    expect(listAccRes.body.data.length).toBe(0);

    // 6. User B listing transactions must not contain User A transaction
    const listTxnRes = await request(app)
      .get('/api/transactions')
      .set('Cookie', userB.cookies);
    expect(listTxnRes.body.data ? listTxnRes.body.data.length : listTxnRes.body.transactions.length).toBe(0);
  });

  // ==========================================
  // Input Validation & Malformed Payloads
  // ==========================================
  it('should reject invalid or negative amounts with 400 Validation Error', async () => {
    const { cookies } = await createSession('valid@example.com', 'Valid User');

    const accRes = await request(app)
      .post('/api/accounts')
      .set('Cookie', cookies)
      .send({
        name: 'Primary Checking',
        type: 'checking',
        initialBalanceMinorUnits: 20000
      });
    const accountId = accRes.body.data.id;

    // Negative amount
    const negRes = await request(app)
      .post('/api/transactions')
      .set('Cookie', cookies)
      .send({
        type: 'expense',
        amountMinorUnits: -500,
        sourceAccountId: accountId,
        description: 'Negative test'
      });
    expect(negRes.status).toBe(400);

    // Transfer without destination account
    const transferMissingDest = await request(app)
      .post('/api/transactions')
      .set('Cookie', cookies)
      .send({
        type: 'transfer',
        amountMinorUnits: 1000,
        sourceAccountId: accountId,
        description: 'Incomplete transfer'
      });
    expect(transferMissingDest.status).toBe(400);
  });

  // ==========================================
  // Budgets & Category Spending Calculation
  // ==========================================
  it('should calculate budget spending accurately based on monthly transactions', async () => {
    const { cookies } = await createSession('budget@example.com', 'Budget Tester');

    // 1. Create account
    const acc = await request(app)
      .post('/api/accounts')
      .set('Cookie', cookies)
      .send({ name: 'Bank', type: 'checking', initialBalanceMinorUnits: 500000 });
    const accId = acc.body.data.id;

    // 2. Create budget for Groceries (sys-cat-2) of 50,000 paise for current month
    const now = new Date();
    const month = now.getUTCMonth() + 1;
    const year = now.getUTCFullYear();

    const budgetRes = await request(app)
      .post('/api/budgets')
      .set('Cookie', cookies)
      .send({
        categoryId: 'sys-cat-2',
        periodMonth: month,
        periodYear: year,
        limitAmountMinorUnits: 50000,
        alertThresholdPct: 80
      });
    expect(budgetRes.status).toBe(201);

    // 3. Record an expense in Groceries of 20,000 paise
    await request(app)
      .post('/api/transactions')
      .set('Cookie', cookies)
      .send({
        type: 'expense',
        amountMinorUnits: 20000,
        sourceAccountId: accId,
        categoryId: 'sys-cat-2',
        description: 'Weekly grocery run'
      });

    // 4. Query budgets: spentAmountMinorUnits should be 20,000
    const listBudgets = await request(app)
      .get(`/api/budgets?month=${month}&year=${year}`)
      .set('Cookie', cookies);

    expect(listBudgets.status).toBe(200);
    expect(listBudgets.body.data.length).toBe(1);
    expect(listBudgets.body.data[0].spentAmountMinorUnits).toBe(20000);
    expect(listBudgets.body.data[0].limitAmountMinorUnits).toBe(50000);
  });

  // ==========================================
  // Savings Goals & Contributions
  // ==========================================
  it('should track savings goals and deduct contributions from source account', async () => {
    const { cookies } = await createSession('goals@example.com', 'Goal Setter');

    // Create Account: 100,000 paise
    const acc = await request(app)
      .post('/api/accounts')
      .set('Cookie', cookies)
      .send({ name: 'Salary', type: 'savings', initialBalanceMinorUnits: 100000 });
    const accId = acc.body.data.id;

    // Create Goal: 200,000 paise target
    const goalRes = await request(app)
      .post('/api/goals')
      .set('Cookie', cookies)
      .send({
        name: 'Emergency Fund',
        targetAmountMinorUnits: 200000
      });
    expect(goalRes.status).toBe(201);
    const goalId = goalRes.body.data.id;
    expect(goalRes.body.data.currentAmountMinorUnits).toBe(0);

    // Contribute 50,000 paise to goal from account
    const contributeRes = await request(app)
      .post(`/api/goals/${goalId}/contribute`)
      .set('Cookie', cookies)
      .send({
        amountMinorUnits: 50000,
        sourceAccountId: accId
      });

    expect(contributeRes.status).toBe(200);
    expect(contributeRes.body.data.currentAmountMinorUnits).toBe(50000);

    // Check account balance: reduced by 50,000 to 50,000 paise
    const accCheck = await request(app).get(`/api/accounts/${accId}`).set('Cookie', cookies);
    expect(accCheck.body.data.balanceMinorUnits).toBe(50000);
  });

  // ==========================================
  // Household RBAC & Member Invitation
  // ==========================================
  it('should manage shared households and restrict access to members only', async () => {
    const owner = await createSession('owner@example.com', 'Owner');
    const member = await createSession('member@example.com', 'Member');
    const outsider = await createSession('outsider@example.com', 'Outsider');

    // Owner creates a household
    const hhRes = await request(app)
      .post('/api/households')
      .set('Cookie', owner.cookies)
      .send({ name: 'Sharma Household' });
    expect(hhRes.status).toBe(201);
    const hhId = hhRes.body.data.id;

    // Owner invites member
    const inviteRes = await request(app)
      .post(`/api/households/${hhId}/invite`)
      .set('Cookie', owner.cookies)
      .send({
        email: 'member@example.com',
        role: 'member'
      });
    expect(inviteRes.status).toBe(200);
    expect(inviteRes.body.data.members.length).toBe(2);

    // Invited member can now access household
    const memberView = await request(app)
      .get(`/api/households/${hhId}`)
      .set('Cookie', member.cookies);
    expect(memberView.status).toBe(200);
    expect(memberView.body.data.name).toBe('Sharma Household');

    // Outsider cannot access household -> 404
    const outsiderView = await request(app)
      .get(`/api/households/${hhId}`)
      .set('Cookie', outsider.cookies);
    expect(outsiderView.status).toBe(404);
  });

  // ==========================================
  // Analytics & CSV Export
  // ==========================================
  it('GET /api/analytics/summary and GET /api/reports/export-csv should format data properly', async () => {
    const { cookies } = await createSession('reports@example.com', 'Reporter');

    const acc = await request(app)
      .post('/api/accounts')
      .set('Cookie', cookies)
      .send({ name: 'Main', type: 'checking', initialBalanceMinorUnits: 250000 });

    await request(app)
      .post('/api/transactions')
      .set('Cookie', cookies)
      .send({
        type: 'income',
        amountMinorUnits: 80000,
        sourceAccountId: acc.body.data.id,
        description: 'Consulting Retainer'
      });

    await request(app)
      .post('/api/transactions')
      .set('Cookie', cookies)
      .send({
        type: 'expense',
        amountMinorUnits: 30000,
        sourceAccountId: acc.body.data.id,
        description: 'Office Supplies'
      });

    // Analytics summary
    const summaryRes = await request(app)
      .get('/api/analytics/summary')
      .set('Cookie', cookies);
    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.data.monthlyIncomeMinorUnits).toBe(80000);
    expect(summaryRes.body.data.monthlyExpenseMinorUnits).toBe(30000);
    expect(summaryRes.body.data.netSavingsMinorUnits).toBe(50000);

    // CSV export
    const csvRes = await request(app)
      .get('/api/reports/export-csv')
      .set('Cookie', cookies);
    expect(csvRes.status).toBe(200);
    expect(csvRes.headers['content-type']).toContain('text/csv');
    expect(csvRes.text).toContain('Date,Type,Description,Merchant,Notes,Amount,Currency');
    expect(csvRes.text).toContain('Consulting Retainer');
    expect(csvRes.text).toContain('Office Supplies');
  });

  // ==========================================
  // Transaction Editing & Balance Recalculation
  // ==========================================
  it('PATCH /api/transactions/:id should update transaction and properly adjust account balances', async () => {
    const { cookies } = await createSession('edit@example.com', 'Editor');

    // Create Account: 100,000 paise
    const acc = await request(app)
      .post('/api/accounts')
      .set('Cookie', cookies)
      .send({ name: 'Checking', type: 'checking', initialBalanceMinorUnits: 100000 });
    const accId = acc.body.data.id;

    // Create initial expense of 20,000 paise -> balance should be 80,000
    const tx = await request(app)
      .post('/api/transactions')
      .set('Cookie', cookies)
      .send({
        type: 'expense',
        amountMinorUnits: 20000,
        sourceAccountId: accId,
        description: 'Dinner'
      });
    const txId = tx.body.data.id;

    const check1 = await request(app).get(`/api/accounts/${accId}`).set('Cookie', cookies);
    expect(check1.body.data.balanceMinorUnits).toBe(80000);

    // Edit transaction: increase expense to 35,000 paise (additional 15,000 deduction)
    const patchRes = await request(app)
      .patch(`/api/transactions/${txId}`)
      .set('Cookie', cookies)
      .send({
        amountMinorUnits: 35000,
        description: 'Dinner with colleagues',
        notes: 'Tax invoice saved'
      });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.amountMinorUnits).toBe(35000);
    expect(patchRes.body.data.notes).toBe('Tax invoice saved');

    // Account balance should now be 65,000 paise (100,000 - 35,000)
    const check2 = await request(app).get(`/api/accounts/${accId}`).set('Cookie', cookies);
    expect(check2.body.data.balanceMinorUnits).toBe(65000);
  });

  // ==========================================
  // Prevent Unauthorized Cross-Account Transfers
  // ==========================================
  it('should prevent transfers to accounts owned by other users', async () => {
    const userA = await createSession('usera-trans@example.com', 'User A');
    const userB = await createSession('userb-trans@example.com', 'User B');

    // User A account
    const accA = await request(app)
      .post('/api/accounts')
      .set('Cookie', userA.cookies)
      .send({ name: 'A Account', type: 'checking', initialBalanceMinorUnits: 50000 });
    const accAId = accA.body.data.id;

    // User B account
    const accB = await request(app)
      .post('/api/accounts')
      .set('Cookie', userB.cookies)
      .send({ name: 'B Account', type: 'checking', initialBalanceMinorUnits: 50000 });
    const accBId = accB.body.data.id;

    // User A attempts to transfer to User B's account -> 404 (or access denied)
    const transferRes = await request(app)
      .post('/api/transactions')
      .set('Cookie', userA.cookies)
      .send({
        type: 'transfer',
        amountMinorUnits: 10000,
        sourceAccountId: accAId,
        destinationAccountId: accBId,
        description: 'Unauthorized transfer'
      });
    expect(transferRes.status).toBe(404);

    // Ensure User A balance was NOT modified
    const accACheck = await request(app).get(`/api/accounts/${accAId}`).set('Cookie', userA.cookies);
    expect(accACheck.body.data.balanceMinorUnits).toBe(50000);
  });

  // ==========================================
  // Category Deletion Protection
  // ==========================================
  it('should prevent deleting custom categories that have existing transactions', async () => {
    const { cookies } = await createSession('cat-protect@example.com', 'Category Tester');

    // Create custom category
    const catRes = await request(app)
      .post('/api/categories')
      .set('Cookie', cookies)
      .send({ name: 'Freelance Design', type: 'income', icon: 'Brush', color: '#EC4899' });
    expect(catRes.status).toBe(201);
    const catId = catRes.body.data.id;

    // Create account
    const acc = await request(app)
      .post('/api/accounts')
      .set('Cookie', cookies)
      .send({ name: 'Bank', type: 'checking', initialBalanceMinorUnits: 10000 });

    // Create transaction using this category
    await request(app)
      .post('/api/transactions')
      .set('Cookie', cookies)
      .send({
        type: 'income',
        amountMinorUnits: 25000,
        sourceAccountId: acc.body.data.id,
        categoryId: catId,
        description: 'Logo Design Project'
      });

    // Attempting to delete category should fail with 409 Conflict
    const delRes = await request(app)
      .delete(`/api/categories/${catId}`)
      .set('Cookie', cookies);
    expect(delRes.status).toBe(409);
    expect(delRes.body.error.message).toContain('existing transactions reference this category');
  });

  // ==========================================
  // CSV Import Validation & Duplicate Detection
  // ==========================================
  it('should preview and import CSV files safely with duplicate warnings and error detection', async () => {
    const { cookies } = await createSession('csv-tester@example.com', 'CSV Tester');

    // Create default account
    const acc = await request(app)
      .post('/api/accounts')
      .set('Cookie', cookies)
      .send({ name: 'HDFC', type: 'checking', initialBalanceMinorUnits: 50000 });
    const accId = acc.body.data.id;

    // Pre-seed an existing transaction to test duplicate detection
    await request(app)
      .post('/api/transactions')
      .set('Cookie', cookies)
      .send({
        type: 'expense',
        amountMinorUnits: 15000, // ₹150.00
        sourceAccountId: accId,
        description: 'Zepto Groceries',
        dateUtc: '2026-10-01T12:00:00.000Z'
      });

    // Prepare CSV with:
    // Row 1: Valid new transaction
    // Row 2: Duplicate transaction (same date, amount, description)
    // Row 3: Invalid row (negative amount)
    // Row 4: Invalid row (empty description)
    const csvContent = [
      'Date,Type,Description,Amount,Category,Notes',
      '2026-10-02,expense,"Coffee Shop",350.50,Dining,"Espresso & croissant"',
      '2026-10-01,expense,"Zepto Groceries",150.00,Groceries,"Duplicate item"',
      '2026-10-03,expense,"Broken Row",-200,Dining,"Bad amount"',
      '2026-10-04,income,"",500,Salary,"Missing description"'
    ].join('\n');

    // 1. Preview CSV
    const previewRes = await request(app)
      .post('/api/transactions/import/preview')
      .set('Cookie', cookies)
      .send({
        csvContent,
        defaultAccountId: accId
      });

    expect(previewRes.status).toBe(200);
    const preview = previewRes.body.data;
    expect(preview.totalRows).toBe(4);
    expect(preview.validCount).toBe(2); // Rows 1 & 2
    expect(preview.invalidCount).toBe(2); // Rows 3 & 4
    expect(preview.duplicateCount).toBe(1); // Row 2 matches pre-seeded transaction

    // Verify Row 1
    expect(preview.rows[0].isValid).toBe(true);
    expect(preview.rows[0].amountMinorUnits).toBe(35050); // ₹350.50 -> 35050 paise
    expect(preview.rows[0].isDuplicate).toBe(false);

    // Verify Row 2 (Duplicate detected)
    expect(preview.rows[1].isValid).toBe(true);
    expect(preview.rows[1].isDuplicate).toBe(true);
    expect(preview.rows[1].duplicateReason).toContain('Matches existing transaction');

    // Verify Rows 3 & 4 (Errors captured)
    expect(preview.rows[2].isValid).toBe(false);
    expect(preview.rows[2].errors.length).toBeGreaterThan(0);
    expect(preview.rows[3].isValid).toBe(false);

    // 2. Confirm import with approved valid row (Row 1)
    const validRow = preview.rows[0];
    const confirmRes = await request(app)
      .post('/api/transactions/import/confirm')
      .set('Cookie', cookies)
      .send({
        rows: [
          {
            dateUtc: validRow.dateUtc,
            type: validRow.type,
            amountMinorUnits: validRow.amountMinorUnits,
            sourceAccountId: accId,
            description: validRow.description,
            notes: validRow.notes,
            paymentMethod: 'upi',
            tags: ['csv-import']
          }
        ]
      });

    expect(confirmRes.status).toBe(201);
    expect(confirmRes.body.data.importedCount).toBe(1);

    // Account balance should have deducted 35,050 paise
    const accCheck = await request(app).get(`/api/accounts/${accId}`).set('Cookie', cookies);
    expect(accCheck.body.data.balanceMinorUnits).toBe(50000 - 15000 - 35050);
  });

  // ==========================================
  // Recurring Schedules Across Boundaries & Idempotency
  // ==========================================
  it('should process recurring schedules across month-end, leap years, and remain idempotent', async () => {
    const { cookies } = await createSession('recurring-math@example.com', 'Recurring Tester');

    const acc = await request(app)
      .post('/api/accounts')
      .set('Cookie', cookies)
      .send({ name: 'Operating Account', type: 'checking', initialBalanceMinorUnits: 200000 });
    const accId = acc.body.data.id;

    // Test 1: Month-end date math (Jan 31 -> Feb 28 on non-leap, or Feb 29 on leap year)
    const jan31 = new Date(Date.UTC(2025, 0, 31)); // Jan 31, 2025 (non-leap)
    const nextAfterJan31 = FinancialRepository.calculateNextRunDate(jan31, jan31, 'monthly');
    expect(nextAfterJan31.getUTCFullYear()).toBe(2025);
    expect(nextAfterJan31.getUTCMonth()).toBe(1); // February
    expect(nextAfterJan31.getUTCDate()).toBe(28); // Clamped to Feb 28

    // Test 2: Leap year date math (Feb 29, 2024 -> Feb 28, 2025 -> Feb 29, 2028)
    const feb29Leap = new Date(Date.UTC(2024, 1, 29)); // Feb 29, 2024 (leap year)
    const next2025 = FinancialRepository.calculateNextRunDate(feb29Leap, feb29Leap, 'yearly');
    expect(next2025.getUTCFullYear()).toBe(2025);
    expect(next2025.getUTCMonth()).toBe(1);
    expect(next2025.getUTCDate()).toBe(28); // Clamped to Feb 28 on non-leap year

    // Test 3: Idempotent execution of process-due
    // Create recurring rule that is due in the past
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const createRecRes = await request(app)
      .post('/api/recurring')
      .set('Cookie', cookies)
      .send({
        type: 'expense',
        amountMinorUnits: 12000,
        sourceAccountId: accId,
        description: 'Netflix Premium 4K',
        frequency: 'monthly',
        startDateUtc: pastDate
      });
    expect(createRecRes.status).toBe(201);
    const ruleId = createRecRes.body.data.id;

    // Trigger process-due first time: creates 1 transaction
    const process1 = await request(app)
      .post('/api/recurring/process-due')
      .set('Cookie', cookies);
    expect(process1.status).toBe(200);
    expect(process1.body.data.processedCount).toBe(1);

    // Trigger process-due second time immediately: must NOT create duplicate transactions
    const process2 = await request(app)
      .post('/api/recurring/process-due')
      .set('Cookie', cookies);
    expect(process2.status).toBe(200);
    expect(process2.body.data.processedCount).toBe(0); // Idempotent: 0 duplicates

    // Test 4: Pause/resume toggle
    const pauseRes = await request(app)
      .patch(`/api/recurring/${ruleId}`)
      .set('Cookie', cookies)
      .send({ isActive: false });
    expect(pauseRes.status).toBe(200);
    expect(pauseRes.body.data.isActive).toBe(false);
  });
});

