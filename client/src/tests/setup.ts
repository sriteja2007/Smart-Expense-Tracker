import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Global mock for fetch in tests
globalThis.fetch = vi.fn().mockImplementation(() =>
  Promise.resolve({
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
  })
) as unknown as typeof fetch;
