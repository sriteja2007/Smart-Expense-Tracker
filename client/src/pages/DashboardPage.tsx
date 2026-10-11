import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { GlassPanel } from '@/components/ui/glass-panel';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/context/AuthContext';
import { FinancialApi } from '@/lib/financial-api';
import { TransactionTable } from '@/components/transactions/TransactionTable';
import { TransactionDialog } from '@/components/transactions/TransactionDialog';
import { DeleteConfirmDialog } from '@/components/transactions/DeleteConfirmDialog';
import { CsvImportModal } from '@/components/transactions/CsvImportModal';
import { AccountSummaryCards } from '@/components/transactions/AccountSummaryCards';
import { RecurringManager } from '@/components/transactions/RecurringManager';
import { BudgetManager } from '@/components/financial/BudgetManager';
import { SavingsGoalManager } from '@/components/financial/SavingsGoalManager';
import { AnalyticsDashboard } from '@/components/financial/AnalyticsDashboard';
import { ReportExporter } from '@/components/financial/ReportExporter';
import { AiAdvisor } from '@/components/ai/AiAdvisor';
import { ReceiptScannerModal } from '@/components/receipts/ReceiptScannerModal';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { HouseholdManager } from '@/components/household/HouseholdManager';
import { SettingsView } from '@/components/settings/SettingsView';
import {
  formatCurrency,
  fromMinorUnits,
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
  type CurrencyCode,
  type Transaction,
  type FinancialAccount,
  type FinancialCategory,
  type RecurringSchedule,
  type AnalyticsSummaryData
} from '@lumaspend/shared';

