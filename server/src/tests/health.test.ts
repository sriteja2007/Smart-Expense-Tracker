import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

describe('Health & Diagnostic Endpoints', () => {
  const app = createApp();

  it('GET / should return basic service identification', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name', 'LumaSpend API');
    expect(res.body).toHaveProperty('status', 'active');
  });

  it('GET /api/health should adhere to standard ApiSuccessResponse envelope', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('status', 'healthy');
    expect(res.body.data).toHaveProperty('version');
    expect(res.body.data).toHaveProperty('services');
    expect(res.body.data.services).toHaveProperty('database');
    expect(res.body.data.services).toHaveProperty('aiEngine');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('GET /api/unknown-endpoint should return 404 with standard ApiErrorResponse envelope', async () => {
    const res = await request(app).get('/api/unknown-endpoint');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
    expect(res.body.error).toHaveProperty('message');
  });
});
