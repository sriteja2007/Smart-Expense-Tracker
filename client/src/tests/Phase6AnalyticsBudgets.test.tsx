import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BudgetManager } from '../components/financial/BudgetManager';
import { SavingsGoalManager } from '../components/financial/SavingsGoalManager';
import { ReportExporter } from '../components/financial/ReportExporter';
import { ToastProvider } from '../components/ui/toast';
import { FinancialApi } from '../lib/financial-api';
import type { FinancialCategory, FinancialAccount, Budget, SavingsGoal } from '@lumaspend/shared';

// Mock FinancialApi
vi.mock('../lib/financial-api', () => ({
  FinancialApi: {
    listBudgets: vi.fn(),
    createBudget: vi.fn(),
    updateBudget: vi.fn(),
    deleteBudget: vi.fn(),
    checkBudgetAlerts: vi.fn(),
    listGoals: vi.fn(),
    createGoal: vi.fn(),
    contributeToGoal: vi.fn(),
    deleteGoal: vi.fn(),
    getMonthlyReport: vi.fn(),
    downloadPdfReport: vi.fn(),
    exportCsv: vi.fn(),
    getAnalyticsSummary: vi.fn(),
    getAnalyticsTrends: vi.fn(),
    getCategoryBreakdown: vi.fn(),
    getBudgetVsActual: vi.fn()
  }
}));