type DashboardTab = 'overview' | 'transactions' | 'budgets' | 'goals' | 'analytics' | 'reports' | 'ai' | 'recurring' | 'household' | 'settings';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [currency, setCurrency] = useState<CurrencyCode>(
    user?.preferences?.defaultCurrency || DEFAULT_CURRENCY
  );

  const [activeHouseholdId, setActiveHouseholdId] = useState<string | undefined>(undefined);

  // Financial Domain Data State
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurringSchedules, setRecurringSchedules] = useState<RecurringSchedule[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummaryData | null>(null);

  // Pagination & Filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [sortField, setSortField] = useState('dateUtc');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(true);

  // Dialog State
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isScanReceiptOpen, setIsScanReceiptOpen] = useState(false);

  // Fetch all domain data
  const loadFinancialData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [accs, cats, recs, txResult, summary] = await Promise.all([
        FinancialApi.listAccounts(),
        FinancialApi.listCategories(),
        FinancialApi.listRecurring(),
        FinancialApi.listTransactions({
          page: currentPage,
          limit: 15,
          search: searchQuery || undefined,
          type: filterType !== 'all' ? filterType : undefined,
          categoryId: filterCategory || undefined,
          accountId: filterAccount || undefined,
          householdId: activeHouseholdId,
          sortBy: sortField,
          sortOrder
        }),
        FinancialApi.getAnalyticsSummary().catch(() => null)
      ]);

      // If user has zero accounts, create a default Primary Checking account
      if (accs.length === 0) {
        const defaultAcc = await FinancialApi.createAccount({
          name: 'Primary Checking',
          type: 'checking',
          currency,
          initialBalanceMinorUnits: 0
        });
        setAccounts([defaultAcc]);
      } else {
        setAccounts(accs);
      }

      setCategories(cats);
      setRecurringSchedules(recs);
      setTransactions(txResult.transactions);
      setTotalPages(txResult.pagination.totalPages);
      setTotalCount(txResult.pagination.totalCount);
      if (summary) setAnalytics(summary);
    } catch (err) {
      console.error('Failed to load financial data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchQuery, filterType, filterCategory, filterAccount, activeHouseholdId, sortField, sortOrder, currency]);

  useEffect(() => {
    loadFinancialData();
  }, [loadFinancialData]);

  // Global Keyboard Shortcut: Press 'n' to open Add Transaction dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl instanceof HTMLSelectElement;

      if ((e.key === 'n' || e.key === 'N') && !isInput && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsAddTxOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle destructive delete confirmation
  const handleConfirmDelete = async () => {
    if (!deletingTx) return;
    try {
      setIsDeleting(true);
      await FinancialApi.deleteTransaction(deletingTx.id);
      toast({
        title: 'Transaction Deleted',
        description: 'Record removed and wallet balances reconciled.',
        type: 'success'
      });
      setDeletingTx(null);
      loadFinancialData();
    } catch (err) {
      toast({
        title: 'Delete Failed',
        description: err instanceof Error ? err.message : 'Could not delete transaction',
        type: 'error'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Metrics (computed from real analytics summary or loaded transactions)
  const totalIncome = analytics
    ? fromMinorUnits(analytics.monthlyIncomeMinorUnits, currency)
    : transactions
        .filter((t) => t.type === 'income')
        .reduce((acc, t) => acc + fromMinorUnits(t.amountMinorUnits, t.currency), 0);

  const totalExpense = analytics
    ? fromMinorUnits(analytics.monthlyExpenseMinorUnits, currency)
    : transactions
        .filter((t) => t.type === 'expense')
        .reduce((acc, t) => acc + fromMinorUnits(t.amountMinorUnits, t.currency), 0);

  const netSavings = analytics
    ? fromMinorUnits(analytics.netSavingsMinorUnits, currency)
    : totalIncome - totalExpense;

  const navItems = [
    { id: 'overview' as const, label: 'Overview', icon: <Icons.Activity className="h-4 w-4" /> },
    { id: 'transactions' as const, label: 'Ledger', icon: <Icons.Wallet className="h-4 w-4" /> },
    { id: 'budgets' as const, label: 'Budgets', icon: <Icons.Shield className="h-4 w-4" /> },
    { id: 'goals' as const, label: 'Savings Goals', icon: <Icons.Target className="h-4 w-4" /> },
    { id: 'analytics' as const, label: 'Analytics', icon: <Icons.TrendingUp className="h-4 w-4" /> },
    { id: 'ai' as const, label: 'AI Advisor', icon: <Icons.Bot className="h-4 w-4" /> },
    { id: 'reports' as const, label: 'Reports', icon: <Icons.FileText className="h-4 w-4" /> },
    { id: 'recurring' as const, label: 'Recurring', icon: <Icons.Clock className="h-4 w-4" /> },
    { id: 'household' as const, label: 'Shared Spaces', icon: <Icons.Users className="h-4 w-4" /> },
    { id: 'settings' as const, label: 'Settings', icon: <Icons.Terminal className="h-4 w-4" /> }
  ];

  return (
    <div className="min-h-screen flex bg-void text-text-primary selection:bg-brand-violet/30 selection:text-white">
      {/* DESKTOP SIDEBAR (Visible on lg+ screens) */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-white/5 bg-surface-300/60 backdrop-blur-xl shrink-0 p-5 space-y-8">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-violet to-brand-blue shadow-glow-violet">
            <Icons.Wallet className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-white">LumaSpend</h1>
            <p className="text-[10px] text-text-muted">Financial Command</p>
          </div>
        </Link>

        {/* Navigation Tabs */}
        <nav className="flex-1 space-y-1.5">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === item.id
                  ? 'bg-gradient-to-r from-brand-violet/25 to-brand-indigo/15 text-white border border-brand-violet/30 shadow-glow-violet'
                  : 'text-text-secondary hover:text-white hover:bg-surface-elevated/40'
              }`}
            >
              <span className={activeTab === item.id ? 'text-brand-glow' : 'text-text-muted'}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Currency Switcher & User Profile in Sidebar */}
        <div className="pt-4 border-t border-white/5 space-y-3">
          <div className="flex items-center justify-between text-xs px-2">
            <span className="text-text-muted">Active Currency</span>
            <Badge variant="violet" className="text-[10px]">
              {currency} ({SUPPORTED_CURRENCIES[currency].symbol})
            </Badge>
          </div>
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-default/60 border border-white/5">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-violet to-brand-blue flex items-center justify-center font-bold text-white text-xs">
              {(user?.displayName || 'LS').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{user?.displayName || 'LumaSpend User'}</p>
              <p className="text-[10px] text-text-muted truncate">{user?.email || 'user@lumaspend.io'}</p>
            </div>
            <button
              onClick={async () => {
                await logout();
                toast({ title: 'Signed Out', description: 'Session ended successfully', type: 'info' });
                navigate('/login');
              }}
              title="Sign Out"
              aria-label="Sign Out"
              className="p-1.5 text-text-muted hover:text-finance-expense transition-colors"
            >
              <Icons.Error className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP APP HEADER */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/5 bg-void/85 px-4 sm:px-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            {/* Mobile Logo */}
            <Link to="/" className="lg:hidden flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-brand-violet to-brand-blue">
                <Icons.Wallet className="h-4 w-4 text-white" />
              </div>
              <span className="text-base font-bold text-white">LumaSpend</span>
            </Link>
            <div className="hidden sm:block text-xs text-text-secondary font-medium">
              <span className="text-text-muted">Workspace /</span>{' '}
              <span className="text-white capitalize">{activeTab}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {activeHouseholdId && (
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-brand-violet/15 border border-brand-violet/30 text-xs text-white">
                <span className="w-2 h-2 rounded-full bg-brand-violet animate-pulse" />
                <span className="font-medium">Shared Space Active</span>
                <button
                  onClick={() => setActiveHouseholdId(undefined)}
                  className="ml-1 text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Switch to Personal
                </button>
              </div>
            )}

            <NotificationCenter />

            <Button
              variant="glass"
              size="sm"
              onClick={() => setIsScanReceiptOpen(true)}
              className="text-xs text-text-secondary hover:text-white"
            >
              <Icons.Camera className="h-3.5 w-3.5 mr-1.5" />
              <span className="hidden sm:inline">Scan Receipt</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddTxOpen(true)}
              className="text-xs font-semibold shadow-glow-violet"
            >
              <span>+ Record Transaction</span>
            </Button>
            <Button
              variant="glass"
              size="sm"
              onClick={async () => {
                await logout();
                toast({ title: 'Signed Out', description: 'Session ended successfully', type: 'info' });
                navigate('/login');
              }}
              className="text-xs text-text-secondary"
            >
              Sign Out
            </Button>
          </div>
        </header>

        {/* BODY TABS CONTENT */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-24 lg:pb-8">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Stat Highlights Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <Card className="glass-card-interactive">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-text-muted uppercase">Total Inflow</span>
                      <Icons.Income className="h-4 w-4 text-finance-income" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl sm:text-3xl font-extrabold text-white">
                      {formatCurrency(totalIncome, currency)}
                    </div>
                    <p className="text-[11px] text-finance-income mt-1 font-medium">Monthly verified inflow</p>
                  </CardContent>
                </Card>

                <Card className="glass-card-interactive">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-text-muted uppercase">Total Outflow</span>
                      <Icons.Expense className="h-4 w-4 text-finance-expense" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl sm:text-3xl font-extrabold text-white">
                      {formatCurrency(totalExpense, currency)}
                    </div>
                    <p className="text-[11px] text-text-muted mt-1">Excludes internal transfers</p>
                  </CardContent>
                </Card>

                <Card className="glass-card-interactive">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-text-muted uppercase">Net Savings Reserve</span>
                      <Icons.Shield className="h-4 w-4 text-brand-glow" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl sm:text-3xl font-extrabold text-brand-glow">
                      {formatCurrency(netSavings, currency)}
                    </div>
                    <p className="text-[11px] text-emerald-400 mt-1 font-medium">Reconciled ledger balance</p>
                  </CardContent>
                </Card>
              </div>

              {/* Multi-Wallet Accounts Overview */}
              <AccountSummaryCards
                accounts={accounts}
                currency={currency}
                onRefresh={loadFinancialData}
              />

              {/* Recent Ledger Activity Preview */}
              <GlassPanel intensity="medium" className="p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Icons.Activity className="h-4 w-4 text-brand-glow" />
                    <h2 className="text-base font-bold text-white">Recent Transactions</h2>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('transactions')}>
                    <span>View Full Ledger ({totalCount})</span>
                    <Icons.ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>

                {transactions.length === 0 ? (
                  <p className="text-xs text-text-muted py-4 text-center">
                    No transactions recorded yet. Click '+ Record Transaction' to get started.
                  </p>
                ) : (
                  <div className="divide-y divide-white/5">
                    {transactions.slice(0, 5).map((tx) => {
                      const decimalAmount = fromMinorUnits(tx.amountMinorUnits, tx.currency);
                      const catName = categories.find((c) => c.id === tx.categoryId)?.name || 'General';
                      return (
                        <div key={tx.id} className="py-3 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-surface-elevated border border-white/5">
                              {tx.type === 'income' ? (
                                <Icons.Income className="h-4 w-4 text-finance-income" />
                              ) : tx.type === 'transfer' ? (
                                <Icons.Transfer className="h-4 w-4 text-brand-blue" />
                              ) : (
                                <Icons.Expense className="h-4 w-4 text-finance-expense" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-white">{tx.description}</p>
                              <p className="text-[10px] text-text-muted">
                                {catName} • {tx.dateUtc ? tx.dateUtc.slice(0, 10) : 'Today'} • {tx.paymentMethod}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`text-xs font-bold font-mono ${
                              tx.type === 'income'
                                ? 'text-finance-income'
                                : tx.type === 'transfer'
                                ? 'text-brand-glow'
                                : 'text-text-primary'
                            }`}
                          >
                            {tx.type === 'income'
                              ? `+${formatCurrency(decimalAmount, currency)}`
                              : formatCurrency(decimalAmount, currency)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </GlassPanel>
            </div>
          )}

          {/* TRANSACTIONS TAB */}
          {activeTab === 'transactions' && (
            <TransactionTable
              transactions={transactions}
              totalCount={totalCount}
              currentPage={currentPage}
              totalPages={totalPages}
              isLoading={isLoading}
              accounts={accounts}
              categories={categories}
              currency={currency}
              onPageChange={(page) => setCurrentPage(page)}
              onSearchChange={(search) => {
                setSearchQuery(search);
                setCurrentPage(1);
              }}
              onTypeFilterChange={(type) => {
                setFilterType(type);
                setCurrentPage(1);
              }}
              onCategoryFilterChange={(catId) => {
                setFilterCategory(catId);
                setCurrentPage(1);
              }}
              onAccountFilterChange={(accId) => {
                setFilterAccount(accId);
                setCurrentPage(1);
              }}
              onSortChange={(sortBy, sortOrder) => {
                setSortField(sortBy);
                setSortOrder(sortOrder);
              }}
              onEditTransaction={(tx) => setEditingTx(tx)}
              onDeleteTransaction={(tx) => setDeletingTx(tx)}
              onOpenAddModal={() => setIsAddTxOpen(true)}
              onOpenImportModal={() => setIsImportOpen(true)}
              onOpenScanModal={() => setIsScanReceiptOpen(true)}
              onRefresh={loadFinancialData}
            />
          )}

          {/* AI ADVISOR TAB */}
          {activeTab === 'ai' && (
            <AiAdvisor currency={currency} />
          )}

          {/* RECURRING TAB */}
          {activeTab === 'recurring' && (
            <RecurringManager
              schedules={recurringSchedules}
              accounts={accounts}
              categories={categories}
              currency={currency}
              onRefresh={loadFinancialData}
            />
          )}

          {/* BUDGETS TAB */}
          {activeTab === 'budgets' && (
            <BudgetManager categories={categories} currency={currency} />
          )}

          {/* SAVINGS GOALS TAB */}
          {activeTab === 'goals' && (
            <SavingsGoalManager accounts={accounts} currency={currency} />
          )}

          {/* ANALYTICS TAB */}
          {activeTab === 'analytics' && (
            <AnalyticsDashboard accounts={accounts} categories={categories} currency={currency} />
          )}

          {/* REPORTS TAB */}
          {activeTab === 'reports' && (
            <ReportExporter currency={currency} />
          )}

          {/* SHARED HOUSEHOLDS TAB */}
          {activeTab === 'household' && (
            <HouseholdManager
              currentUserId={user?.id || ''}
              activeHouseholdId={activeHouseholdId}
              onSelectHousehold={(id) => {
                setActiveHouseholdId(id);
                if (id) {
                  toast({
                    title: 'Space Switched',
                    description: 'Transactions and budgets scoped to this shared space.',
                    type: 'info'
                  });
                }
              }}
            />
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <SettingsView
              user={user}
              onProfileUpdated={loadFinancialData}
              currency={currency}
              onCurrencyChange={setCurrency}
            />
          )}
        </main>

        {/* MOBILE BOTTOM NAVIGATION BAR (Visible on mobile/tablet screens < lg) */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-white/10 bg-void/90 backdrop-blur-xl px-2">
          {navItems.slice(0, 5).map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center gap-1 w-14 py-1 rounded-xl text-[10px] font-medium transition-colors ${
                activeTab === item.id ? 'text-brand-glow font-bold' : 'text-text-muted hover:text-white'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* RECORD TRANSACTION DIALOG (Create Mode) */}
      <TransactionDialog
        open={isAddTxOpen}
        onClose={() => setIsAddTxOpen(false)}
        onSuccess={loadFinancialData}
        accounts={accounts}
        categories={categories}
        currency={currency}
      />

      {/* EDIT TRANSACTION DIALOG (Edit Mode) */}
      <TransactionDialog
        open={Boolean(editingTx)}
        onClose={() => setEditingTx(null)}
        onSuccess={loadFinancialData}
        transaction={editingTx}
        accounts={accounts}
        categories={categories}
        currency={currency}
      />

      {/* DELETE TRANSACTION CONFIRMATION DIALOG */}
      <DeleteConfirmDialog
        open={Boolean(deletingTx)}
        onClose={() => setDeletingTx(null)}
        onConfirm={handleConfirmDelete}
        transaction={deletingTx}
        isDeleting={isDeleting}
      />

      {/* CSV IMPORT MODAL */}
      <CsvImportModal
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={loadFinancialData}
        accounts={accounts}
      />

      {/* RECEIPT SCANNER MODAL */}
      <ReceiptScannerModal
        open={isScanReceiptOpen}
        onClose={() => setIsScanReceiptOpen(false)}
        accounts={accounts}
        categories={categories}
        currency={currency}
        onTransactionCreated={loadFinancialData}
      />
    </div>
  );
};
