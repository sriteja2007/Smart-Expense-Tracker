import React from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title = 'No transactions recorded',
  description = 'Start tracking your expenses and incomes to unlock smart insights.',
  actionLabel,
  onAction
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-14 text-center rounded-2xl border border-white/5 bg-surface-100/30">
      <div className="p-4 rounded-2xl bg-surface-elevated border border-white/10 text-brand-glow mb-4 shadow-sm">
        {icon || <Icons.Wallet className="h-7 w-7" />}
      </div>
      <h3 className="text-base font-bold text-white mb-1">{title}</h3>
      <p className="text-xs text-text-secondary max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
