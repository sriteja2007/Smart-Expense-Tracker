import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Route-aware global mock for fetch in tests
globalThis.fetch = vi.fn().mockImplementation((url: RequestInfo | URL) => {
  const urlStr = String(url);

  if (urlStr.includes('/auth/me')) {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            id: 'usr-test-123',
            email: 'aarav@lumaspend.local',
            displayName: 'Aarav Sharma',
            role: 'user',
            authProvider: 'local',
            preferences: {
              defaultCurrency: 'INR',
              theme: 'dark',
              reducedMotion: false,
              budgetAlertsEnabled: true,
              weeklySummaryEmail: false
            },
            createdAt: '2026-10-10T12:00:00.000Z',
            updatedAt: '2026-10-10T12:00:00.000Z'
          },
          timestamp: new Date().toISOString()
        })
    });
  }

  if (urlStr.includes('/auth/logout')) {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: { message: 'Logged out successfully' },
          timestamp: new Date().toISOString()
        })
    });
  }

  return Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        success: true,
        data: {
          status: 'healthy',
          uptimeSeconds: 42,
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          environment: 'test',
          services: {
            database: { status: 'connected' },
            aiEngine: { status: 'configured' }
          }
        },
        timestamp: new Date().toISOString()
      })
  });
}) as unknown as typeof fetch;
