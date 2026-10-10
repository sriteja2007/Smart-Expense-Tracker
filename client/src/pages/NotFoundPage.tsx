import React from 'react';
import { Link } from 'react-router-dom';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/ui/glass-panel';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-void text-text-primary p-4 selection:bg-brand-violet/30 selection:text-white relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-brand-violet/15 blur-3xl pointer-events-none -z-10" />

      <GlassPanel glow="violet" intensity="deep" className="max-w-md w-full p-8 text-center space-y-6">
        <div className="inline-flex p-4 rounded-2xl bg-surface-elevated border border-white/10 text-brand-glow">
          <Icons.Error className="h-10 w-10 text-finance-expense" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-white">404 — Ledger Void</h1>
          <p className="text-xs text-text-secondary leading-relaxed">
            The page or financial resource you requested does not exist or has been archived.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link to="/">
            <Button variant="glass" size="md" className="w-full sm:w-auto">
              Return Home
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="primary" size="md" className="w-full sm:w-auto">
              Open Dashboard
            </Button>
          </Link>
        </div>
      </GlassPanel>
    </div>
  );
};
