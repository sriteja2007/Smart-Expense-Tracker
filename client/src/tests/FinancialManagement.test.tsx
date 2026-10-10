import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TransactionTable } from '../components/transactions/TransactionTable';
import { DeleteConfirmDialog } from '../components/transactions/DeleteConfirmDialog';
import { CsvImportModal } from '../components/transactions/CsvImportModal';
import { RecurringManager } from '../components/transactions/RecurringManager';
import { AccountSummaryCards } from '../components/transactions/AccountSummaryCards';
import { ToastProvider } from '../components/ui/toast';
import type {
  Transaction,
  FinancialAccount,
  Category,
  RecurringSchedule
} from '@lumaspend/shared';

const mockAccounts: FinancialAccount[] = [
  {
    id: 'acc-1',
    userId: 'usr-1',
    name: 'HDFC Checking',
    type: 'checking',
    currency: 'INR',
    balanceMinorUnits: 25000000, // ₹250,000
    institutionName: 'HDFC',
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'acc-2',
    userId: 'usr-1',
    name: 'ICICI Savings',
    type: 'savings',
    currency: 'INR',
    balanceMinorUnits: 50000000, // ₹500,000
    institutionName: 'ICICI',
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const mockCategories: Category[] = [
  {
    id: 'cat-1',
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
    id: 'cat-2',
    userId: 'usr-1',
    name: 'Salary',
    type: 'income',
    icon: 'TrendingUp',
    color: '#8B5CF6',
    isSystem: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const mockTransactions: Transaction[] = [
  {
    id: 'tx-1',
    userId: 'usr-1',
    sourceAccountId: 'acc-1',
    categoryId: 'cat-1',
    type: 'expense',
    amountMinorUnits: 150000, // ₹1,500
    currency: 'INR',
    description: 'Blinkit Groceries',
    merchantName: 'Blinkit',
    dateUtc: '2026-10-01T12:00:00.000Z',
    paymentMethod: 'upi',
    isRecurring: false,
    status: 'completed',
    notes: 'Weekly fresh fruits',
    tags: ['groceries'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'tx-2',
    userId: 'usr-1',
    sourceAccountId: 'acc-1',
    destinationAccountId: 'acc-2',
    type: 'transfer',
    amountMinorUnits: 5000000, // ₹50,000
    currency: 'INR',
    description: 'Savings Sweep',
    dateUtc: '2026-10-02T12:00:00.000Z',
    paymentMethod: 'other',
    isRecurring: false,
    status: 'completed',
    tags: ['transfer'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const mockSchedules: RecurringSchedule[] = [
  {
    id: 'rec-1',
    userId: 'usr-1',
    sourceAccountId: 'acc-1',
    categoryId: 'cat-1',
    type: 'expense',
    amountMinorUnits: 119900, // ₹1,199
    currency: 'INR',
    description: 'Netflix Premium 4K',
    merchantName: 'Netflix',
    frequency: 'monthly',
    timezone: 'Asia/Kolkata',
    startDateUtc: '2026-10-01T00:00:00.000Z',
    nextRunDateUtc: '2026-11-01T00:00:00.000Z',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

describe('Phase 5 Financial Management UI Suite', () => {
  it('renders TransactionTable with records, filters, and actions', () => {
    const handleEdit = vi.fn();
    const handleDelete = vi.fn();

    render(
      <ToastProvider>
        <TransactionTable
          transactions={mockTransactions}
          totalCount={2}
          currentPage={1}
          totalPages={1}
          isLoading={false}
          accounts={mockAccounts}
          categories={mockCategories}
          currency="INR"
          onPageChange={vi.fn()}
          onSearchChange={vi.fn()}
          onTypeFilterChange={vi.fn()}
          onCategoryFilterChange={vi.fn()}
          onAccountFilterChange={vi.fn()}
          onSortChange={vi.fn()}
          onEditTransaction={handleEdit}
          onDeleteTransaction={handleDelete}
          onOpenAddModal={vi.fn()}
          onOpenImportModal={vi.fn()}
          onRefresh={vi.fn()}
        />
      </ToastProvider>
    );

    // Ledger title & count
    expect(screen.getByText(/Transaction Ledger/i)).toBeInTheDocument();
    expect(screen.getByText(/2 Total Records/i)).toBeInTheDocument();

    // Transactions rendered
    expect(screen.getByText(/Blinkit Groceries/i)).toBeInTheDocument();
    expect(screen.getByText(/Savings Sweep/i)).toBeInTheDocument();
    expect(screen.getByText(/Internal Transfer/i)).toBeInTheDocument();

    // Notes visible
    expect(screen.getByText(/Weekly fresh fruits/i)).toBeInTheDocument();

    // Buttons
    expect(screen.getByRole('button', { name: /Export CSV/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Import CSV/i })).toBeInTheDocument();
  });

  it('renders DeleteConfirmDialog with balance reversal warning', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <DeleteConfirmDialog
        open={true}
        onClose={onClose}
        onConfirm={onConfirm}
        transaction={mockTransactions[0]!}
        isDeleting={false}
      />
    );

    expect(screen.getByText(/Delete Transaction\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Blinkit Groceries/i)).toBeInTheDocument();
    expect(screen.getByText(/recalculate your wallet balance/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /Confirm Delete/i });
    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('renders RecurringManager with schedules and process-due trigger', async () => {
    const onRefresh = vi.fn();

    render(
      <ToastProvider>
        <RecurringManager
          schedules={mockSchedules}
          accounts={mockAccounts}
          categories={mockCategories}
          currency="INR"
          onRefresh={onRefresh}
        />
      </ToastProvider>
    );

    expect(screen.getByText(/Recurring Schedules & Subscriptions/i)).toBeInTheDocument();
    expect(screen.getByText(/Netflix Premium 4K/i)).toBeInTheDocument();
    expect(screen.getByText(/monthly/i)).toBeInTheDocument();

    // Click Process Due Items
    const processBtn = screen.getByRole('button', { name: /Process Due Items/i });
    fireEvent.click(processBtn);

    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  it('renders AccountSummaryCards with multi-wallet balances and add wallet dialog', () => {
    render(
      <ToastProvider>
        <AccountSummaryCards
          accounts={mockAccounts}
          currency="INR"
          onRefresh={vi.fn()}
        />
      </ToastProvider>
    );

    expect(screen.getByText(/Active Wallets & Accounts/i)).toBeInTheDocument();
    expect(screen.getByText(/HDFC Checking/i)).toBeInTheDocument();
    expect(screen.getByText(/ICICI Savings/i)).toBeInTheDocument();

    // Open Add Wallet modal
    const addWalletBtn = screen.getByRole('button', { name: /Add Wallet/i });
    fireEvent.click(addWalletBtn);

    expect(screen.getByText(/Add New Account \/ Wallet/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. HDFC Salary/i)).toBeInTheDocument();
  });

  it('renders CsvImportModal with file upload and preview states', () => {
    render(
      <ToastProvider>
        <CsvImportModal
          open={true}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          accounts={mockAccounts}
        />
      </ToastProvider>
    );

    expect(screen.getByText(/Import Transactions via CSV/i)).toBeInTheDocument();
    expect(screen.getByText(/Target Account/i)).toBeInTheDocument();
    expect(screen.getByText(/Select CSV File/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Preview & Validate/i })).toBeInTheDocument();
  });
});
