import React from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to load data',
  message = 'An unexpected network error occurred while retrieving your financial records.',
  onRetry
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-finance-expense/20 bg-finance-expense/5">
      <div className="p-3 rounded-2xl bg-finance-expense/10 border border-finance-expense/30 text-finance-expense mb-4">
        <Icons.Error className="h-6 w-6" />
      </div>
      <h3 className="text-base font-bold text-white mb-1">{title}</h3>
      <p className="text-xs text-text-secondary max-w-md mb-6">{message}</p>
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry}>
          <Icons.Refresh className="mr-2 h-3.5 w-3.5" />
          Try Again
        </Button>
      )}
    </div>
  );
};
