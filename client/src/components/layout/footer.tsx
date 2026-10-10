import React from 'react';
import { Icons } from '@/components/icons';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-white/5 bg-void/90 py-8 text-xs text-text-secondary">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">LumaSpend</span>
            <span>—</span>
            <span className="text-text-muted">Premium 3D Fintech Expense Intelligence</span>
          </div>

          {/* Target platforms */}
          <div className="flex items-center gap-4 text-text-muted">
            <div className="flex items-center gap-1.5">
              <Icons.Laptop className="h-4 w-4 text-brand-blue" />
              <span>Laptop & Desktop Web</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <Icons.Mobile className="h-4 w-4 text-brand-violet" />
              <span>Mobile (Capacitor Android APK)</span>
            </div>
          </div>

          {/* GitHub link */}
          <a
            href="https://github.com/sriteja2007/Smart-Expense-Tracker"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-text-secondary hover:text-white transition-colors"
          >
            <Icons.Terminal className="h-4 w-4" />
            <span>sriteja2007/Smart-Expense-Tracker</span>
          </a>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 border-t border-white/5 pt-6 text-[11px] text-text-muted">
          <span className="px-2 py-0.5 rounded bg-surface-50">TypeScript</span>
          <span className="px-2 py-0.5 rounded bg-surface-50">React 18</span>
          <span className="px-2 py-0.5 rounded bg-surface-50">Vite</span>
          <span className="px-2 py-0.5 rounded bg-surface-50">Tailwind CSS</span>
          <span className="px-2 py-0.5 rounded bg-surface-50">Three.js / R3F</span>
          <span className="px-2 py-0.5 rounded bg-surface-50">Motion</span>
          <span className="px-2 py-0.5 rounded bg-surface-50">Express</span>
          <span className="px-2 py-0.5 rounded bg-surface-50">MongoDB Atlas</span>
          <span className="px-2 py-0.5 rounded bg-surface-50">Zod</span>
          <span className="px-2 py-0.5 rounded bg-surface-50">Default INR (₹)</span>
        </div>
      </div>
    </footer>
  );
};
