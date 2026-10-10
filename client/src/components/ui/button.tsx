import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Icons } from '@/components/icons';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-violet/60 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
  {
    variants: {
      variant: {
        primary:
          'bg-gradient-to-r from-brand-violet via-brand-indigo to-brand-blue text-white shadow-glow-violet hover:opacity-95 hover:shadow-lg active:scale-[0.98]',
        secondary:
          'bg-surface-elevated text-text-primary border border-white/10 hover:bg-surface-50 hover:border-white/20 active:scale-[0.98]',
        glass:
          'glass-card text-text-primary border border-white/10 hover:border-brand-violet/40 hover:bg-surface-100/60 active:scale-[0.98]',
        outline:
          'border border-border text-text-primary hover:bg-surface-50/50 hover:text-white',
        ghost:
          'text-text-secondary hover:text-text-primary hover:bg-surface-50/40',
        danger:
          'bg-finance-expense/20 text-finance-expense border border-finance-expense/30 hover:bg-finance-expense/30',
      },
      size: {
        sm: 'h-8 px-3 text-xs rounded-md',
        md: 'h-10 px-4 py-2',
        lg: 'h-12 px-6 text-base rounded-xl',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading = false, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading && (
          <Icons.Refresh className="mr-2 h-4 w-4 animate-spin text-current" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
