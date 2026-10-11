import React, { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { FinancialApi } from '@/lib/financial-api';
import {
  formatCurrency,
  fromMinorUnits,
  type AnalyticsSummaryData,
  type AnalyticsTrendPoint,
  type CategoryBreakdownItem,
  type BudgetVsActualItem,
  type FinancialAccount,
  type FinancialCategory,
  type CurrencyCode
} from '@lumaspend/shared';

interface AnalyticsDashboardProps {
  accounts: FinancialAccount[];
  categories: FinancialCategory[];
  currency: CurrencyCode;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ accounts, categories: _categories, currency }) => {
  const { toast } = useToast();

  const [interval, setInterval] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedCategoryId] = useState<string>('');
  const [showAccessibleTable, setShowAccessibleTable] = useState(false);

  const [summary, setSummary] = useState<AnalyticsSummaryData | null>(null);
  const [trends, setTrends] = useState<AnalyticsTrendPoint[]>([]);
  const [breakdown, setBreakdown] = useState<CategoryBreakdownItem[]>([]);
  const [budgetVsActual, setBudgetVsActual] = useState<BudgetVsActualItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      const now = new Date();
      const month = now.getUTCMonth() + 1;
      const year = now.getUTCFullYear();

      const [sumData, trendData, breakData, bvaData] = await Promise.all([
        FinancialApi.getAnalyticsSummary({
          accountId: selectedAccountId || undefined,
          categoryId: selectedCategoryId || undefined
        }),
        FinancialApi.getAnalyticsTrends({
          interval,
          accountId: selectedAccountId || undefined,
          categoryId: selectedCategoryId || undefined
        }),
        FinancialApi.getCategoryBreakdown({
          month,
          year,
          accountId: selectedAccountId || undefined
        }),
        FinancialApi.getBudgetVsActual(month, year)
      ]);

      setSummary(sumData);
      setTrends(trendData);
      setBreakdown(breakData);
      setBudgetVsActual(bvaData);
    } catch (err) {
      toast({
        title: 'Error loading analytics',
        description: err instanceof Error ? err.message : 'Please try again',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  }, [interval, selectedAccountId, selectedCategoryId, toast]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Formatted chart trends (in major units for readability)
  const chartTrendData = trends.map((t) => ({
    date: t.dateKey,
    Income: fromMinorUnits(t.incomeMinorUnits, currency),
    Expense: fromMinorUnits(t.expenseMinorUnits, currency),
    Net: fromMinorUnits(t.netMinorUnits, currency)
  }));

  // Pie chart data
  const pieColors = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#8B5CF6', '#84CC16'];
  const chartPieData = breakdown.map((b, idx) => ({
    name: b.categoryName,
    value: fromMinorUnits(b.amountMinorUnits, currency),
    color: b.color || pieColors[idx % pieColors.length]
  }));

  // Budget vs Actual chart data
  const chartBvaData = budgetVsActual.map((b) => ({
    category: b.categoryName,
    Budget: fromMinorUnits(b.limitAmountMinorUnits, currency),
    Actual: fromMinorUnits(b.spentAmountMinorUnits, currency),
    OverBudget: b.isOverBudget
  }));

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Financial Intelligence & Analytics</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Real-time cash flow trends, category distribution, and previous period variance
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Interval Toggle */}
          <div className="flex bg-surface-elevated border border-white/10 rounded-xl p-0.5">
            {(['daily', 'weekly', 'monthly'] as const).map((int) => (
              <button
                key={int}
                type="button"
                onClick={() => setInterval(int)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                  interval === int
                    ? 'bg-brand-violet text-white shadow-sm'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                {int.charAt(0).toUpperCase() + int.slice(1)}
              </button>
            ))}
          </div>

          {/* Account Filter */}
          <select
            aria-label="Filter by Account"
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="bg-surface-elevated border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
          >
            <option value="">All Accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          {/* Accessible Table View Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAccessibleTable(!showAccessibleTable)}
            className="text-xs border-white/10"
          >
            <Icons.List className="h-3.5 w-3.5 mr-1" />
            {showAccessibleTable ? 'Hide Table View' : 'Accessible Table'}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {isLoading && !summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <GlassPanel key={i} intensity="subtle" className="p-5 h-28 animate-pulse bg-white/5" />
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card-interactive p-5">
            <CardHeader className="p-0 pb-2">
              <span className="text-[11px] font-semibold text-text-muted uppercase">Total Balance</span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="text-2xl font-extrabold text-white font-mono">
                {formatCurrency(fromMinorUnits(summary.totalBalanceMinorUnits, currency), currency)}
              </div>
              <p className="text-[11px] text-text-muted mt-1">
                Across {summary.accountCount} active accounts
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card-interactive p-5">
            <CardHeader className="p-0 pb-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-semibold text-text-muted uppercase">Monthly Inflow</span>
                <Icons.Income className="h-4 w-4 text-finance-income" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="text-2xl font-extrabold text-white font-mono">
                {formatCurrency(fromMinorUnits(summary.monthlyIncomeMinorUnits, currency), currency)}
              </div>
              <p className="text-[11px] text-finance-income mt-1 font-medium">Eligible verified income</p>
            </CardContent>
          </Card>

          <Card className="glass-card-interactive p-5">
            <CardHeader className="p-0 pb-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-semibold text-text-muted uppercase">Monthly Outflow</span>
                <Icons.Expense className="h-4 w-4 text-finance-expense" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="text-2xl font-extrabold text-white font-mono">
                {formatCurrency(fromMinorUnits(summary.monthlyExpenseMinorUnits, currency), currency)}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                {summary.previousPeriod && (
                  <Badge
                    variant={summary.previousPeriod.expenseDeltaPct > 0 ? 'danger' : 'success'}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {summary.previousPeriod.expenseDeltaPct > 0 ? '+' : ''}
                    {summary.previousPeriod.expenseDeltaPct}% vs prev period
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card-interactive p-5">
            <CardHeader className="p-0 pb-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-semibold text-text-muted uppercase">Net Savings & Rate</span>
                <Icons.Shield className="h-4 w-4 text-brand-glow" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="text-2xl font-extrabold text-brand-glow font-mono">
                {formatCurrency(fromMinorUnits(summary.netSavingsMinorUnits, currency), currency)}
              </div>
              <p className="text-[11px] text-emerald-400 mt-1 font-semibold">
                {summary.savingsRatePct}% savings efficiency preserved
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Flow Trends Chart (2 Columns) */}
        <GlassPanel intensity="medium" className="p-6 lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white">Cash Flow Trend Dynamics</h3>
              <p className="text-[11px] text-text-muted">Income vs Expense evolution ({interval})</p>
            </div>
            <Badge variant="violet" className="capitalize">{interval} Trajectory</Badge>
          </div>

          <div className="h-72 w-full pt-2">
            {chartTrendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-text-muted">
                No trend points recorded for this range
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis
                    dataKey="date"
                    stroke="#94A3B8"
                    fontSize={10}
                    tickFormatter={(val) => (val.length > 5 ? val.slice(5) : val)}
                  />
                  <YAxis stroke="#94A3B8" fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#ffffff15',
                      borderRadius: 12,
                      fontSize: 12,
                      color: '#FFFFFF'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area
                    type="monotone"
                    dataKey="Income"
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#incomeGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="Expense"
                    stroke="#EF4444"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#expenseGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassPanel>

        {/* Category Expense Share (Donut Chart) */}
        <GlassPanel intensity="medium" className="p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white">Expense Distribution</h3>
            <p className="text-[11px] text-text-muted">Share of capital by category</p>
          </div>

          <div className="h-72 w-full flex items-center justify-center">
            {chartPieData.length === 0 ? (
              <span className="text-xs text-text-muted">No expense records found</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#ffffff15',
                      borderRadius: 12,
                      fontSize: 11,
                      color: '#FFFFFF'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassPanel>
      </div>

      {/* Budget vs Actual Comparison Chart */}
      {budgetVsActual.length > 0 && (
        <GlassPanel intensity="medium" className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white">Budget vs. Actual Spending</h3>
              <p className="text-[11px] text-text-muted">Cap limits against actual eligible expenditure</p>
            </div>
            <Badge variant="neutral" className="text-xs">Active Period</Badge>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartBvaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="category" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#ffffff15',
                    borderRadius: 12,
                    fontSize: 12,
                    color: '#FFFFFF'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Budget" fill="#6366F1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Actual" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>
      )}

      {/* Drivers: Largest Expenses & Top Categories */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Largest Expenses */}
          <GlassPanel intensity="subtle" className="p-5 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <Icons.TrendingUp className="h-4 w-4 text-rose-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Top 5 Largest Expenses</h4>
            </div>

            {summary.largestExpenses && summary.largestExpenses.length > 0 ? (
              <div className="divide-y divide-white/5">
                {summary.largestExpenses.map((exp) => (
                  <div key={exp.id} className="py-2.5 flex justify-between items-center gap-3">
                    <div>
                      <p className="text-xs font-semibold text-white">{exp.description}</p>
                      <p className="text-[10px] text-text-muted">
                        {exp.categoryName} • {exp.dateUtc.slice(0, 10)}
                        {exp.merchantName && ` • ${exp.merchantName}`}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-rose-400 font-mono">
                      -{formatCurrency(fromMinorUnits(exp.amountMinorUnits, exp.currency), exp.currency)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted py-3 text-center">No major expenses recorded</p>
            )}
          </GlassPanel>

          {/* Frequently Used Categories */}
          <GlassPanel intensity="subtle" className="p-5 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <Icons.PieChart className="h-4 w-4 text-brand-glow" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Top Categories by Frequency</h4>
            </div>

            {summary.frequentlyUsedCategories && summary.frequentlyUsedCategories.length > 0 ? (
              <div className="divide-y divide-white/5">
                {summary.frequentlyUsedCategories.map((fc) => (
                  <div key={fc.categoryId} className="py-2.5 flex justify-between items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: fc.color }} />
                      <div>
                        <p className="text-xs font-semibold text-white">{fc.categoryName}</p>
                        <p className="text-[10px] text-text-muted">{fc.count} transactions</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-white font-mono">
                      {formatCurrency(fromMinorUnits(fc.totalAmountMinorUnits, currency), currency)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted py-3 text-center">No categories recorded</p>
            )}
          </GlassPanel>
        </div>
      )}

      {/* Accessible Screen-Reader Data Table alternative */}
      {showAccessibleTable && (
        <GlassPanel intensity="deep" className="p-5 space-y-4 border border-brand-violet/30">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Accessible Data Ledger (Screen-Reader Optimized)
            </h4>
            <Badge variant="violet" className="text-[10px]">WCAG 2.1 AA Compliant</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <caption className="sr-only">Financial Trends Summary Table</caption>
              <thead>
                <tr className="border-b border-white/10 text-text-muted">
                  <th scope="col" className="py-2 font-semibold">Date Interval</th>
                  <th scope="col" className="py-2 font-semibold">Income</th>
                  <th scope="col" className="py-2 font-semibold">Expense</th>
                  <th scope="col" className="py-2 font-semibold">Net Savings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {trends.map((t) => (
                  <tr key={t.dateKey}>
                    <td className="py-2 font-mono text-white">{t.dateKey}</td>
                    <td className="py-2 font-mono text-finance-income">
                      {formatCurrency(fromMinorUnits(t.incomeMinorUnits, currency), currency)}
                    </td>
                    <td className="py-2 font-mono text-finance-expense">
                      {formatCurrency(fromMinorUnits(t.expenseMinorUnits, currency), currency)}
                    </td>
                    <td className="py-2 font-mono text-brand-glow">
                      {formatCurrency(fromMinorUnits(t.netMinorUnits, currency), currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassPanel>
      )}
    </div>
  );
};
