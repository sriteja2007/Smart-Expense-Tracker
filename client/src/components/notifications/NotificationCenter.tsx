import React, { useState, useEffect, useRef } from 'react';
import type { Notification, NotificationType } from '@lumaspend/shared';
import { FinancialApi } from '../../lib/financial-api';
import { Icons } from '../icons';

interface NotificationCenterProps {
  onCountChange?: (unreadCount: number) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onCountChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAlerts, setIsCheckingAlerts] = useState(false);
  const [filterUnread, setFilterUnread] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const unreadCount = safeNotifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (onCountChange) {
      onCountChange(unreadCount);
    }
  }, [unreadCount, onCountChange]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const data = await FinancialApi.listNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load notifications:', err);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await FinancialApi.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err: any) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await FinancialApi.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err: any) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleDismiss = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await FinancialApi.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err: any) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleCheckAlerts = async () => {
    setIsCheckingAlerts(true);
    setFeedback(null);
    try {
      const res = await FinancialApi.checkAlerts();
      await fetchNotifications();
      setFeedback(
        res.createdCount > 0
          ? `Generated ${res.createdCount} new alerts!`
          : 'All budgets, goals & recurring schedules checked — no new alerts.'
      );
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback(err.message || 'Failed to evaluate alerts');
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setIsCheckingAlerts(false);
    }
  };

  const displayedNotifications = filterUnread
    ? safeNotifications.filter((n) => !n.isRead)
    : safeNotifications;

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'budget_alert':
        return <Icons.Warning className="w-4 h-4 text-rose-400" />;
      case 'recurring_due':
        return <Icons.Clock className="w-4 h-4 text-violet-400" />;
      case 'goal_milestone':
        return <Icons.Target className="w-4 h-4 text-emerald-400" />;
      case 'household_invite':
        return <Icons.Users className="w-4 h-4 text-sky-400" />;
      default:
        return <Icons.Bell className="w-4 h-4 text-brand-violet" />;
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open notifications center"
        className="relative p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all focus:outline-none focus:ring-2 focus:ring-brand-violet/50"
      >
        <Icons.Bell className="w-5 h-5 text-slate-300" />
        {unreadCount > 0 && (
          <span
            data-testid="notification-unread-badge"
            className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white ring-2 ring-void animate-pulse"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          data-testid="notification-dropdown"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-white/10 bg-[#0F111A]/95 p-4 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-brand-violet/20 text-brand-violet border border-brand-violet/30">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setFilterUnread(!filterUnread)}
                className={`text-xs px-2 py-1 rounded-lg transition-colors border ${
                  filterUnread
                    ? 'bg-brand-violet/30 text-white border-brand-violet/40'
                    : 'text-slate-400 border-white/5 hover:text-white'
                }`}
              >
                {filterUnread ? 'Show All' : 'Unread'}
              </button>
            </div>
          </div>

          {/* Quick Alert Check Action & Disclaimer */}
          <div className="py-2.5 flex items-center justify-between gap-2 border-b border-white/5 text-xs">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Icons.Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              On-demand smart checks
            </span>
            <button
              onClick={handleCheckAlerts}
              disabled={isCheckingAlerts}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition-colors disabled:opacity-50"
            >
              <Icons.Refresh className={`w-3.5 h-3.5 ${isCheckingAlerts ? 'animate-spin' : ''}`} />
              <span>{isCheckingAlerts ? 'Evaluating...' : 'Check Alerts'}</span>
            </button>
          </div>

          {feedback && (
            <div className="my-2 p-2 rounded-lg bg-brand-violet/10 border border-brand-violet/20 text-xs text-brand-violet">
              {feedback}
            </div>
          )}

          {/* Delivery Disclaimer */}
          <div className="my-2 p-2 rounded-lg bg-slate-900/60 border border-white/5 text-[11px] text-slate-400 leading-tight">
            ℹ️ <span className="text-slate-300 font-medium">Delivery Note:</span> Free-tier environments evaluate threshold reminders on-demand and during active sessions.
          </div>

          {/* Notification List */}
          <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {isLoading ? (
              <div className="py-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <Icons.Refresh className="w-4 h-4 animate-spin text-brand-violet" />
                <span>Loading notifications...</span>
              </div>
            ) : displayedNotifications.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <Icons.Check className="w-8 h-8 mx-auto text-emerald-400/50 mb-2" />
                <p className="font-medium text-slate-300">All caught up!</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {filterUnread
                    ? 'No unread notifications right now.'
                    : 'No notifications at this moment. You are in control!'}
                </p>
              </div>
            ) : (
              displayedNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && handleMarkRead(n.id)}
                  className={`group relative p-3 rounded-xl border transition-all cursor-pointer ${
                    n.isRead
                      ? 'bg-white/[0.02] border-white/5 opacity-75 hover:opacity-100 hover:bg-white/[0.04]'
                      : 'bg-brand-violet/[0.07] border-brand-violet/20 hover:bg-brand-violet/[0.12]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 p-1.5 rounded-lg bg-white/5 border border-white/5 shrink-0">
                        {getNotificationIcon(n.type)}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-semibold text-white leading-tight">
                            {n.title}
                          </h4>
                          {!n.isRead && (
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-violet shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-300 leading-snug">
                          {n.message}
                        </p>
                        <span className="text-[10px] text-slate-500 block pt-0.5">
                          {formatRelativeTime(n.createdAt)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDismiss(e, n.id)}
                      aria-label="Dismiss notification"
                      className="text-slate-500 hover:text-rose-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Icons.X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
