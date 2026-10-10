import React, { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icons } from '@/components/icons';
import { useToast } from '@/components/ui/toast';
import { FinancialApi } from '@/lib/financial-api';
import {
  toMinorUnits,
  fromMinorUnits,
  type FinancialAccount,
  type Category,
  type Transaction,
  type CurrencyCode,
  type TransactionType,
  type PaymentMethod
} from '@lumaspend/shared';

interface TransactionDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transaction?: Transaction | null;
  accounts: FinancialAccount[];
  categories: Category[];
  currency: CurrencyCode;
}

export const TransactionDialog: React.FC<TransactionDialogProps> = ({
  open,
  onClose,
  onSuccess,
  transaction,
  accounts,
  categories,
  currency
}) => {
  const { toast } = useToast();
  const isEditing = Boolean(transaction);

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Populate or reset form when modal opens
  useEffect(() => {
    if (open) {
      setErrorMsg(null);
      if (transaction) {
        setType(transaction.type);
        setAmount(fromMinorUnits(transaction.amountMinorUnits, transaction.currency).toString());
        setDescription(transaction.description);
        setMerchantName(transaction.merchantName || '');
        setSourceAccountId(transaction.sourceAccountId || (accounts[0]?.id ?? ''));
        setDestinationAccountId(transaction.destinationAccountId || '');
        setCategoryId(transaction.categoryId || '');
        setDate(transaction.dateUtc ? transaction.dateUtc.slice(0, 10) : new Date().toISOString().slice(0, 10));
        setPaymentMethod(transaction.paymentMethod);
        setNotes(transaction.notes || '');
      } else {
        setType('expense');
        setAmount('');
        setDescription('');
        setMerchantName('');
        setSourceAccountId(accounts[0]?.id || '');
        setDestinationAccountId(accounts[1]?.id || '');
        const defaultCat = categories.find((c) => c.type === 'expense');
        setCategoryId(defaultCat?.id || '');
        setDate(new Date().toISOString().slice(0, 10));
        setPaymentMethod('upi');
        setNotes('');
      }
    }
  }, [open, transaction, accounts, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Please enter a valid amount greater than 0.');
      return;
    }

    if (!description.trim()) {
      setErrorMsg('Please enter a description or payee for this record.');
      return;
    }

    const effectiveSourceAccountId = sourceAccountId || accounts[0]?.id || 'acc-1';

    if (type === 'transfer') {
      if (!destinationAccountId) {
        setErrorMsg('Please select a destination account for the transfer.');
        return;
      }
      if (effectiveSourceAccountId === destinationAccountId) {
        setErrorMsg('Source and destination accounts must be different.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const amountMinorUnits = toMinorUnits(numAmount, currency);
      const parsedDate = date ? new Date(date) : new Date();
      const dateUtc = isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();

      if (isEditing && transaction) {
        await FinancialApi.updateTransaction(transaction.id, {
          type,
          amountMinorUnits,
          description: description.trim(),
          merchantName: merchantName.trim() || undefined,
          sourceAccountId: effectiveSourceAccountId,
          destinationAccountId: type === 'transfer' ? destinationAccountId : undefined,
          categoryId: type !== 'transfer' ? categoryId : undefined,
          dateUtc,
          paymentMethod,
          notes: notes.trim() || undefined
        });
        toast({
          title: 'Transaction Updated',
          description: 'Ledger record and balances refreshed successfully.',
          type: 'success'
        });
      } else {
        await FinancialApi.createTransaction({
          type,
          amountMinorUnits,
          currency,
          description: description.trim(),
          merchantName: merchantName.trim() || undefined,
          sourceAccountId: effectiveSourceAccountId,
          destinationAccountId: type === 'transfer' ? destinationAccountId : undefined,
          categoryId: type !== 'transfer' && categoryId ? categoryId : undefined,
          dateUtc,
          paymentMethod,
          notes: notes.trim() || undefined,
          tags: []
        });
        toast({
          title: 'Transaction Recorded',
          description: `Added ₹${numAmount.toLocaleString('en-IN')} to your ledger.`,
          type: 'success'
        });
      }

      onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCategories = categories.filter((c) => (type === 'transfer' ? false : c.type === type));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Transaction' : 'Record New Transaction'}
      description={isEditing ? 'Modify transaction fields and reconcile balances.' : 'Add an outflow, income, or account transfer.'}
      className="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-finance-expense/10 border border-finance-expense/30 text-xs text-rose-300 flex items-center gap-2">
            <Icons.Error className="h-4 w-4 shrink-0 text-finance-expense" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Type selector */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-surface-elevated border border-white/5">
          <button
            type="button"
            onClick={() => {
              setType('expense');
              const cat = categories.find((c) => c.type === 'expense');
              if (cat) setCategoryId(cat.id);
            }}
            className={`py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              type === 'expense'
                ? 'bg-finance-expense text-white shadow-glow-expense'
                : 'text-text-muted hover:text-white'
            }`}
          >
            <Icons.Expense className="h-3 w-3" />
            <span>Expense</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setType('income');
              const cat = categories.find((c) => c.type === 'income');
              if (cat) setCategoryId(cat.id);
            }}
            className={`py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              type === 'income'
                ? 'bg-finance-income text-white shadow-glow-income'
                : 'text-text-muted hover:text-white'
            }`}
          >
            <Icons.Income className="h-3 w-3" />
            <span>Income</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setType('transfer');
              setCategoryId('');
            }}
            className={`py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              type === 'transfer'
                ? 'bg-brand-violet text-white shadow-glow-violet'
                : 'text-text-muted hover:text-white'
            }`}
          >
            <Icons.Transfer className="h-3 w-3" />
            <span>Transfer</span>
          </button>
        </div>

        {/* Amount & Currency */}
        <div>
          <label className="block text-xs font-semibold text-text-muted mb-1">
            Amount ({currency}) <span className="text-finance-expense">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted">₹</span>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-8 text-base font-bold tracking-tight"
              autoFocus
            />
          </div>
        </div>

        {/* Description / Title */}
        <div>
          <label className="block text-xs font-semibold text-text-muted mb-1">
            Description <span className="text-finance-expense">*</span>
          </label>
          <Input
            placeholder="e.g. Swiggy, Apple Store, Client Retainer"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Merchant / Payee */}
        <div>
          <label className="block text-xs font-semibold text-text-muted mb-1">Merchant / Payee (Optional)</label>
          <Input
            placeholder="e.g. Starbucks Indiranagar"
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
          />
        </div>

        {/* Account Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1">
              {type === 'transfer' ? 'From Account' : 'Account'} <span className="text-finance-expense">*</span>
            </label>
            <select
              value={sourceAccountId || accounts[0]?.id || ''}
              onChange={(e) => setSourceAccountId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-surface-elevated border border-white/10 text-xs text-text-primary focus:outline-none focus:border-brand-violet"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} (₹{(acc.balanceMinorUnits / 100).toLocaleString('en-IN')})
                </option>
              ))}
            </select>
          </div>

          {type === 'transfer' ? (
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">
                To Account <span className="text-finance-expense">*</span>
              </label>
              <select
                value={destinationAccountId || accounts[1]?.id || ''}
                onChange={(e) => setDestinationAccountId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-surface-elevated border border-white/10 text-xs text-text-primary focus:outline-none focus:border-brand-violet"
              >
                {accounts
                  .filter((a) => a.id !== (sourceAccountId || accounts[0]?.id))
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (₹{(acc.balanceMinorUnits / 100).toLocaleString('en-IN')})
                    </option>
                  ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-surface-elevated border border-white/10 text-xs text-text-primary focus:outline-none focus:border-brand-violet"
              >
                <option value="">Uncategorized</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Date and Payment Method */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1">Date</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full h-10 px-3 rounded-xl bg-surface-elevated border border-white/10 text-xs text-text-primary focus:outline-none focus:border-brand-violet"
            >
              <option value="upi">UPI / QR Code</option>
              <option value="card">Credit / Debit Card</option>
              <option value="net_banking">Net Banking</option>
              <option value="cash">Cash</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-text-muted mb-1">Notes / Memo (Optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add tax note, receipt details, or context..."
            rows={2}
            className="w-full p-2.5 rounded-xl bg-surface-elevated border border-white/10 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-violet resize-none"
          />
        </div>

        {/* Dialog Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center gap-1.5">
                <Icons.Refresh className="h-3.5 w-3.5 animate-spin" />
                Saving...
              </span>
            ) : isEditing ? (
              'Save Changes'
            ) : (
              'Save Transaction'
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
