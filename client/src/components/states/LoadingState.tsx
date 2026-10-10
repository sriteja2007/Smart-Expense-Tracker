import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Icons } from '@/components/icons';

interface LoadingStateProps {
  message?: string;
  variant?: 'skeleton' | 'spinner';
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading financial data...',
  variant = 'skeleton'
}) => {
  if (variant === 'spinner') {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="relative">
          <Icons.Refresh className="h-8 w-8 text-brand-glow animate-spin" />
          <div className="absolute inset-0 bg-brand-violet/20 blur-md rounded-full pointer-events-none" />
        </div>
        <p className="text-xs text-text-secondary animate-pulse">{message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 w-full">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
};
