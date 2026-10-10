import React, { createContext, useContext, useState, useCallback } from 'react';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  type?: ToastType;
}

interface ToastContextValue {
  toast: (options: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(({ title, description, type = 'info' }: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, type }]);

    setTimeout(() => {
      dismiss(id);
    }, 4000);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      {/* Toast container floating at bottom right */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-glass backdrop-blur-xl transition-all duration-300 animate-in slide-in-from-bottom-5',
              t.type === 'success' && 'bg-surface-elevated/95 border-finance-income/30 text-white',
              t.type === 'error' && 'bg-surface-elevated/95 border-finance-expense/30 text-white',
              t.type === 'warning' && 'bg-surface-elevated/95 border-finance-warning/30 text-white',
              t.type === 'info' && 'bg-surface-elevated/95 border-brand-violet/30 text-white'
            )}
          >
            <div className="shrink-0 mt-0.5">
              {t.type === 'success' && <Icons.Success className="h-4 w-4 text-finance-income" />}
              {t.type === 'error' && <Icons.Error className="h-4 w-4 text-finance-expense" />}
              {t.type === 'warning' && <Icons.Warning className="h-4 w-4 text-amber-400" />}
              {t.type === 'info' && <Icons.Activity className="h-4 w-4 text-brand-glow" />}
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-semibold">{t.title}</h4>
              {t.description && <p className="text-[11px] text-text-secondary mt-0.5">{t.description}</p>}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="text-text-muted hover:text-white transition-colors p-1"
              aria-label="Dismiss toast"
            >
              <Icons.Error className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
