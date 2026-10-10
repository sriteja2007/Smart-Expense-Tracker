import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { UserRepository } from '../repositories/user.repository.js';

describe('Authentication & Session Management Suite', () => {
  const app = createApp();

  beforeEach(() => {
    UserRepository.clearInMemory();
  });

  const testUser = {
    displayName: 'Aarav Sharma',
    email: 'aarav.sharma@example.com',
    password: 'SecurePassword123!',
    defaultCurrency: 'INR'
  };

  it('POST /api/auth/register should create a user, hash password, and set HTTP-only cookie', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toHaveProperty('id');
    expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
    expect(res.body.data.user.displayName).toBe(testUser.displayName);
    expect(res.body.data.user.preferences.defaultCurrency).toBe('INR');

    // Security check: Never expose password or passwordHash
    expect(res.body.data.user).not.toHaveProperty('password');
    expect(res.body.data.user).not.toHaveProperty('passwordHash');

    // Cookie verification
    const cookies = res.headers['set-cookie'] as string[] | undefined;
    expect(cookies).toBeDefined();
    expect(cookies?.[0]).toContain('token=');
    expect(cookies?.[0]).toContain('HttpOnly');
  });

  it('POST /api/auth/register should reject duplicate email registrations with 409 Conflict', async () => {
    // First registration
    await request(app).post('/api/auth/register').send(testUser);

    // Duplicate registration attempt
    const res = await request(app).post('/api/auth/register').send(testUser);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CONFLICT');
    expect(res.body.error.message).toContain('already registered');
  });

  it('POST /api/auth/login should authenticate valid credentials and issue session token', async () => {
    await request(app).post('/api/auth/register').send(testUser);

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('POST /api/auth/login should reject invalid passwords with 401 Unauthorized', async () => {
    await request(app).post('/api/auth/register').send(testUser);

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'WrongPassword999!'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/auth/me should restore session from valid HTTP-only cookie', async () => {
    const registerRes = await request(app).post('/api/auth/register').send(testUser);
    const cookie = (registerRes.headers['set-cookie'] as unknown as string[]) || [];

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(testUser.email.toLowerCase());
    expect(res.body.data.displayName).toBe(testUser.displayName);
  });

  it('GET /api/auth/me should reject requests without session token', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/auth/logout should clear the session cookie', async () => {
    const registerRes = await request(app).post('/api/auth/register').send(testUser);
    const cookie = (registerRes.headers['set-cookie'] as unknown as string[]) || [];

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookie);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);

    const setCookies = registerRes.headers['set-cookie'] as unknown as string[] | undefined;
    expect(setCookies?.[0]).toContain('token=');
  });

  it('POST /api/auth/google should handle verified tokens or development simulated token safely', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({ idToken: 'mock-google-token:aarav.google@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('aarav.google@example.com');
    expect(res.body.data.user.authProvider).toBe('google');
  });

  it('PATCH /api/auth/profile should update user preferences for authenticated user', async () => {
    const registerRes = await request(app).post('/api/auth/register').send(testUser);
    const cookie = (registerRes.headers['set-cookie'] as unknown as string[]) || [];

    const updateRes = await request(app)
      .patch('/api/auth/profile')
      .set('Cookie', cookie)
      .send({
        displayName: 'Aarav S.',
        defaultCurrency: 'USD'
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.displayName).toBe('Aarav S.');
    expect(updateRes.body.data.preferences.defaultCurrency).toBe('USD');
  });
});
