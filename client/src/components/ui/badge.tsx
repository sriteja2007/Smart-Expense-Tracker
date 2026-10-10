import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors border select-none',
  {
    variants: {
      variant: {
        neutral:
          'bg-surface-elevated text-text-secondary border-white/10',
        violet:
          'bg-brand-violet/15 text-brand-glow border-brand-violet/30 shadow-sm shadow-brand-violet/20',
        blue:
          'bg-brand-blue/15 text-blue-400 border-brand-blue/30',
        success:
          'bg-finance-income/15 text-finance-income border-finance-income/30',
        warning:
          'bg-finance-warning/15 text-amber-300 border-finance-warning/30',
        danger:
          'bg-finance-expense/15 text-finance-expense border-finance-expense/30',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
