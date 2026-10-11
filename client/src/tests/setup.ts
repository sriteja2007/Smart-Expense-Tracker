import '@testing-library/jest-dom';
import { vi } from 'vitest';

interface TestTransaction {
  id: string;
  userId: string;
  sourceAccountId: string;
  destinationAccountId?: string;
  categoryId?: string;
  type: string;
  amountMinorUnits: number;
  currency: string;
  description: string;
  merchantName?: string;
  dateUtc: string;
  paymentMethod: string;
  isRecurring: boolean;
  status: string;
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

let testTransactions: TestTransaction[] = [
  {
    id: 'tx-1',
    userId: 'usr-test-123',
    sourceAccountId: 'acc-1',
    categoryId: 'cat-1',
    type: 'income',
    amountMinorUnits: 16500000, // ₹165,000
    currency: 'INR',
    description: 'Software Development Salary',
    merchantName: 'Tech Corp',
    dateUtc: '2026-10-01T10:00:00.000Z',
    paymentMethod: 'net_banking',
    isRecurring: false,
    status: 'completed',
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z'
  },
  {
    id: 'tx-2',
    userId: 'usr-test-123',
    sourceAccountId: 'acc-1',
    categoryId: 'cat-2',
    type: 'expense',
    amountMinorUnits: 3200000, // ₹32,000
    currency: 'INR',
    description: 'Apartment Maintenance & Rent',
    merchantName: 'Landlord',
    dateUtc: '2026-10-02T10:00:00.000Z',
    paymentMethod: 'upi',
    isRecurring: true,
    status: 'completed',
    createdAt: '2026-10-02T10:00:00.000Z',
    updatedAt: '2026-10-02T10:00:00.000Z'
  }
];

const testAccounts = [
  {
    id: 'acc-1',
    userId: 'usr-test-123',
    name: 'HDFC Primary',
    type: 'checking',
    currency: 'INR',
    balanceMinorUnits: 25000000,
    initialBalanceMinorUnits: 10000000,
    institutionName: 'HDFC Bank',
    isActive: true,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z'
  },
  {
    id: 'acc-2',
    userId: 'usr-test-123',
    name: 'ICICI Savings Reserve',
    type: 'savings',
    currency: 'INR',
    balanceMinorUnits: 50000000,
    initialBalanceMinorUnits: 50000000,
    institutionName: 'ICICI Bank',
    isActive: true,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z'
  }
];

const testCategories = [
  {
    id: 'cat-1',
    userId: 'usr-test-123',
    name: 'Salary & Income',
    type: 'income',
    icon: 'TrendingUp',
    color: '#10B981',
    isDefault: true,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z'
  },
  {
    id: 'cat-2',
    userId: 'usr-test-123',
    name: 'Housing & Rent',
    type: 'expense',
    icon: 'TrendingDown',
    color: '#8B5CF6',
    isDefault: true,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z'
  },
  {
    id: 'cat-3',
    userId: 'usr-test-123',
    name: 'Dining & Cafes',
    type: 'expense',
    icon: 'TrendingDown',
    color: '#F59E0B',
    isDefault: true,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z'
  }
];

const testRecurring = [
  {
    id: 'rec-1',
    userId: 'usr-test-123',
    sourceAccountId: 'acc-1',
    categoryId: 'cat-2',
    type: 'expense',
    amountMinorUnits: 1200000,
    currency: 'INR',
    description: 'Netflix 4K Premium',
    merchantName: 'Netflix',
    frequency: 'monthly',
    startDateUtc: '2026-10-01T00:00:00.000Z',
    nextRunDateUtc: '2026-11-01T00:00:00.000Z',
    isActive: true,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z'
  }
];

// Route-aware global mock for fetch in tests
globalThis.fetch = vi.fn().mockImplementation((url: RequestInfo | URL, options?: RequestInit) => {
  const urlStr = String(url);
  const method = options?.method || 'GET';

  // Auth me
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

  // Auth logout
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

  // Accounts
  if (urlStr.includes('/accounts')) {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: testAccounts,
          timestamp: new Date().toISOString()
        })
    });
  }

  // Categories
  if (urlStr.includes('/categories')) {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: testCategories,
          timestamp: new Date().toISOString()
        })
    });
  }

  // Analytics summary
  if (urlStr.includes('/analytics/summary')) {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            monthlyIncomeMinorUnits: 16500000,
            monthlyExpenseMinorUnits: 3200000,
            netSavingsMinorUnits: 13300000,
            savingsRatePercent: 80.6,
            currency: 'INR'
          },
          timestamp: new Date().toISOString()
        })
    });
  }

  // Recurring
  if (urlStr.includes('/recurring')) {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: testRecurring,
          timestamp: new Date().toISOString()
        })
    });
  }

  // Transactions POST
  if (urlStr.includes('/transactions') && method === 'POST') {
    const body = options?.body ? JSON.parse(options.body as string) : {};
    const newTx: TestTransaction = {
      id: `tx-${Date.now()}`,
      userId: 'usr-test-123',
      sourceAccountId: body.sourceAccountId || 'acc-1',
      destinationAccountId: body.destinationAccountId,
      categoryId: body.categoryId,
      type: body.type || 'expense',
      amountMinorUnits: body.amountMinorUnits || 0,
      currency: body.currency || 'INR',
      description: body.description || 'Unknown',
      merchantName: body.merchantName,
      dateUtc: body.dateUtc || new Date().toISOString(),
      paymentMethod: body.paymentMethod || 'upi',
      isRecurring: false,
      status: 'completed',
      notes: body.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    testTransactions = [newTx, ...testTransactions];
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: newTx,
          timestamp: new Date().toISOString()
        })
    });
  }

  // Transactions GET
  if (urlStr.includes('/transactions')) {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            transactions: testTransactions,
            pagination: {
              page: 1,
              limit: 20,
              totalCount: testTransactions.length,
              totalPages: 1,
              hasNext: false,
              hasPrev: false
            }
          },
          timestamp: new Date().toISOString()
        })
    });
  }

  // Notifications GET
  if (urlStr.includes('/notifications')) {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: [],
          timestamp: new Date().toISOString()
        })
    });
  }

  // Households GET
  if (urlStr.includes('/households')) {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: [],
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

// Polyfill URL.createObjectURL and URL.revokeObjectURL for jsdom tests
if (typeof window !== 'undefined') {
  if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  }
  if (!window.URL.revokeObjectURL) {
    window.URL.revokeObjectURL = vi.fn();
  }
  if (!window.HTMLElement.prototype.scrollIntoView) {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  }
}

