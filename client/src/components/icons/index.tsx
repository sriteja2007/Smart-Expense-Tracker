import React from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Smartphone,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronRight,
  Activity,
  Terminal,
  Database,
  Cpu,
  Server,
  Zap,
  Globe,
  IndianRupee,
  type LucideProps
} from 'lucide-react';

interface AccessibleIconProps extends LucideProps {
  label?: string;
}

function createIcon(IconComponent: React.ComponentType<LucideProps>, defaultLabel: string) {
  const Component = ({ label = defaultLabel, className, ...props }: AccessibleIconProps) => (
    <IconComponent
      aria-label={label}
      role="img"
      className={className}
      strokeWidth={props.strokeWidth ?? 1.8}
      {...props}
    />
  );
  Component.displayName = `Accessible${IconComponent.displayName || 'Icon'}`;
  return Component;
}

export const Icons = {
  Wallet: createIcon(Wallet, 'Wallet'),
  Income: createIcon(TrendingUp, 'Income'),
  Expense: createIcon(TrendingDown, 'Expense'),
  Transfer: createIcon(ArrowRightLeft, 'Transfer'),
  AI: createIcon(Sparkles, 'AI Assistant'),
  Shield: createIcon(ShieldCheck, 'Security'),
  Refresh: createIcon(RefreshCw, 'Refresh'),
  Mobile: createIcon(Smartphone, 'Mobile Device'),
  Laptop: createIcon(Laptop, 'Laptop Device'),
  Success: createIcon(CheckCircle2, 'Success'),
  Warning: createIcon(AlertTriangle, 'Warning'),
  Error: createIcon(XCircle, 'Error'),
  ChevronRight: createIcon(ChevronRight, 'Chevron Right'),
  Activity: createIcon(Activity, 'System Activity'),
  Terminal: createIcon(Terminal, 'Terminal / Code'),
  Database: createIcon(Database, 'Database'),
  CPU: createIcon(Cpu, 'Processor'),
  Server: createIcon(Server, 'Server'),
  Lightning: createIcon(Zap, 'Lightning Fast'),
  Globe: createIcon(Globe, 'Global'),
  Rupee: createIcon(IndianRupee, 'Indian Rupee (INR)')
};
