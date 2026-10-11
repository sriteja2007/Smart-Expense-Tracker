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
  type SavingsGoal,
  type FinancialAccount,
  type CurrencyCode
} from '@lumaspend/shared';

interface SavingsGoalManagerProps {
  accounts: FinancialAccount[];
  currency: CurrencyCode;
}

export const SavingsGoalManager: React.FC<SavingsGoalManagerProps> = ({ accounts, currency }) => {
  const { toast } = useToast();

  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [contributingGoal, setContributingGoal] = useState<SavingsGoal | null>(null);
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);

  // Create Form State
  const [formName, setFormName] = useState('');
  const [formTargetAmount, setFormTargetAmount] = useState('');
  const [formTargetDate, setFormTargetDate] = useState('');
  const [formFundingMode, setFormFundingMode] = useState<'explicit_contribution' | 'linked_account'>('explicit_contribution');
  const [formLinkedAccountId, setFormLinkedAccountId] = useState<string>(accounts[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Contribution Form State
  const [contribAmount, setContribAmount] = useState('');
  const [contribSourceAccountId, setContribSourceAccountId] = useState(accounts[0]?.id || '');

  const loadGoals = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await FinancialApi.listGoals();
      setGoals(data);
    } catch (err) {
      toast({
        title: 'Error loading goals',
        description: err instanceof Error ? err.message : 'Please try again',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetAmt = parseFloat(formTargetAmount);
    if (isNaN(targetAmt) || targetAmt <= 0) {
      toast({ title: 'Invalid target amount', description: 'Enter a valid target', type: 'error' });
      return;
    }

    try {
      setIsSubmitting(true);
      await FinancialApi.createGoal({
        name: formName.trim(),
        targetAmountMinorUnits: toMinorUnits(targetAmt, currency),
        currency,
        targetDateUtc: formTargetDate ? new Date(formTargetDate).toISOString() : undefined,
        fundingMode: formFundingMode,
        linkedAccountId: formFundingMode === 'linked_account' ? formLinkedAccountId : undefined,
        color: '#10B981',
        icon: 'Target'
      });

      toast({ title: 'Goal created', description: 'Savings goal activated', type: 'success' });
      setIsCreateOpen(false);
      setFormName('');
      setFormTargetAmount('');
      setFormTargetDate('');
      loadGoals();
    } catch (err) {
      toast({
        title: 'Failed to create goal',
        description: err instanceof Error ? err.message : 'Please check your inputs',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributingGoal) return;
    const amountVal = parseFloat(contribAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      toast({ title: 'Invalid amount', description: 'Enter a positive amount', type: 'error' });
      return;
    }

    try {
      setIsSubmitting(true);
      await FinancialApi.contributeToGoal(
        contributingGoal.id,
        toMinorUnits(amountVal, currency),
        contribSourceAccountId
      );

      toast({ title: 'Contribution recorded', description: 'Funds allocated to goal', type: 'success' });
      setContributingGoal(null);
      setContribAmount('');
      loadGoals();
    } catch (err) {
      toast({
        title: 'Contribution failed',
        description: err instanceof Error ? err.message : 'Unable to deduct balance',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGoal = async () => {
    if (!deletingGoalId) return;
    try {
      setIsSubmitting(true);
      await FinancialApi.deleteGoal(deletingGoalId);
      toast({ title: 'Goal deleted', description: 'Savings goal removed', type: 'success' });
      setDeletingGoalId(null);
      loadGoals();
    } catch (err) {
      toast({
        title: 'Failed to delete goal',
        description: err instanceof Error ? err.message : 'Please try again',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Savings Goals & Milestones</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Plan capital targets and track required daily and monthly savings pace
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setFormName('');
            setFormTargetAmount('');
            setFormTargetDate('');
            setFormFundingMode('explicit_contribution');
            if (accounts[0]) setFormLinkedAccountId(accounts[0].id);
            setIsCreateOpen(true);
          }}
          className="text-xs"
        >
          <Icons.Plus className="h-3.5 w-3.5 mr-1" />
          New Savings Goal
        </Button>
      </div>

      {/* Loading & Empty States */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <GlassPanel key={i} intensity="subtle" className="p-6 h-44 animate-pulse bg-white/5" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <GlassPanel intensity="subtle" className="p-10 text-center space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
            <Icons.Target className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">No Savings Goals Set Yet</h3>
            <p className="text-xs text-text-muted mt-1 max-w-md mx-auto">
              Create an Emergency Fund, Travel Vacation, or Vehicle goal. Choose between explicit deposits or linking directly to a savings wallet balance.
            </p>
          </div>
          <Button size="sm" variant="primary" onClick={() => setIsCreateOpen(true)} className="text-xs">
            <Icons.Plus className="h-3.5 w-3.5 mr-1" />
            Set Your First Goal
          </Button>
        </GlassPanel>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((g) => {
            const targetDec = fromMinorUnits(g.targetAmountMinorUnits, currency);
            const currentDec = fromMinorUnits(g.currentAmountMinorUnits, currency);
            const isCompleted = g.status === 'completed' || g.currentAmountMinorUnits >= g.targetAmountMinorUnits;
            const pct = Math.min(100, g.progressPercent || 0);

            const isLinked = g.fundingMode === 'linked_account';
            const linkedAcc = isLinked ? accounts.find((a) => a.id === g.linkedAccountId) : null;

            return (
              <Card
                key={g.id}
                className={`glass-card p-5 space-y-4 border transition-all ${
                  isCompleted
                    ? 'border-emerald-500/30 bg-emerald-950/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl border border-white/10 bg-emerald-500/10 text-emerald-400">
                      <Icons.Target className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        {g.name}
                        {isCompleted && (
                          <Badge variant="success" className="text-[10px]">
                            Completed
                          </Badge>
                        )}
                      </h4>
                      <p className="text-[11px] text-text-muted flex items-center gap-2 mt-0.5">
                        {isLinked ? (
                          <span className="text-indigo-300 font-medium">
                            Linked: {linkedAcc ? linkedAcc.name : 'Wallet'}
                          </span>
                        ) : (
                          <span>Manual Deposits</span>
                        )}
                        {g.daysRemaining !== undefined && (
                          <span>• {g.daysRemaining} days remaining</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {!isLinked && !isCompleted && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setContributingGoal(g);
                          setContribAmount('');
                          if (accounts[0]) setContribSourceAccountId(accounts[0].id);
                        }}
                        className="h-7 px-2 text-xs text-brand-glow hover:bg-brand-violet/10"
                        title="Contribute funds"
                      >
                        + Deposit
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingGoalId(g.id)}
                      className="h-7 w-7 p-0 text-text-muted hover:text-rose-400"
                      title="Delete goal"
                    >
                      <Icons.Trash className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-text-muted">
                      Saved: <strong className="text-white font-mono">{formatCurrency(currentDec, currency)}</strong> of{' '}
                      <strong className="text-white font-mono">{formatCurrency(targetDec, currency)}</strong>
                    </span>
                    <span className="font-bold text-emerald-400">{pct}%</span>
                  </div>
                  <div className="w-full bg-surface-elevated/80 h-2.5 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="h-full rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.4)] transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Required Pace Calculation Matrix */}
                {!isCompleted && g.targetDateUtc && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 bg-white/[0.02] p-2.5 rounded-xl text-center">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-text-muted block">Required Daily Pace</span>
                      <span className="text-xs font-bold text-white font-mono">
                        {g.requiredDailyPaceMinorUnits !== undefined
                          ? `${formatCurrency(fromMinorUnits(g.requiredDailyPaceMinorUnits, currency), currency)}/day`
                          : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-text-muted block">Required Monthly Pace</span>
                      <span className="text-xs font-bold text-brand-glow font-mono">
                        {g.requiredMonthlyPaceMinorUnits !== undefined
                          ? `${formatCurrency(fromMinorUnits(g.requiredMonthlyPaceMinorUnits, currency), currency)}/mo`
                          : '—'}
                      </span>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* CREATE GOAL DIALOG */}
      <Dialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Savings Goal"
        description="Plan capital targets and required savings pace"
      >
        <form onSubmit={handleCreateGoal} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1.5">
              Goal Name
            </label>
            <Input
              placeholder="e.g. Emergency Fund, New Laptop"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
              className="bg-surface-elevated text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1.5">
              Target Amount ({currency})
            </label>
            <Input
              type="number"
              step="any"
              placeholder="e.g. 50000"
              value={formTargetAmount}
              onChange={(e) => setFormTargetAmount(e.target.value)}
              required
              className="bg-surface-elevated text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1.5">
              Target Date (Optional)
            </label>
            <Input
              type="date"
              value={formTargetDate}
              onChange={(e) => setFormTargetDate(e.target.value)}
              className="bg-surface-elevated text-xs text-white"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1.5">
              Funding Mode
            </label>
            <select
              aria-label="Funding Mode"
              value={formFundingMode}
              onChange={(e) => setFormFundingMode(e.target.value as any)}
              className="w-full bg-surface-elevated border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            >
              <option value="explicit_contribution">
                Manual Contributions (Deposit money explicitly into goal)
              </option>
              <option value="linked_account">
                Linked Account Balance (Directly tracks balance of an eligible account)
              </option>
            </select>
          </div>

          {formFundingMode === 'linked_account' && (
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1.5">
                Linked Wallet / Account
              </label>
              <select
                aria-label="Linked Wallet or Account"
                value={formLinkedAccountId}
                onChange={(e) => setFormLinkedAccountId(e.target.value)}
                className="w-full bg-surface-elevated border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatCurrency(fromMinorUnits(a.balanceMinorUnits, a.currency), a.currency)})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-indigo-300 mt-1">
                Goal progress will dynamically reflect this account's balance, avoiding double counting.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Goal'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* CONTRIBUTE DIALOG */}
      <Dialog
        open={!!contributingGoal}
        onClose={() => setContributingGoal(null)}
        title={`Contribute to "${contributingGoal?.name || ''}"`}
      >
        <form onSubmit={handleContribute} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1.5">
              Contribution Amount ({currency})
            </label>
            <Input
              type="number"
              step="any"
              placeholder="e.g. 5000"
              value={contribAmount}
              onChange={(e) => setContribAmount(e.target.value)}
              required
              className="bg-surface-elevated text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1.5">
              Deduct from Source Account
            </label>
            <select
              aria-label="Deduct from Source Account"
              value={contribSourceAccountId}
              onChange={(e) => setContribSourceAccountId(e.target.value)}
              className="w-full bg-surface-elevated border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({formatCurrency(fromMinorUnits(a.balanceMinorUnits, a.currency), a.currency)})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
            <Button type="button" variant="ghost" size="sm" onClick={() => setContributingGoal(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : 'Confirm Deposit'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* DELETE CONFIRM DIALOG */}
      <Dialog
        open={!!deletingGoalId}
        onClose={() => setDeletingGoalId(null)}
        title="Delete Savings Goal"
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-text-muted">
            Are you sure you want to delete this savings goal? This will not affect your account balances.
          </p>
          <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
            <Button type="button" variant="ghost" size="sm" onClick={() => setDeletingGoalId(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleDeleteGoal}
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
