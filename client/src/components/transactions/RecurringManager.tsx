import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Icons } from '@/components/icons';
import { useToast } from '@/components/ui/toast';
import { FinancialApi } from '@/lib/financial-api';
import {
  toMinorUnits,
  type RecurringSchedule,
  type FinancialAccount,
  type Category,
  type CurrencyCode,
  type RecurringFrequency,
  type TransactionType
} from '@lumaspend/shared';

interface RecurringManagerProps {
  schedules: RecurringSchedule[];
  accounts: FinancialAccount[];
  categories: Category[];
  currency: CurrencyCode;
  onRefresh: () => void;
}

export const RecurringManager: React.FC<RecurringManagerProps> = ({
  schedules,
  accounts,
  categories,
  currency,
  onRefresh
}) => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New rule form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [sourceAccountId, setSourceAccountId] = useState(accounts[0]?.id || '');
  const [categoryId, setCategoryId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [merchantName, setMerchantName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleProcessDue = async () => {
    try {
      setIsProcessing(true);
      const res = await FinancialApi.processDueRecurring();
      if (res.processedCount > 0) {
        toast({
          title: 'Recurring Processed',
          description: `Generated ${res.processedCount} transaction(s) from due schedules.`,
          type: 'success'
        });
      } else {
        toast({
          title: 'All Up-to-Date',
          description: 'No recurring schedules are currently due for execution.',
          type: 'info'
        });
      }
      onRefresh();
    } catch (err) {
      toast({
        title: 'Processing Failed',
        description: err instanceof Error ? err.message : 'Failed to execute due recurring items',
        type: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleActive = async (rule: RecurringSchedule) => {
    try {
      await FinancialApi.updateRecurring(rule.id, { isActive: !rule.isActive });
      toast({
        title: rule.isActive ? 'Schedule Paused' : 'Schedule Resumed',
        description: `${rule.description} is now ${rule.isActive ? 'paused' : 'active'}.`,
        type: 'info'
      });
      onRefresh();
    } catch (err) {
      toast({
        title: 'Action Failed',
        description: err instanceof Error ? err.message : 'Could not update rule state',
        type: 'error'
      });
    }
  };

  const handleDeleteRule = async (id: string, name: string) => {
    if (!window.confirm(`Delete recurring schedule "${name}"?`)) return;
    try {
      await FinancialApi.deleteRecurring(id);
      toast({
        title: 'Schedule Deleted',
        description: `Removed "${name}" from recurring schedules.`,
        type: 'success'
      });
      onRefresh();
    } catch (err) {
      toast({
        title: 'Delete Failed',
        description: err instanceof Error ? err.message : 'Could not delete recurring schedule',
        type: 'error'
      });
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Please enter a valid amount.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Please enter a description.');
      return;
    }
    if (!sourceAccountId) {
      setErrorMsg('Please select an account.');
      return;
    }

    try {
      setIsSubmitting(true);
      await FinancialApi.createRecurring({
        type,
        amountMinorUnits: toMinorUnits(numAmount, currency),
        currency,
        sourceAccountId,
        categoryId: categoryId || undefined,
        description: description.trim(),
        merchantName: merchantName.trim() || undefined,
        frequency,
        timezone: 'Asia/Kolkata',
        startDateUtc: new Date(startDate).toISOString()
      });

      toast({
        title: 'Schedule Created',
        description: `Created recurring ${frequency} schedule for ${description}.`,
        type: 'success'
      });
      setIsAddOpen(false);
      setDescription('');
      setAmount('');
      setMerchantName('');
      onRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Recurring Schedules & Subscriptions</h2>
          <p className="text-xs text-text-secondary">Automated recurring billing, subscriptions, and periodic obligations</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="glass"
            size="sm"
            onClick={handleProcessDue}
            disabled={isProcessing}
            className="text-xs text-brand-glow border-brand-violet/30"
          >
            {isProcessing ? (
              <span className="flex items-center gap-1.5">
                <Icons.Refresh className="h-3.5 w-3.5 animate-spin" />
                Processing...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Icons.Refresh className="h-3.5 w-3.5" />
                Process Due Items
              </span>
            )}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddOpen(true)}
            className="text-xs font-semibold"
          >
            <span>+ Add Schedule</span>
          </Button>
        </div>
      </div>

      {schedules.length === 0 ? (
        <Card className="glass-card-interactive p-8 text-center space-y-3">
          <Icons.Clock className="h-10 w-10 text-brand-violet mx-auto opacity-60" />
          <h3 className="text-sm font-bold text-white">No Recurring Schedules Set</h3>
          <p className="text-xs text-text-muted max-w-sm mx-auto">
            Set up automatic reminders for Netflix, rent, salaries, or gym memberships to keep your ledger up to date.
          </p>
          <Button variant="primary" size="sm" onClick={() => setIsAddOpen(true)}>
            + Create First Recurring Schedule
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schedules.map((rule) => {
            const acc = accounts.find((a) => a.id === rule.sourceAccountId);
            return (
              <Card key={rule.id} className="glass-card-interactive flex flex-col justify-between p-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-white">{rule.description}</h4>
                      <p className="text-[11px] text-text-muted">
                        {acc?.name || 'Wallet'} • {rule.merchantName || 'Direct'}
                      </p>
                    </div>
                    <Badge variant={rule.isActive ? 'income' : 'default'} className="text-[10px]">
                      {rule.isActive ? 'Active' : 'Paused'}
                    </Badge>
                  </div>

                  <div className="pt-2 flex items-baseline justify-between">
                    <span className="text-lg font-extrabold text-white">
                      ₹{(rule.amountMinorUnits / 100).toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs font-semibold uppercase text-brand-glow tracking-wider">
                      {rule.frequency}
                    </span>
                  </div>

                  <div className="text-[11px] text-text-secondary pt-1 space-y-0.5">
                    <p>
                      Next Run: <span className="text-white font-mono">{rule.nextRunDateUtc.slice(0, 10)}</span>
                    </p>
                    {rule.lastRunDateUtc && (
                      <p className="text-text-muted">
                        Last Run: <span className="font-mono">{rule.lastRunDateUtc.slice(0, 10)}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleActive(rule)}
                    className="text-xs text-text-secondary hover:text-white"
                  >
                    {rule.isActive ? (
                      <span className="flex items-center gap-1.5 text-amber-300">
                        <Icons.Pause className="h-3 w-3" />
                        Pause
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-emerald-300">
                        <Icons.Play className="h-3 w-3" />
                        Resume
                      </span>
                    )}
                  </Button>
                  <button
                    type="button"
                    onClick={() => handleDeleteRule(rule.id, rule.description)}
                    className="p-1.5 text-text-muted hover:text-finance-expense transition-colors"
                    title="Delete schedule"
                  >
                    <Icons.Trash className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Recurring Rule Dialog */}
      <Dialog
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Create Recurring Schedule"
        description="Set up automatic period-based transaction rules."
        className="max-w-md"
      >
        <form onSubmit={handleCreateRule} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-finance-expense/10 border border-finance-expense/30 text-xs text-rose-300 flex items-center gap-2">
              <Icons.Error className="h-4 w-4 shrink-0 text-finance-expense" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1">
              Description <span className="text-finance-expense">*</span>
            </label>
            <Input
              placeholder="e.g. Netflix 4K, House Rent, Salary"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">
                Amount ({currency}) <span className="text-finance-expense">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
                className="w-full h-10 px-3 rounded-xl bg-surface-elevated border border-white/10 text-xs text-text-primary focus:outline-none focus:border-brand-violet"
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TransactionType)}
                className="w-full h-10 px-3 rounded-xl bg-surface-elevated border border-white/10 text-xs text-text-primary focus:outline-none focus:border-brand-violet"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">Account</label>
              <select
                value={sourceAccountId}
                onChange={(e) => setSourceAccountId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-surface-elevated border border-white/10 text-xs text-text-primary focus:outline-none focus:border-brand-violet"
                required
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">Merchant / Payee</label>
              <Input
                placeholder="e.g. Netflix, Landlord"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-surface-elevated border border-white/10 text-xs text-text-primary focus:outline-none focus:border-brand-violet"
            >
              <option value="">Uncategorized</option>
              {categories
                .filter((c) => c.type === type)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Schedule'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
