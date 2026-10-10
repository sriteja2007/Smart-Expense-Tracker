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
  formatCurrency,
  toMinorUnits,
  fromMinorUnits,
  type FinancialAccount,
  type CurrencyCode,
  type AccountType
} from '@lumaspend/shared';

interface AccountSummaryCardsProps {
  accounts: FinancialAccount[];
  currency: CurrencyCode;
  onRefresh: () => void;
}

export const AccountSummaryCards: React.FC<AccountSummaryCardsProps> = ({
  accounts,
  currency,
  onRefresh
}) => {
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('checking');
  const [balance, setBalance] = useState('0');
  const [institutionName, setInstitutionName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const numBalance = parseFloat(balance);
    if (isNaN(numBalance) || numBalance < 0) {
      setErrorMsg('Please enter a valid starting balance (>= 0).');
      return;
    }
    if (!name.trim()) {
      setErrorMsg('Please enter an account name.');
      return;
    }

    try {
      setIsSubmitting(true);
      await FinancialApi.createAccount({
        name: name.trim(),
        type,
        currency,
        initialBalanceMinorUnits: toMinorUnits(numBalance, currency),
        institutionName: institutionName.trim() || undefined
      });

      toast({
        title: 'Wallet Created',
        description: `Added "${name}" with initial balance of ₹${numBalance.toLocaleString('en-IN')}`,
        type: 'success'
      });
      setIsAddOpen(false);
      setName('');
      setBalance('0');
      setInstitutionName('');
      onRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAccountIcon = (accType: AccountType) => {
    switch (accType) {
      case 'savings':
        return <Icons.Shield className="h-4 w-4 text-emerald-400" />;
      case 'credit_card':
        return <Icons.Expense className="h-4 w-4 text-purple-400" />;
      case 'cash':
        return <Icons.Rupee className="h-4 w-4 text-amber-400" />;
      case 'upi_wallet':
        return <Icons.Mobile className="h-4 w-4 text-brand-blue" />;
      default:
        return <Icons.Wallet className="h-4 w-4 text-brand-glow" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Icons.Wallet className="h-4 w-4 text-brand-glow" />
          <span>Active Wallets & Accounts</span>
        </h3>
        <Button
          variant="glass"
          size="sm"
          onClick={() => setIsAddOpen(true)}
          className="text-xs text-text-secondary hover:text-white"
        >
          <Icons.Plus className="h-3 w-3 mr-1" />
          <span>Add Wallet</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {accounts.map((acc) => {
          const decimalBalance = fromMinorUnits(acc.balanceMinorUnits, acc.currency);
          return (
            <Card key={acc.id} className="glass-card-interactive p-4 relative overflow-hidden group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-surface-elevated border border-white/5">
                    {getAccountIcon(acc.type)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{acc.name}</h4>
                    <p className="text-[10px] text-text-muted capitalize">
                      {acc.institutionName || acc.type.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                <Badge variant="default" className="text-[9px] uppercase font-mono">
                  {acc.currency}
                </Badge>
              </div>

              <div className="mt-4">
                <span className="text-lg font-extrabold text-white font-mono">
                  {formatCurrency(decimalBalance, currency)}
                </span>
                <p className="text-[10px] text-text-muted mt-0.5">Liquid Available Balance</p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add Account Dialog */}
      <Dialog
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add New Account / Wallet"
        description="Track cash, checking, savings, credit cards, or UPI accounts."
        className="max-w-md"
      >
        <form onSubmit={handleCreateAccount} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-finance-expense/10 border border-finance-expense/30 text-xs text-rose-300 flex items-center gap-2">
              <Icons.Error className="h-4 w-4 shrink-0 text-finance-expense" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1">
              Account Name <span className="text-finance-expense">*</span>
            </label>
            <Input
              placeholder="e.g. HDFC Salary, ICICI Savings, Paytm Wallet"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">Account Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AccountType)}
                className="w-full h-10 px-3 rounded-xl bg-surface-elevated border border-white/10 text-xs text-text-primary focus:outline-none focus:border-brand-violet"
              >
                <option value="checking">Checking / Salary</option>
                <option value="savings">Savings Account</option>
                <option value="credit_card">Credit Card</option>
                <option value="upi_wallet">UPI Wallet</option>
                <option value="cash">Physical Cash</option>
                <option value="investment">Investment</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">
                Opening Balance ({currency})
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1">
              Bank / Institution (Optional)
            </label>
            <Input
              placeholder="e.g. HDFC Bank, SBI, Zerodha"
              value={institutionName}
              onChange={(e) => setInstitutionName(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Wallet'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