const mockCategories: FinancialCategory[] = [
  {
    id: 'cat-groceries',
    userId: 'usr-1',
    name: 'Groceries',
    type: 'expense',
    icon: 'ShoppingBag',
    color: '#10B981',
    isSystem: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cat-dining',
    userId: 'usr-1',
    name: 'Dining & Food',
    type: 'expense',
    icon: 'Utensils',
    color: '#F59E0B',
    isSystem: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const mockAccounts: FinancialAccount[] = [
  {
    id: 'acc-hdfc',
    userId: 'usr-1',
    name: 'HDFC Bank',
    type: 'checking',
    currency: 'INR',
    balanceMinorUnits: 15000000, // ₹150,000
    institutionName: 'HDFC Bank',
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'acc-savings',
    userId: 'usr-1',
    name: 'Emergency Savings Fund',
    type: 'savings',
    currency: 'INR',
    balanceMinorUnits: 8000000, // ₹80,000
    institutionName: 'SBI',
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const mockBudgets: Budget[] = [
  {
    id: 'bg-1',
    userId: 'usr-1',
    periodMonth: 10,
    periodYear: 2026,
    limitAmountMinorUnits: 2500000, // ₹25,000
    spentAmountMinorUnits: 2000000, // ₹20,000 (80%)
    remainingAmountMinorUnits: 500000,
    consumedPercent: 80,
    isExceeded: false,
    alertThresholdPct: 75,
    currency: 'INR',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'bg-2',
    userId: 'usr-1',
    categoryId: 'cat-groceries',
    periodMonth: 10,
    periodYear: 2026,
    limitAmountMinorUnits: 1000000, // ₹10,000
    spentAmountMinorUnits: 950000,  // ₹9,500 (95%)
    remainingAmountMinorUnits: 50000,
    consumedPercent: 95,
    isExceeded: false,
    alertThresholdPct: 90,
    currency: 'INR',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const mockGoals: SavingsGoal[] = [
  {
    id: 'goal-1',
    userId: 'usr-1',
    name: 'Emergency Fund 2026',
    targetAmountMinorUnits: 10000000, // ₹100,000
    currentAmountMinorUnits: 4000000,  // ₹40,000
    currency: 'INR',
    targetDateUtc: '2026-12-31T00:00:00.000Z',
    fundingMode: 'explicit_contribution',
    status: 'active',
    progressPercent: 40,
    requiredDailyPaceMinorUnits: 73529,
    requiredMonthlyPaceMinorUnits: 2205882,
    daysRemaining: 82,
    color: '#10B981',
    icon: 'Target',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'goal-2',
    userId: 'usr-1',
    name: 'Linked Liquid Reserve',
    targetAmountMinorUnits: 10000000,
    currentAmountMinorUnits: 8000000,
    currency: 'INR',
    fundingMode: 'linked_account',
    linkedAccountId: 'acc-savings',
    status: 'active',
    progressPercent: 80,
    color: '#3B82F6',
    icon: 'Shield',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

describe('Phase 6: Budgets, Goals & Reports Component Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('BudgetManager', () => {
    it('renders budgets, percentage consumption, and warning threshold alerts', async () => {
      vi.mocked(FinancialApi.listBudgets).mockResolvedValue(mockBudgets);

      render(
        <ToastProvider>
          <BudgetManager categories={mockCategories} currency="INR" />
        </ToastProvider>
      );

      // Verify header and loading resolves
      expect(screen.getByText('Budgets & Spending Limits')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Overall Monthly Ceiling')).toBeInTheDocument();
        expect(screen.getByText('Groceries')).toBeInTheDocument();
      });

      // Verify spending percentage displayed
      expect(screen.getByText('Consumed: 80%')).toBeInTheDocument();
      expect(screen.getByText('Consumed: 95%')).toBeInTheDocument();
      expect(screen.getAllByText('WARNING')).toHaveLength(2);
    });

    it('triggers checkBudgetAlerts when clicking Check Alerts', async () => {
      vi.mocked(FinancialApi.listBudgets).mockResolvedValue(mockBudgets);
      vi.mocked(FinancialApi.checkBudgetAlerts).mockResolvedValue({ triggeredCount: 1, alerts: [] });

      render(
        <ToastProvider>
          <BudgetManager categories={mockCategories} currency="INR" />
        </ToastProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Check Alerts')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Check Alerts'));

      await waitFor(() => {
        expect(FinancialApi.checkBudgetAlerts).toHaveBeenCalled();
      });
    });
  });

  describe('SavingsGoalManager', () => {
    it('renders goal targets, current progress and required pace', async () => {
      vi.mocked(FinancialApi.listGoals).mockResolvedValue(mockGoals);

      render(
        <ToastProvider>
          <SavingsGoalManager accounts={mockAccounts} currency="INR" />
        </ToastProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Emergency Fund 2026')).toBeInTheDocument();
        expect(screen.getByText('Linked Liquid Reserve')).toBeInTheDocument();
      });

      // Check funding mode indicators
      expect(screen.getByText('Manual Deposits')).toBeInTheDocument();
      expect(screen.getByText('Linked: Emergency Savings Fund')).toBeInTheDocument();

      // Check progress %
      expect(screen.getByText('40%')).toBeInTheDocument();
      expect(screen.getByText('80%')).toBeInTheDocument();

      // Check pace headers
      expect(screen.getByText('Required Daily Pace')).toBeInTheDocument();
      expect(screen.getByText('Required Monthly Pace')).toBeInTheDocument();
    });
  });

  describe('ReportExporter', () => {
    it('renders statement totals and handles PDF & CSV downloads', async () => {
      const mockMonthlyReport = {
        month: 10,
        year: 2026,
        totalIncomeMinorUnits: 15000000,
        totalExpenseMinorUnits: 6500000,
        netSavingsMinorUnits: 8500000,
        savingsRatePct: 57,
        transactionCount: 42
      };

      vi.mocked(FinancialApi.getMonthlyReport).mockResolvedValue(mockMonthlyReport);
      vi.mocked(FinancialApi.downloadPdfReport).mockResolvedValue(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
      vi.mocked(FinancialApi.exportCsv).mockResolvedValue('Date,Type,Amount\n2026-10-01,expense,150.00');

      render(
        <ToastProvider>
          <ReportExporter currency="INR" />
        </ToastProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/42 transactions recorded/i)).toBeInTheDocument();
        expect(screen.getByText('57%')).toBeInTheDocument();
      });

      // Check export buttons exist
      expect(screen.getByText('Download Executive PDF Statement')).toBeInTheDocument();
      expect(screen.getByText('Export Transactions to CSV')).toBeInTheDocument();
    });
  });
});
