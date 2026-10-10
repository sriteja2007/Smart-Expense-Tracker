import React from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import type { Transaction } from '@lumaspend/shared';

interface DeleteConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  transaction: Transaction | null;
  isDeleting: boolean;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  transaction,
  isDeleting
}) => {
  if (!transaction) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Delete Transaction?"
      description="This action cannot be undone. Account balances will be automatically reversed."
      className="max-w-md"
    >
      <div className="space-y-4 pt-2">
        <div className="p-3.5 rounded-xl bg-surface-elevated border border-white/5 space-y-1 text-xs">
          <p className="font-semibold text-white">{transaction.description}</p>
          <p className="text-text-muted">
            Amount: <span className="text-white font-mono font-bold">₹{(transaction.amountMinorUnits / 100).toLocaleString('en-IN')}</span> • Type: <span className="capitalize">{transaction.type}</span>
          </p>
        </div>

        <div className="p-3 rounded-xl bg-finance-expense/10 border border-finance-expense/30 text-xs text-rose-300 flex items-start gap-2.5">
          <Icons.Warning className="h-4 w-4 shrink-0 text-finance-expense mt-0.5" />
          <span>
            Deleting this record will recalculate your wallet balance. For transfers, both source and destination accounts will be restored.
          </span>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-finance-expense hover:bg-rose-600 text-white"
          >
            {isDeleting ? (
              <span className="flex items-center gap-1.5">
                <Icons.Refresh className="h-3.5 w-3.5 animate-spin" />
                Deleting...
              </span>
            ) : (
              'Confirm Delete'
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
