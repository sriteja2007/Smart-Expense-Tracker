import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { EmptyState } from '@/components/states/EmptyState';
import {
  formatCurrency,
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
  type CurrencyCode
} from '@lumaspend/shared';
import { useAuth } from '@/context/AuthContext';

type DashboardTab = 'overview' | 'transactions' | 'budgets' | 'analytics' | 'ai' | 'settings';

interface TransactionItem {
  id: string;
  name: string;
  category: string;
  date: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  paymentMethod: string;
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, logout, updateProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [currency, setCurrency] = useState<CurrencyCode>(
    user?.preferences?.defaultCurrency || DEFAULT_CURRENCY
  );
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  // Form State for Adding Transaction
  const [txName, setTxName] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txCategory, setTxCategory] = useState('dining');
  const [txType, setTxType] = useState<'expense' | 'income' | 'transfer'>('expense');

  // State Transactions List (Initialized with realistic INR dummy data)
  const [transactions, setTransactions] = useState<TransactionItem[]>([
    { id: '1', name: 'Software Development Salary', category: 'Salary & Income', date: '01 Oct 2026', amount: 165000, type: 'income', paymentMethod: 'Net Banking' },
    { id: '2', name: 'Apartment Maintenance & Rent', category: 'Housing', date: '02 Oct 2026', amount: 32000, type: 'expense', paymentMethod: 'UPI' },
    { id: '3', name: 'Zepto Supermarket Groceries', category: 'Groceries', date: '04 Oct 2026', amount: 3840, type: 'expense', paymentMethod: 'UPI' },
    { id: '4', name: 'Figma Annual Team License', category: 'Software & SaaS', date: '06 Oct 2026', amount: 12500, type: 'expense', paymentMethod: 'Credit Card' },
    { id: '5', name: 'Freelance Advisory Retainer', category: 'Freelance', date: '07 Oct 2026', amount: 45000, type: 'income', paymentMethod: 'Direct Deposit' },
    { id: '6', name: 'HDFC High-Yield Savings Sweep', category: 'Investment', date: '08 Oct 2026', amount: 40000, type: 'transfer', paymentMethod: 'Internal Transfer' }
  ]);

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(txAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({ title: 'Invalid Amount', description: 'Please enter a valid amount greater than 0', type: 'error' });
      return;
    }

    const newTx: TransactionItem = {
      id: Date.now().toString(),
      name: txName || 'Miscellaneous Outflow',
      category: txCategory,
      date: 'Today',
      amount: numAmount,
      type: txType,
      paymentMethod: 'UPI'
    };

    setTransactions([newTx, ...transactions]);
    setIsAddTxOpen(false);
    setTxName('');
    setTxAmount('');
    toast({
      title: 'Transaction Recorded',
      description: `Added ${formatCurrency(numAmount, currency)} to your ledger`,
      type: 'success'
    });
  };

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch = tx.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tx.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || tx.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const netSavings = totalIncome - totalExpense;

  const navItems = [
    { id: 'overview' as const, label: 'Overview', icon: <Icons.Activity className="h-4 w-4" /> },
    { id: 'transactions' as const, label: 'Ledger', icon: <Icons.Wallet className="h-4 w-4" /> },
    { id: 'budgets' as const, label: 'Budgets', icon: <Icons.Shield className="h-4 w-4" /> },
    { id: 'analytics' as const, label: 'Analytics', icon: <Icons.Income className="h-4 w-4" /> },
    { id: 'ai' as const, label: 'AI Copilot', icon: <Icons.AI className="h-4 w-4" /> },
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
            <Badge variant="violet" className="text-[10px]">{currency} ({SUPPORTED_CURRENCIES[currency].symbol})</Badge>
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

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddTxOpen(true)}
              className="text-xs font-semibold"
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
                    <p className="text-[11px] text-finance-income mt-1 font-medium">+12.5% vs past month</p>
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
                    <p className="text-[11px] text-text-muted mt-1">Within adaptive budget cap</p>
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
                    <p className="text-[11px] text-emerald-400 mt-1 font-medium">Healthy runway ratio</p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Ledger Activity Preview */}
              <GlassPanel intensity="medium" className="p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Icons.Activity className="h-4 w-4 text-brand-glow" />
                    <h2 className="text-base font-bold text-white">Recent Transactions</h2>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('transactions')}>
                    <span>View All ({transactions.length})</span>
                    <Icons.ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>

                <div className="divide-y divide-white/5">
                  {transactions.slice(0, 5).map((tx) => (
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
                          <p className="text-xs font-semibold text-white">{tx.name}</p>
                          <p className="text-[10px] text-text-muted">{tx.category} • {tx.date} • {tx.paymentMethod}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-bold ${tx.type === 'income' ? 'text-finance-income' : 'text-text-primary'}`}>
                        {tx.type === 'income' ? `+${formatCurrency(tx.amount, currency)}` : formatCurrency(tx.amount, currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </GlassPanel>
            </div>
          )}

          {/* TRANSACTIONS TAB */}
          {activeTab === 'transactions' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Transaction Ledger</h2>
                  <p className="text-xs text-text-secondary">Search, audit, and filter financial activity</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Search merchant or category..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-56 h-9 text-xs"
                    icon={<Icons.Terminal className="h-3.5 w-3.5" />}
                  />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="h-9 px-3 rounded-xl bg-surface-elevated border border-white/10 text-xs text-text-primary"
                  >
                    <option value="all">All Types</option>
                    <option value="expense">Expenses Only</option>
                    <option value="income">Incomes Only</option>
                  </select>
                </div>
              </div>

              {filteredTransactions.length === 0 ? (
                <EmptyState
                  title="No matching transactions found"
                  description="Try adjusting your search criteria or add a new entry."
                  actionLabel="+ Record New Transaction"
                  onAction={() => setIsAddTxOpen(true)}
                />
              ) : (
                <div className="rounded-2xl border border-white/5 bg-surface-100/50 backdrop-blur-md overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-elevated/80 border-b border-white/5 text-text-muted">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Transaction / Merchant</th>
                          <th className="px-4 py-3 font-semibold">Category</th>
                          <th className="px-4 py-3 font-semibold">Date</th>
                          <th className="px-4 py-3 font-semibold">Method</th>
                          <th className="px-4 py-3 font-semibold text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredTransactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-surface-elevated/40 transition-colors">
                            <td className="px-4 py-3.5 font-semibold text-white flex items-center gap-2">
                              {tx.type === 'income' ? (
                                <Icons.Income className="h-3.5 w-3.5 text-finance-income" />
                              ) : (
                                <Icons.Expense className="h-3.5 w-3.5 text-finance-expense" />
                              )}
                              <span>{tx.name}</span>
                            </td>
                            <td className="px-4 py-3.5 text-text-secondary">{tx.category}</td>
                            <td className="px-4 py-3.5 text-text-muted">{tx.date}</td>
                            <td className="px-4 py-3.5 text-text-muted">
                              <span className="px-2 py-0.5 rounded bg-surface-elevated border border-white/5 text-[10px]">
                                {tx.paymentMethod}
                              </span>
                            </td>
                            <td className={`px-4 py-3.5 text-right font-bold ${tx.type === 'income' ? 'text-finance-income' : 'text-white'}`}>
                              {tx.type === 'income' ? `+${formatCurrency(tx.amount, currency)}` : formatCurrency(tx.amount, currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* BUDGETS TAB */}
          {activeTab === 'budgets' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-white">Monthly Budgets & Caps</h2>
                  <p className="text-xs text-text-secondary">Track limits and avoid overspending</p>
                </div>
                <Badge variant="violet">Cycle: October 2026</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { name: 'Housing & Utilities', allocated: 40000, spent: 32000, color: 'bg-brand-violet' },
                  { name: 'Software, Tech & Subscriptions', allocated: 20000, spent: 12500, color: 'bg-brand-blue' },
                  { name: 'Food, Groceries & Dining', allocated: 15000, spent: 3840, color: 'bg-finance-income' },
                  { name: 'Leisure & Travel', allocated: 10000, spent: 8500, color: 'bg-amber-400' }
                ].map((b, i) => {
                  const pct = Math.min(100, Math.round((b.spent / b.allocated) * 100));
                  return (
                    <Card key={i} className="glass-card">
                      <CardHeader>
                        <div className="flex justify-between items-center text-xs">
                          <CardTitle className="text-sm">{b.name}</CardTitle>
                          <Badge variant={pct > 80 ? 'warning' : 'neutral'}>{pct}% used</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="w-full h-2.5 rounded-full bg-surface-elevated overflow-hidden">
                          <div className={`h-full rounded-full ${b.color}`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-text-muted">
                          <span>Spent: {formatCurrency(b.spent, currency)}</span>
                          <span>Budget: {formatCurrency(b.allocated, currency)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* ANALYTICS TAB */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Financial Analytics & Runway</h2>
                <p className="text-xs text-text-secondary">High-level distribution of capital and burn metrics</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GlassPanel intensity="medium" className="p-6 space-y-2">
                  <span className="text-xs text-text-muted">Net Cash Margin</span>
                  <p className="text-2xl font-extrabold text-finance-income">
                    {Math.round((netSavings / (totalIncome || 1)) * 100)}%
                  </p>
                  <p className="text-[11px] text-text-secondary">Consistent positive delta</p>
                </GlassPanel>

                <GlassPanel intensity="medium" className="p-6 space-y-2">
                  <span className="text-xs text-text-muted">Average Expense Velocity</span>
                  <p className="text-2xl font-extrabold text-white">
                    {formatCurrency(totalExpense / 30, currency)} / day
                  </p>
                  <p className="text-[11px] text-text-secondary">Based on October run rate</p>
                </GlassPanel>

                <GlassPanel intensity="medium" className="p-6 space-y-2">
                  <span className="text-xs text-text-muted">Primary Outflow Category</span>
                  <p className="text-2xl font-extrabold text-brand-glow">Housing</p>
                  <p className="text-[11px] text-text-secondary">66% of all recorded debits</p>
                </GlassPanel>
              </div>
            </div>
          )}

          {/* AI COPILOT TAB */}
          {activeTab === 'ai' && (
            <div className="space-y-6 max-w-3xl">
              <div>
                <h2 className="text-xl font-bold text-white">Gemini 2.5 Financial Copilot</h2>
                <p className="text-xs text-text-secondary">Ask questions about your accounts, receipts, or runway</p>
              </div>

              <GlassPanel glow="violet" intensity="medium" className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Icons.AI className="h-5 w-5 text-brand-glow animate-pulse" />
                  <span className="text-xs font-semibold text-white">Sample Financial Prompts</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    "How can I optimize my monthly subscriptions?",
                    "What was my biggest discretionary expense this month?",
                    "Simulate an emergency fund goal in INR",
                    "Is my current burn rate sustainable for 12 months?"
                  ].map((p, i) => (
                    <button
                      key={i}
                      onClick={() => toast({ title: 'AI Copilot Ready', description: `Analyzing query: "${p}"`, type: 'info' })}
                      className="text-left p-3 rounded-xl bg-surface-default/60 border border-white/5 hover:border-brand-violet/40 text-xs text-text-secondary hover:text-white transition-all"
                    >
                      "{p}"
                    </button>
                  ))}
                </div>
              </GlassPanel>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h2 className="text-xl font-bold text-white">Platform Settings</h2>
                <p className="text-xs text-text-secondary">Personalize currency, theme tokens, and accessibility</p>
              </div>

              <Card className="glass-card space-y-6 p-6">
                <div>
                  <label className="text-xs font-bold text-white block mb-1">Default Base Currency</label>
                  <p className="text-xs text-text-secondary mb-3">
                    Used for all ledger calculations, totals, and report downloads. Defaults to INR (₹).
                  </p>
                  <select
                    value={currency}
                    onChange={async (e) => {
                      const newCurr = e.target.value as CurrencyCode;
                      setCurrency(newCurr);
                      await updateProfile({ defaultCurrency: newCurr });
                      toast({ title: 'Currency Updated', description: `Base currency changed to ${newCurr}`, type: 'success' });
                    }}
                    className="h-10 px-3 rounded-xl bg-surface-elevated border border-white/10 text-xs text-text-primary"
                  >
                    {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                      <option key={c.code} value={c.code} className="bg-surface-elevated text-white">
                        {c.code} ({c.symbol}) — {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white">Prefers Reduced Motion</p>
                    <p className="text-[11px] text-text-secondary">Disables 3D physics and spring animations for accessibility</p>
                  </div>
                  <Badge variant="violet">System Aware</Badge>
                </div>
              </Card>
            </div>
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

      {/* RECORD TRANSACTION MODAL DIALOG */}
      <Dialog
        open={isAddTxOpen}
        onClose={() => setIsAddTxOpen(false)}
        title="Record New Transaction"
        description="Add a debit, credit, or account transfer to your ledger."
      >
        <form onSubmit={handleAddTransaction} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">Transaction Type</label>
            <div className="flex gap-2">
              {(['expense', 'income', 'transfer'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTxType(type)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize border transition-colors ${
                    txType === type
                      ? 'bg-brand-violet/20 border-brand-violet text-white'
                      : 'border-white/5 bg-surface-elevated text-text-secondary'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">Category</label>
            <select
              value={txCategory}
              onChange={(e) => setTxCategory(e.target.value)}
              className="flex h-11 w-full rounded-xl border border-white/10 bg-surface-elevated/60 px-4 py-2.5 text-xs text-text-primary focus:border-brand-violet focus:outline-none"
            >
              <option value="dining">Dining & Food</option>
              <option value="housing">Housing & Rent</option>
              <option value="groceries">Groceries & Household</option>
              <option value="tech">Tech & SaaS</option>
              <option value="travel">Travel & Commute</option>
              <option value="salary">Salary & Inflow</option>
              <option value="investment">Investment & Savings</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">Merchant / Description</label>
            <Input
              required
              placeholder="e.g. Swiggy, Apple Store, Client Invoice"
              value={txName}
              onChange={(e) => setTxName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">
              Amount ({currency} {SUPPORTED_CURRENCIES[currency].symbol})
            </label>
            <Input
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={txAmount}
              onChange={(e) => setTxAmount(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddTxOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Transaction
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
