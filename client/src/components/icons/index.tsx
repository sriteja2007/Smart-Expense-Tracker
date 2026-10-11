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
  Download,
  Upload,
  Plus,
  Trash2,
  Edit2,
  Search,
  Filter,
  Calendar,
  Clock,
  Play,
  Pause,
  FileText,
  Target,
  PieChart,
  Bell,
  Layers,
  List,
  Check,
  Bot,
  Camera,
  Users,
  Copy,
  X,
  ExternalLink,
  Settings,
  LogOut,
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
  Rupee: createIcon(IndianRupee, 'Indian Rupee (INR)'),
  Download: createIcon(Download, 'Download'),
  Upload: createIcon(Upload, 'Upload'),
  Plus: createIcon(Plus, 'Add New'),
  Trash: createIcon(Trash2, 'Delete'),
  Edit: createIcon(Edit2, 'Edit'),
  Search: createIcon(Search, 'Search'),
  Filter: createIcon(Filter, 'Filter'),
  Calendar: createIcon(Calendar, 'Calendar'),
  Clock: createIcon(Clock, 'Clock'),
  Play: createIcon(Play, 'Resume'),
  Pause: createIcon(Pause, 'Pause'),
  FileText: createIcon(FileText, 'Document'),
  Target: createIcon(Target, 'Savings Goal Target'),
  PieChart: createIcon(PieChart, 'Pie Chart'),
  Bell: createIcon(Bell, 'Notifications / Alerts'),
  Layers: createIcon(Layers, 'Layers / Data'),
  List: createIcon(List, 'List / Table View'),
  Check: createIcon(Check, 'Checkmark'),
  TrendingUp: createIcon(TrendingUp, 'Trending Up'),
  Bot: createIcon(Bot, 'AI Bot'),
  Camera: createIcon(Camera, 'Receipt Camera / Scan'),
  Users: createIcon(Users, 'Users / Household'),
  Copy: createIcon(Copy, 'Copy Link'),
  X: createIcon(X, 'Close / Dismiss'),
  ExternalLink: createIcon(ExternalLink, 'External Link'),
  Settings: createIcon(Settings, 'Settings'),
  LogOut: createIcon(LogOut, 'Log Out')
};
