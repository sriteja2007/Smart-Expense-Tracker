import React from 'react';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@lumaspend/shared';

export const Hero3DFallback: React.FC = () => {
  return (
    <div className="relative w-full h-[420px] sm:h-[480px] flex items-center justify-center overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div className="absolute w-72 h-72 rounded-full bg-brand-violet/20 blur-3xl pointer-events-none" />
      <div className="absolute w-60 h-60 rounded-full bg-brand-blue/15 blur-2xl -bottom-10 pointer-events-none" />

      {/* Layered CSS 3D Glass Cards Stack */}
      <div className="relative w-[300px] sm:w-[360px] h-[210px] sm:h-[230px]">
        {/* Secondary Back Card (Offset & Tilted) */}
        <div
          style={{ transform: 'rotate(-8deg) translateY(-24px) translateX(-18px) scale(0.92)' }}
          className="absolute inset-0 rounded-3xl border border-brand-blue/30 bg-gradient-to-br from-brand-blue/20 via-surface-elevated/70 to-surface-default/80 p-6 backdrop-blur-md shadow-2xl opacity-60"
        >
          <div className="flex justify-between items-center text-xs text-text-muted">
            <span className="font-mono">RESERVE ACCOUNT</span>
            <Icons.Rupee className="h-4 w-4 text-brand-blue" />
          </div>
          <div className="mt-8 text-xl font-bold text-white/70">
            {formatCurrency(245000, 'INR')}
          </div>
        </div>

        {/* Primary Foreground Hero Card */}
        <div
          style={{ transform: 'rotate(4deg) translateY(0px) scale(1)' }}
          className="absolute inset-0 rounded-3xl border border-brand-violet/40 bg-gradient-to-br from-brand-violet/25 via-surface-100/85 to-surface-default/95 p-6 backdrop-blur-xl shadow-glass shadow-glow-violet transition-transform duration-500 hover:rotate-1 hover:scale-105"
        >
          {/* Card Top Row */}
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div className="h-8 w-10 rounded-md bg-gradient-to-tr from-amber-300 to-amber-500/80 border border-amber-200/50 shadow-inner" />
              <span className="text-[11px] font-mono tracking-widest text-text-secondary">LUMASPEND ELITE</span>
            </div>
            <Badge variant="violet" className="text-[10px] font-mono">
              <Icons.Shield className="h-3 w-3 mr-1" /> ACTIVE
            </Badge>
          </div>

          {/* Card Middle Balance */}
          <div className="mt-6 space-y-1">
            <p className="text-[11px] text-text-muted font-medium uppercase tracking-wider">
              Liquid Portfolio Balance
            </p>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-baseline gap-1">
              <span>{formatCurrency(489250, 'INR')}</span>
              <span className="text-xs font-semibold text-finance-income">+18.4%</span>
            </div>
          </div>

          {/* Card Bottom Row */}
          <div className="mt-6 flex justify-between items-end text-xs text-text-muted">
            <div>
              <p className="text-[9px] uppercase tracking-wider">Account Holder</p>
              <p className="font-semibold text-white tracking-wide">ALEXANDER CHEN</p>
            </div>
            <div className="font-mono text-[11px] text-text-secondary tracking-widest">
              •••• 8492
            </div>
          </div>

          {/* Decorative Holographic Specular Line */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/10 to-transparent rounded-tr-3xl pointer-events-none" />
        </div>

        {/* Floating Mini Hologram Tag */}
        <div
          style={{ transform: 'translate(190px, 160px)' }}
          className="absolute hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/40 bg-surface-default/90 backdrop-blur-md shadow-glow-emerald text-xs text-white"
        >
          <div className="h-2 w-2 rounded-full bg-finance-income animate-pulse" />
          <span className="text-[11px] font-medium">Smart AI Audit: Optimized</span>
        </div>
      </div>
    </div>
  );
};
