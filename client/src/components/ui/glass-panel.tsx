import * as React from 'react';
import { cn } from '@/lib/utils';

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: 'none' | 'violet' | 'blue' | 'emerald';
  intensity?: 'subtle' | 'medium' | 'deep';
}

export const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, glow = 'none', intensity = 'medium', children, ...props }, ref) => {
    const intensityMap = {
      subtle: 'bg-surface-default/40 backdrop-blur-sm border-white/5',
      medium: 'bg-surface-100/65 backdrop-blur-md border-white/10 shadow-glass',
      deep: 'bg-surface-200/85 backdrop-blur-xl border-white/15 shadow-2xl',
    };

    const glowMap = {
      none: '',
      violet: 'relative after:absolute after:-inset-px after:rounded-[inherit] after:border after:border-brand-violet/40 after:shadow-glow-violet after:pointer-events-none',
      blue: 'relative after:absolute after:-inset-px after:rounded-[inherit] after:border after:border-brand-blue/40 after:shadow-glow-blue after:pointer-events-none',
      emerald: 'relative after:absolute after:-inset-px after:rounded-[inherit] after:border after:border-finance-income/40 after:shadow-glow-emerald after:pointer-events-none',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-3xl border transition-all',
          intensityMap[intensity],
          glowMap[glow],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassPanel.displayName = 'GlassPanel';
