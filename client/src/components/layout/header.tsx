import React from 'react';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from '@lumaspend/shared';

interface HeaderProps {
  isApiConnected: boolean | null;
  uptimeSeconds?: number;
}

export const Header: React.FC<HeaderProps> = ({ isApiConnected, uptimeSeconds }) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-void/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-violet to-brand-blue shadow-glow-violet">
            <Icons.Wallet className="h-5 w-5 text-white" />
            <div className="absolute -inset-0.5 rounded-xl bg-brand-violet/20 blur-sm pointer-events-none" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight text-white">LumaSpend</span>
              <Badge variant="violet" className="text-[10px] px-1.5 py-0">v1.0-alpha</Badge>
            </div>
            <p className="text-[11px] text-text-muted hidden sm:block">Smart Expense Tracker</p>
          </div>
        </div>

        {/* Status indicators and system badges */}
        <div className="flex items-center gap-3">
          {/* Currency indicator (Default: INR) */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-white/10 bg-surface-elevated/70 px-2.5 py-1 text-xs text-text-primary">
            <Icons.Rupee className="h-3.5 w-3.5 text-brand-glow" />
            <span className="font-semibold">{DEFAULT_CURRENCY}</span>
            <span className="text-text-muted">({SUPPORTED_CURRENCIES.INR.symbol})</span>
          </div>

          {/* Backend API Health Status */}
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-surface-elevated/70 px-2.5 py-1 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                isApiConnected === true
                  ? 'bg-finance-income animate-pulse shadow-glow-emerald'
                  : isApiConnected === false
                  ? 'bg-finance-expense'
                  : 'bg-finance-warning animate-ping'
              }`}
            />
            <span className="text-text-secondary">
              {isApiConnected === true
                ? `Core API: Online${uptimeSeconds ? ` (${uptimeSeconds}s)` : ''}`
                : isApiConnected === false
                ? 'Core API: Offline'
                : 'Connecting...'}
            </span>
          </div>

          {/* Device Responsive Mode Indicator */}
          <div className="hidden md:flex items-center gap-1 text-text-muted text-xs border border-white/5 rounded-lg px-2 py-1">
            <Icons.Laptop className="h-3.5 w-3.5" />
            <span className="text-[10px]">Desktop / Laptop</span>
          </div>
        </div>
      </div>
    </header>
  );
};
