import React, { useState, useEffect, useCallback } from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { FinancialApi } from '@/lib/financial-api';
import {
  formatCurrency,
  toMinorUnits,
  fromMinorUnits,
  type Budget,
  type FinancialCategory,
  type CurrencyCode
} from '@lumaspend/shared';

interface BudgetManagerProps {
  categories: FinancialCategory[];
  currency: CurrencyCode;
}

export const BudgetManager: React.FC<BudgetManagerProps> = ({ categories, currency }) => {
  const { toast } = useToast();
  const now = new Date();

  const [selectedMonth, setSelectedMonth] = useState(now.getUTCMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getUTCFullYear());
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deletingBudgetId, setDeletingBudgetId] = useState<string | null>(null);

  // Form states
  const [formCategoryId, setFormCategoryId] = useState<string>('OVERALL');
  const [formLimitAmount, setFormLimitAmount] = useState<string>('');
  const [formThresholdPct, setFormThresholdPct] = useState<number>(80);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAlerts, setIsCheckingAlerts] = useState(false);

  const loadBudgets = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await FinancialApi.listBudgets(selectedMonth, selectedYear);
      setBudgets(data);
    } catch (err) {
      toast({
        title: 'Error loading budgets',
        description: err instanceof Error ? err.message : 'Please try again',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, selectedYear, toast]);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(formLimitAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      toast({ title: 'Invalid limit', description: 'Please enter a positive limit amount', type: 'error' });
      return;
    }

    try {
      setIsSubmitting(true);
      await FinancialApi.createBudget({
        categoryId: formCategoryId === 'OVERALL' ? undefined : formCategoryId,
        periodMonth: selectedMonth,
        periodYear: selectedYear,
        limitAmountMinorUnits: toMinorUnits(amountVal, currency),
        alertThresholdPct: formThresholdPct,
        currency
      });

      toast({ title: 'Budget created', description: 'Your budget cap is now active', type: 'success' });
      setIsCreateOpen(false);
      setFormLimitAmount('');
      setFormCategoryId('OVERALL');
      setFormThresholdPct(80);
      loadBudgets();
    } catch (err) {
      toast({
        title: 'Failed to create budget',
        description: err instanceof Error ? err.message : 'Conflict or invalid input',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBudget) return;
    const amountVal = parseFloat(formLimitAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      toast({ title: 'Invalid limit', description: 'Please enter a positive limit amount', type: 'error' });
      return;
    }

    try {
      setIsSubmitting(true);
      await FinancialApi.updateBudget(editingBudget.id, {
        limitAmountMinorUnits: toMinorUnits(amountVal, currency),
        alertThresholdPct: formThresholdPct
      });

      toast({ title: 'Budget updated', description: 'Budget parameters updated successfully', type: 'success' });
      setEditingBudget(null);
      setFormLimitAmount('');
      loadBudgets();
    } catch (err) {
      toast({
        title: 'Failed to update budget',
        description: err instanceof Error ? err.message : 'Please try again',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBudget = async () => {
    if (!deletingBudgetId) return;
    try {
      setIsSubmitting(true);
      await FinancialApi.deleteBudget(deletingBudgetId);
      toast({ title: 'Budget deleted', description: 'Budget removed from this period', type: 'success' });
      setDeletingBudgetId(null);
      loadBudgets();
    } catch (err) {
      toast({
        title: 'Failed to delete budget',
        description: err instanceof Error ? err.message : 'Please try again',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckAlerts = async () => {
    try {
      setIsCheckingAlerts(true);
      const res = await FinancialApi.checkBudgetAlerts(selectedMonth, selectedYear);
      if (res.triggeredCount > 0) {
        toast({
          title: `Alert Triggered (${res.triggeredCount})`,
          description: 'Emitted warning for thresholds crossed without duplicates.',
          type: 'warning'
        });
      } else {
        toast({
          title: 'All Budgets On Track',
          description: 'No new alert thresholds exceeded for this period.',
          type: 'success'
        });
      }
    } catch (err) {
      toast({
        title: 'Alert verification failed',
        description: err instanceof Error ? err.message : 'Please try again',
        type: 'error'
      });
    } finally {
      setIsCheckingAlerts(false);
    }
  };

  const openEditModal = (b: Budget) => {
    setEditingBudget(b);
    setFormLimitAmount(fromMinorUnits(b.limitAmountMinorUnits, currency).toString());
    setFormThresholdPct(b.alertThresholdPct || 80);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Budgets & Spending Limits</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Set category envelopes and overall monthly spending ceilings
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period selector */}
          <div className="flex items-center gap-1.5 bg-surface-elevated/80 border border-white/10 rounded-xl px-2.5 py-1.5">
            <select
              aria-label="Select month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer"
            >
              {monthNames.map((name, idx) => (
                <option key={name} value={idx + 1} className="bg-surface-elevated text-white">
                  {name}
                </option>
              ))}
            </select>
            <span className="text-text-muted text-xs">/</span>
            <select
              aria-label="Select year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y} className="bg-surface-elevated text-white">
                  {y}
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCheckAlerts}
            disabled={isCheckingAlerts}
            className="border-white/10 text-xs"
          >
            <Icons.Bell className="h-3.5 w-3.5 mr-1 text-brand-glow" />
            {isCheckingAlerts ? 'Checking...' : 'Check Alerts'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setFormLimitAmount('');
              setFormCategoryId('OVERALL');
              setFormThresholdPct(80);
              setIsCreateOpen(true);
            }}
            className="text-xs"
          >
            <Icons.Plus className="h-3.5 w-3.5 mr-1" />
            New Budget
          </Button>
        </div>
      </div>

      {/* Loading & Empty States */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <GlassPanel key={i} className="p-6 h-40 animate-pulse bg-white/5" />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <GlassPanel intensity="subtle" className="p-10 text-center space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-brand-violet/10 border border-brand-violet/20 flex items-center justify-center mx-auto text-brand-violet">
            <Icons.Wallet className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">No active budgets for {monthNames[selectedMonth - 1]} {selectedYear}</h3>
            <p className="text-xs text-text-muted mt-1 max-w-md mx-auto">
              Create an overall monthly ceiling or specific category budgets to prevent unexpected overspending.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="text-xs"
          >
            <Icons.Plus className="h-3.5 w-3.5 mr-1" />
            Create First Budget
          </Button>
        </GlassPanel>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map((b) => {
            const isOverall = !b.categoryId;
            const cat = categories.find((c) => c.id === b.categoryId);
            const title = isOverall ? 'Overall Monthly Ceiling' : (cat?.name || 'Category Budget');
            const limitDec = fromMinorUnits(b.limitAmountMinorUnits, currency);
            const spentDec = fromMinorUnits(b.spentAmountMinorUnits || 0, currency);
            const remainingDec = fromMinorUnits(b.remainingAmountMinorUnits || 0, currency);
            const pct = b.consumedPercent || 0;
            const isExceeded = b.isExceeded || pct >= 100;
            const isNearLimit = pct >= (b.alertThresholdPct || 75) && !isExceeded;

            const progressColor = isExceeded
              ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
              : isNearLimit
              ? 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
              : 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.3)]';

            return (
              <Card
                key={b.id}
                className={`glass-card p-5 space-y-4 border transition-all ${
                  isExceeded
                    ? 'border-rose-500/30 bg-rose-950/10'
                    : isNearLimit
                    ? 'border-amber-500/30 bg-amber-950/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2.5 rounded-xl border border-white/10"
                      style={{ backgroundColor: isOverall ? '#4F46E522' : (cat?.color ? `${cat.color}22` : '#6366F122') }}
                    >
                      <Icons.PieChart
                        className="h-4 w-4"
                        style={{ color: isOverall ? '#818CF8' : (cat?.color || '#818CF8') }}
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        {title}
                        {isOverall && <Badge variant="violet" className="text-[10px] px-1.5 py-0">All Expenses</Badge>}
                      </h4>
                      <p className="text-[11px] text-text-muted">
                        Alert threshold set at {b.alertThresholdPct}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(b)}
                      className="h-7 w-7 p-0 text-text-muted hover:text-white"
                      title="Edit Budget"
                    >
                      <Icons.Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingBudgetId(b.id)}
                      className="h-7 w-7 p-0 text-text-muted hover:text-rose-400"
                      title="Delete Budget"
                    >
                      <Icons.Trash className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-text-muted">Consumed: {pct}%</span>
                    <span className={`font-semibold ${isExceeded ? 'text-rose-400' : isNearLimit ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {isExceeded ? 'EXCEEDED' : isNearLimit ? 'WARNING' : 'ON TRACK'}
                    </span>
                  </div>
                  <div className="w-full bg-surface-elevated/80 h-2.5 rounded-full overflow-hidden border border-white/5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-center">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-text-muted block">Budget Limit</span>
                    <span className="text-xs font-bold text-white font-mono">{formatCurrency(limitDec, currency)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-text-muted block">Actual Spent</span>
                    <span className={`text-xs font-bold font-mono ${isExceeded ? 'text-rose-400' : 'text-white'}`}>
                      {formatCurrency(spentDec, currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-text-muted block">Remaining</span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">
                      {isExceeded ? '₹0.00' : formatCurrency(remainingDec, currency)}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* CREATE BUDGET DIALOG */}
      <Dialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Monthly Budget"
        description="Establish spending limits for specific categories or an overall ceiling"
      >
        <form onSubmit={handleCreateBudget} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1.5">
              Scope / Category
            </label>
            <select
              aria-label="Budget Scope or Category"
              value={formCategoryId}
              onChange={(e) => setFormCategoryId(e.target.value)}
              className="w-full bg-surface-elevated border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-glow"
            >
              <option value="OVERALL">Overall Monthly Cap (All Expenses)</option>
              <optgroup label="Expense Categories">
                {categories
                  .filter((c) => c.type === 'expense')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1.5">
              Limit Amount ({currency})
            </label>
            <Input
              type="number"
              step="any"
              placeholder="e.g. 15000"
              value={formLimitAmount}
              onChange={(e) => setFormLimitAmount(e.target.value)}
              required
              className="bg-surface-elevated text-xs"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-text-secondary">Alert Threshold</span>
              <span className="text-brand-glow font-bold">{formThresholdPct}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="100"
              step="5"
              value={formThresholdPct}
              onChange={(e) => setFormThresholdPct(parseInt(e.target.value, 10))}
              className="w-full accent-brand-violet cursor-pointer"
            />
            <p className="text-[11px] text-text-muted mt-1">
              Trigger in-app notification when spending reaches this milestone.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Budget'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* EDIT BUDGET DIALOG */}
      <Dialog
        open={!!editingBudget}
        onClose={() => setEditingBudget(null)}
        title="Edit Budget Limit"
      >
        <form onSubmit={handleUpdateBudget} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1.5">
              New Limit Amount ({currency})
            </label>
            <Input
              type="number"
              step="any"
              placeholder="e.g. 20000"
              value={formLimitAmount}
              onChange={(e) => setFormLimitAmount(e.target.value)}
              required
              className="bg-surface-elevated text-xs"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-text-secondary">Alert Threshold</span>
              <span className="text-brand-glow font-bold">{formThresholdPct}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="100"
              step="5"
              value={formThresholdPct}
              onChange={(e) => setFormThresholdPct(parseInt(e.target.value, 10))}
              className="w-full accent-brand-violet cursor-pointer"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditingBudget(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Update Budget'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* DELETE CONFIRM DIALOG */}
      <Dialog
        open={!!deletingBudgetId}
        onClose={() => setDeletingBudgetId(null)}
        title="Delete Budget"
      >
        <div className="space-y-4">
          <p className="text-xs text-text-muted">
            Are you sure you want to remove this budget limit? Your transaction history will not be affected.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
            <Button variant="ghost" size="sm" onClick={() => setDeletingBudgetId(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteBudget}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
