import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, icon, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-text-muted">
              {icon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              'flex h-11 w-full rounded-xl border border-white/10 bg-surface-elevated/60 px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted/60 transition-all focus:border-brand-violet focus:bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-brand-violet/20 disabled:cursor-not-allowed disabled:opacity-50',
              icon && 'pl-11',
              error && 'border-finance-expense/60 focus:border-finance-expense focus:ring-finance-expense/20',
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-finance-expense font-medium">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
