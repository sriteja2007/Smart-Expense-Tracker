import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { UserRepository } from '../repositories/user.repository.js';
import { FinancialRepository } from '../repositories/financial.repository.js';

describe('Phase 8: Notifications, Shared Households & Data Lifecycle Suite', () => {
  const app = createApp();

  let user1Cookie: string;
  let user2Cookie: string;
  let user2Id: string;

  const user1 = {
    displayName: 'Priya Sharma',
    email: 'priya@example.com',
    password: 'Password123!',
    defaultCurrency: 'INR'
  };

  const user2 = {
    displayName: 'Rohan Verma',
    email: 'rohan@example.com',
    password: 'Password123!',
    defaultCurrency: 'INR'
  };

  beforeEach(async () => {
    UserRepository.clearInMemory();
    FinancialRepository.clearInMemory();

    // Register User 1
    const res1 = await request(app).post('/api/auth/register').send(user1);
    const cookies1 = res1.headers['set-cookie'];
    user1Cookie = Array.isArray(cookies1) ? cookies1[0] : (cookies1 || '');

    // Register User 2
    const res2 = await request(app).post('/api/auth/register').send(user2);
    const cookies2 = res2.headers['set-cookie'];
    user2Cookie = Array.isArray(cookies2) ? cookies2[0] : (cookies2 || '');
    user2Id = res2.body.data.user.id;
  });

  // ==========================================
  // 1. Shared Household Budgets & Invitations
  // ==========================================
  describe('Household Budgets & Single-Use Expiring Invitations', () => {
    it('should create household, generate single-use invite token, and accept with role', async () => {
      // 1. User 1 creates shared household space
      const hhRes = await request(app)
        .post('/api/households')
        .set('Cookie', user1Cookie)
        .send({ name: 'Sharma Household', currency: 'INR' });

      expect(hhRes.status).toBe(201);
      expect(hhRes.body.data.name).toBe('Sharma Household');
      const householdId = hhRes.body.data.id;

      // 2. User 1 generates invite token for User 2 with 'editor' role
      const invRes = await request(app)
        .post(`/api/households/${householdId}/invitations`)
        .set('Cookie', user1Cookie)
        .send({ email: user2.email, role: 'editor' });

      expect(invRes.status).toBe(201);
      expect(invRes.body.data.token).toBeDefined();
      expect(invRes.body.data.status).toBe('pending');
      expect(invRes.body.inviteLink).toContain(invRes.body.data.token);
      const token = invRes.body.data.token;

      // 3. User 2 should have received an in-app notification
      const notifsRes = await request(app)
        .get('/api/notifications')
        .set('Cookie', user2Cookie);
      expect(notifsRes.status).toBe(200);
      expect(notifsRes.body.data.some((n: any) => n.type === 'household_invite')).toBe(true);

      // 4. User 2 accepts invitation
      const acceptRes = await request(app)
        .post('/api/households/invitations/accept')
        .set('Cookie', user2Cookie)
        .send({ token });

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.data.members.some((m: any) => m.userId === user2Id && m.role === 'editor')).toBe(true);

      // 5. Trying to accept again fails (single-use enforced)
      const reacceptRes = await request(app)
        .post('/api/households/invitations/accept')
        .set('Cookie', user2Cookie)
        .send({ token });
      expect(reacceptRes.status).toBe(400);
    });

    it('should reject invitation acceptance if email does not match recipient', async () => {
      const hhRes = await request(app)
        .post('/api/households')
        .set('Cookie', user1Cookie)
        .send({ name: 'Private Space', currency: 'INR' });
      const householdId = hhRes.body.data.id;

      // Issued for different email
      const invRes = await request(app)
        .post(`/api/households/${householdId}/invitations`)
        .set('Cookie', user1Cookie)
        .send({ email: 'other@example.com', role: 'viewer' });

      const token = invRes.body.data.token;

      // User 2 attempts to claim
      const acceptRes = await request(app)
        .post('/api/households/invitations/accept')
        .set('Cookie', user2Cookie)
        .send({ token });

      expect(acceptRes.status).toBe(403);
    });

    it('should allow owner to revoke invitation token before it is claimed', async () => {
      const hhRes = await request(app)
        .post('/api/households')
        .set('Cookie', user1Cookie)
        .send({ name: 'Revoke Test', currency: 'INR' });
      const householdId = hhRes.body.data.id;

      const invRes = await request(app)
        .post(`/api/households/${householdId}/invitations`)
        .set('Cookie', user1Cookie)
        .send({ email: user2.email, role: 'viewer' });

      const inviteId = invRes.body.data.id;
      const token = invRes.body.data.token;

      // Revoke
      const revokeRes = await request(app)
        .delete(`/api/households/${householdId}/invitations/${inviteId}`)
        .set('Cookie', user1Cookie);
      expect(revokeRes.status).toBe(200);

      // Acceptance must now fail
      const acceptRes = await request(app)
        .post('/api/households/invitations/accept')
        .set('Cookie', user2Cookie)
        .send({ token });
      expect(acceptRes.status).toBe(403);
    });

    it('should enforce role permissions: editor can create tx; viewer is forbidden', async () => {
      const hhRes = await request(app)
        .post('/api/households')
        .set('Cookie', user1Cookie)
        .send({ name: 'Role Test', currency: 'INR' });
      const householdId = hhRes.body.data.id;

      // Invite user 2 as viewer
      const invRes = await request(app)
        .post(`/api/households/${householdId}/invitations`)
        .set('Cookie', user1Cookie)
        .send({ email: user2.email, role: 'viewer' });
      await request(app)
        .post('/api/households/invitations/accept')
        .set('Cookie', user2Cookie)
        .send({ token: invRes.body.data.token });

      // Create an account for user 2
      const accRes = await request(app)
        .post('/api/accounts')
        .set('Cookie', user2Cookie)
        .send({ name: 'Rohan Wallet', type: 'checking', currency: 'INR', initialBalanceMinorUnits: 500000 });
      const accountId = accRes.body.data.id;

      // User 2 as viewer attempts to create transaction in household -> Forbidden (403)
      const txFail = await request(app)
        .post('/api/transactions')
        .set('Cookie', user2Cookie)
        .send({
          type: 'expense',
          amountMinorUnits: 15000,
          currency: 'INR',
          sourceAccountId: accountId,
          description: 'Viewer grocery attempt',
          dateUtc: new Date().toISOString(),
          householdId
        });
      expect(txFail.status).toBe(403);

      // Owner upgrades User 2 role to editor
      const upgradeRes = await request(app)
        .patch(`/api/households/${householdId}/members/${user2Id}/role`)
        .set('Cookie', user1Cookie)
        .send({ role: 'editor' });
      expect(upgradeRes.status).toBe(200);

      // Now User 2 as editor creates transaction in household -> Success (201)
      const txSuccess = await request(app)
        .post('/api/transactions')
        .set('Cookie', user2Cookie)
        .send({
          type: 'expense',
          amountMinorUnits: 15000,
          currency: 'INR',
          sourceAccountId: accountId,
          description: 'Editor grocery purchase',
          dateUtc: new Date().toISOString(),
          householdId
        });
      expect(txSuccess.status).toBe(201);
    });

    it('should maintain strict privacy separation between personal and shared data', async () => {
      // User 1 creates personal account & personal transaction
      const acc1 = await request(app)
        .post('/api/accounts')
        .set('Cookie', user1Cookie)
        .send({ name: 'Personal Cash', type: 'cash', currency: 'INR', initialBalanceMinorUnits: 100000 });
      await request(app)
        .post('/api/transactions')
        .set('Cookie', user1Cookie)
        .send({
          type: 'expense',
          amountMinorUnits: 25000,
          currency: 'INR',
          sourceAccountId: acc1.body.data.id,
          description: 'Secret Personal Coffee',
          dateUtc: new Date().toISOString()
        });

      // User 1 creates household
      const hh = await request(app)
        .post('/api/households')
        .set('Cookie', user1Cookie)
        .send({ name: 'Shared Home', currency: 'INR' });

      // User 1 personal list must NOT include any householdId filter
      const personalList = await request(app)
        .get('/api/transactions')
        .set('Cookie', user1Cookie);
      const personalTxns = personalList.body.transactions || personalList.body.data?.transactions;
      expect(personalTxns.length).toBe(1);
      expect(personalTxns[0].description).toBe('Secret Personal Coffee');

      // Household list is currently empty
      const sharedList = await request(app)
        .get(`/api/transactions?householdId=${hh.body.data.id}`)
        .set('Cookie', user1Cookie);
      const sharedTxns = sharedList.body.transactions || sharedList.body.data?.transactions;
      expect(sharedTxns.length).toBe(0);
    });
  });

  // ==========================================
  // 2. Notifications & Idempotent Periodic Alerts
  // ==========================================
  describe('Notifications & Idempotent Alerts', () => {
    it('should generate threshold alerts idempotently', async () => {
      // Create account and budget at 100% threshold
      const acc = await request(app)
        .post('/api/accounts')
        .set('Cookie', user1Cookie)
        .send({ name: 'Checking', type: 'checking', currency: 'INR', initialBalanceMinorUnits: 1000000 });
      const now = new Date();
      await request(app)
        .post('/api/budgets')
        .set('Cookie', user1Cookie)
        .send({
          periodMonth: now.getUTCMonth() + 1,
          periodYear: now.getUTCFullYear(),
          limitAmountMinorUnits: 50000,
          currency: 'INR',
          alertThresholdPct: 90
        });

      // Expense exceeding 90%
      await request(app)
        .post('/api/transactions')
        .set('Cookie', user1Cookie)
        .send({
          type: 'expense',
          amountMinorUnits: 48000,
          currency: 'INR',
          sourceAccountId: acc.body.data.id,
          description: 'Big shopping',
          dateUtc: now.toISOString()
        });

      // 1. Run check alerts
      const check1 = await request(app)
        .post('/api/notifications/check-alerts')
        .set('Cookie', user1Cookie);
      expect(check1.status).toBe(200);
      expect(check1.body.data.createdCount).toBeGreaterThanOrEqual(1);

      // 2. Run check alerts again immediately -> Idempotent (0 duplicate alerts generated)
      const check2 = await request(app)
        .post('/api/notifications/check-alerts')
        .set('Cookie', user1Cookie);
      expect(check2.status).toBe(200);
      expect(check2.body.data.createdCount).toBe(0);

      // 3. Mark notification as read
      const notifs = await request(app).get('/api/notifications').set('Cookie', user1Cookie);
      const notifId = notifs.body.data[0].id;

      const readRes = await request(app)
        .patch(`/api/notifications/${notifId}/read`)
        .set('Cookie', user1Cookie);
      expect(readRes.status).toBe(200);

      // 4. Dismiss notification
      const delRes = await request(app)
        .delete(`/api/notifications/${notifId}`)
        .set('Cookie', user1Cookie);
      expect(delRes.status).toBe(200);
    });
  });

  // ==========================================
  // 3. User Data Export & Cascading Deletion
  // ==========================================
  describe('Data Sovereignty & Account Lifecycle', () => {
    it('GET /api/profile/export should return complete GDPR JSON archive', async () => {
      const exportRes = await request(app)
        .get('/api/profile/export')
        .set('Cookie', user1Cookie);

      expect(exportRes.status).toBe(200);
      expect(exportRes.body.success).toBe(true);
      expect(exportRes.body.data).toHaveProperty('user');
      expect(exportRes.body.data).toHaveProperty('accounts');
      expect(exportRes.body.data).toHaveProperty('transactions');
      expect(exportRes.body.data).toHaveProperty('budgets');
      expect(exportRes.body.data).toHaveProperty('goals');
      expect(exportRes.body.data).toHaveProperty('recurringSchedules');
      expect(exportRes.body.data).toHaveProperty('notifications');
      expect(exportRes.body.data).toHaveProperty('households');
      expect(exportRes.body.data.formatVersion).toBe('1.0');
    });

    it('DELETE /api/profile should require exact confirmation phrase', async () => {
      const failRes = await request(app)
        .delete('/api/profile')
        .set('Cookie', user1Cookie)
        .send({ confirmPhrase: 'delete please' });
      expect(failRes.status).toBe(400);
    });

    it('DELETE /api/profile should prevent deletion if sole owner of multi-member household', async () => {
      // User 1 creates household and adds User 2
      const hh = await request(app)
        .post('/api/households')
        .set('Cookie', user1Cookie)
        .send({ name: 'Family Space', currency: 'INR' });
      const inv = await request(app)
        .post(`/api/households/${hh.body.data.id}/invitations`)
        .set('Cookie', user1Cookie)
        .send({ email: user2.email, role: 'editor' });
      await request(app)
        .post('/api/households/invitations/accept')
        .set('Cookie', user2Cookie)
        .send({ token: inv.body.data.token });

      // User 1 tries to delete account while owning active multi-member space -> Rejected (400)
      const delAttempt = await request(app)
        .delete('/api/profile')
        .set('Cookie', user1Cookie)
        .send({ confirmPhrase: 'DELETE MY ACCOUNT' });
      expect(delAttempt.status).toBe(400);
      expect(delAttempt.body.error.message).toContain('transfer ownership or delete the shared space');

      // User 1 deletes household space
      await request(app).delete(`/api/households/${hh.body.data.id}`).set('Cookie', user1Cookie);

      // Now account deletion succeeds
      const delSuccess = await request(app)
        .delete('/api/profile')
        .set('Cookie', user1Cookie)
        .send({ confirmPhrase: 'DELETE MY ACCOUNT' });
      expect(delSuccess.status).toBe(200);

      // Session is invalidated
      const profileCheck = await request(app).get('/api/profile').set('Cookie', user1Cookie);
      expect(profileCheck.status).toBe(401);
    });
  });
});
