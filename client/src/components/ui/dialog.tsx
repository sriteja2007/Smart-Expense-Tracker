import * as React from 'react';
import { cn } from '@/lib/utils';
import { Icons } from '@/components/icons';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  className
}) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-void/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog Card Content */}
      <div
        className={cn(
          'relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-surface-100 p-6 shadow-glass backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200',
          className
        )}
      >
        <div className="flex items-start justify-between pb-4 border-b border-white/5">
          <div>
            <h2 id="dialog-title" className="text-lg font-bold text-white tracking-tight">
              {title}
            </h2>
            {description && (
              <p className="text-xs text-text-secondary mt-1">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-text-secondary hover:bg-surface-elevated hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-brand-violet/50"
          >
            <Icons.Error className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
};
