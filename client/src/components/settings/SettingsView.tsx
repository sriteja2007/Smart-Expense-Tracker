import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { UserProfile, CurrencyCode, UpdateProfileInput, UserPreferences } from '@lumaspend/shared';
import { SUPPORTED_CURRENCIES } from '@lumaspend/shared';
import { FinancialApi } from '../../lib/financial-api';
import { useAuth } from '../../context/AuthContext';
import { Icons } from '../icons';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface SettingsViewProps {
  user: UserProfile | null;
  onProfileUpdated?: () => Promise<void> | void;
  currency: CurrencyCode;
  onCurrencyChange: (currency: CurrencyCode) => void;
}

const COMMON_TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST, UTC+5:30)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT, UTC-5)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT, UTC-8)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST, UTC+0/+1)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST, UTC+4)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT, UTC+8)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST, UTC+9)' }
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  onProfileUpdated,
  currency,
  onCurrencyChange
}) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const prefs: Partial<UserPreferences> = user?.preferences || {};

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(currency);
  const [timezone, setTimezone] = useState(prefs.timezone || 'Asia/Kolkata');
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>(prefs.theme || 'dark');
  const [reducedMotion, setReducedMotion] = useState(prefs.reducedMotion ?? false);

  // Notification Toggles
  const [inAppNotifications, setInAppNotifications] = useState(prefs.inAppNotifications ?? true);
  const [budgetAlerts, setBudgetAlerts] = useState(prefs.budgetAlertsEnabled ?? true);
  const [recurringReminders, setRecurringReminders] = useState(prefs.recurringRemindersEnabled ?? true);
  const [goalMilestones, setGoalMilestones] = useState(prefs.goalMilestonesEnabled ?? true);
  const [weeklyEmail, setWeeklyEmail] = useState(prefs.weeklySummaryEmail ?? false);

  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Account Deletion Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmPhrase, setDeleteConfirmPhrase] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    try {
      const updates: UpdateProfileInput = {
        displayName: displayName.trim() || undefined,
        defaultCurrency: selectedCurrency,
        timezone,
        theme,
        reducedMotion,
        inAppNotifications,
        budgetAlertsEnabled: budgetAlerts,
        recurringRemindersEnabled: recurringReminders,
        goalMilestonesEnabled: goalMilestones,
        weeklySummaryEmail: weeklyEmail
      };

      await FinancialApi.updateProfile(updates);
      if (selectedCurrency !== currency) {
        onCurrencyChange(selectedCurrency);
      }
      if (onProfileUpdated) {
        await onProfileUpdated();
      }

      setFeedback({ type: 'success', message: 'Preferences updated successfully!' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save preferences' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const exportArchive = await FinancialApi.exportUserData();
      const jsonBlob = new Blob([JSON.stringify(exportArchive, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(jsonBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lumaspend-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setFeedback({ type: 'success', message: 'Your full financial data archive has been downloaded.' });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Data export failed' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmPhrase !== 'DELETE MY ACCOUNT') {
      setDeleteError('Please type "DELETE MY ACCOUNT" exactly to confirm.');
      return;
    }

    setIsDeletingAccount(true);
    setDeleteError(null);
    try {
      await FinancialApi.deleteAccount('DELETE MY ACCOUNT');
      await logout();
      navigate('/');
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete account.');
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Icons.Settings className="w-5 h-5 text-brand-violet" />
          Platform Settings & Privacy
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Configure profile localization, alert thresholds, data exports, and account lifecycle.
        </p>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}
        >
          {feedback.type === 'success' ? (
            <Icons.Success className="w-4 h-4 shrink-0" />
          ) : (
            <Icons.Error className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <form onSubmit={handleSavePreferences} className="space-y-6">
        {/* Profile & Localization */}
        <Card className="glass-card p-6 space-y-5">
          <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2">
            Profile & Localization
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your Name"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-brand-violet"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Base Currency</label>
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value as CurrencyCode)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-brand-violet"
              >
                {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol}) — {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-300 font-semibold mb-1">Primary Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-brand-violet"
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Display & Accessibility */}
        <Card className="glass-card p-6 space-y-4">
          <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2">
            Display & Accessibility
          </h3>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">Color Theme</p>
                <p className="text-slate-400 text-[11px]">Choose light, dark, or system appearance</p>
              </div>
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-white/10">
                {(['dark', 'light', 'system'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTheme(t)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                      theme === t ? 'bg-brand-violet text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/5">
              <div>
                <p className="font-semibold text-white">Reduced Motion Mode</p>
                <p className="text-slate-400 text-[11px]">
                  Disables decorative 3D physics and animated parallax effects
                </p>
              </div>
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={(e) => setReducedMotion(e.target.checked)}
                className="w-4 h-4 rounded text-brand-violet focus:ring-brand-violet bg-slate-900 border-white/20 cursor-pointer"
              />
            </div>
          </div>
        </Card>

        {/* Granular Notification Settings */}
        <Card className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h3 className="text-sm font-bold text-white">Financial Notifications & Alerts</h3>
            <Badge variant="violet" className="text-[10px]">Configurable</Badge>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">In-App Notification Center</p>
                <p className="text-slate-400 text-[11px]">Show header bell updates and unread badges</p>
              </div>
              <input
                type="checkbox"
                checked={inAppNotifications}
                onChange={(e) => setInAppNotifications(e.target.checked)}
                className="w-4 h-4 rounded text-brand-violet focus:ring-brand-violet bg-slate-900 border-white/20 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <div>
                <p className="font-semibold text-white">Budget Threshold Warnings</p>
                <p className="text-slate-400 text-[11px]">Alert at 75%, 90%, and 100% of spending limits</p>
              </div>
              <input
                type="checkbox"
                checked={budgetAlerts}
                onChange={(e) => setBudgetAlerts(e.target.checked)}
                className="w-4 h-4 rounded text-brand-violet focus:ring-brand-violet bg-slate-900 border-white/20 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <div>
                <p className="font-semibold text-white">Upcoming Recurring Bill Reminders</p>
                <p className="text-slate-400 text-[11px]">Remind 3 days before scheduled bills are due</p>
              </div>
              <input
                type="checkbox"
                checked={recurringReminders}
                onChange={(e) => setRecurringReminders(e.target.checked)}
                className="w-4 h-4 rounded text-brand-violet focus:ring-brand-violet bg-slate-900 border-white/20 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <div>
                <p className="font-semibold text-white">Savings Goal Milestones</p>
                <p className="text-slate-400 text-[11px]">Celebrate 50% halfway and 100% completed goals</p>
              </div>
              <input
                type="checkbox"
                checked={goalMilestones}
                onChange={(e) => setGoalMilestones(e.target.checked)}
                className="w-4 h-4 rounded text-brand-violet focus:ring-brand-violet bg-slate-900 border-white/20 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <div>
                <p className="font-semibold text-white">Weekly Summary Digest</p>
                <p className="text-slate-400 text-[11px]">Weekly email breakdown of net savings and spending trends</p>
              </div>
              <input
                type="checkbox"
                checked={weeklyEmail}
                onChange={(e) => setWeeklyEmail(e.target.checked)}
                className="w-4 h-4 rounded text-brand-violet focus:ring-brand-violet bg-slate-900 border-white/20 cursor-pointer"
              />
            </div>
          </div>
        </Card>

        {/* Save Preferences Button */}
        <div className="flex justify-end">
          <Button type="submit" variant="primary" disabled={isSaving} className="text-xs font-semibold shadow-glow-violet">
            <Icons.Check className="w-4 h-4 mr-1.5" />
            <span>{isSaving ? 'Saving Preferences...' : 'Save Preferences'}</span>
          </Button>
        </div>
      </form>

      {/* Data Export & GDPR Section */}
      <Card className="glass-card p-6 space-y-4">
        <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2 flex items-center gap-2">
          <Icons.Download className="w-4 h-4 text-emerald-400" />
          Data Sovereignty & GDPR Export
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          You own your financial data. Download a complete JSON archive of all accounts, transactions, monthly budgets, savings goals, recurring schedules, in-app notifications, and shared space memberships.
        </p>

        <div>
          <button
            type="button"
            onClick={handleExportData}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-all disabled:opacity-50"
          >
            <Icons.Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
            <span>{isExporting ? 'Generating JSON Archive...' : 'Download Full Data Export (.JSON)'}</span>
          </button>
        </div>
      </Card>

      {/* Danger Zone: Cascading Account Deletion */}
      <Card className="p-6 border border-rose-500/20 bg-rose-950/10 rounded-2xl space-y-4">
        <div className="flex items-center gap-2">
          <Icons.Warning className="w-5 h-5 text-rose-400" />
          <h3 className="text-sm font-bold text-rose-300">Danger Zone — Permanent Account Deletion</h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Deleting your account permanently destroys all associated financial transactions, accounts, budgets, goals, and AI conversation histories. If you are the owner of a shared budget space with other members, you must first remove or transfer that space before deletion.
        </p>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-colors"
        >
          Delete Account & All Data
        </button>
      </Card>

      {/* Account Deletion Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0F111A] border border-rose-500/30 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
              <h4 className="text-base font-bold text-rose-300 flex items-center gap-2">
                <Icons.Warning className="w-5 h-5 text-rose-400" />
                Confirm Permanent Deletion
              </h4>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteError(null);
                  setDeleteConfirmPhrase('');
                }}
                className="text-slate-400 hover:text-white"
              >
                <Icons.X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This action is <span className="font-bold text-rose-400">irreversible</span>. To confirm, please type{' '}
              <code className="px-1.5 py-0.5 rounded bg-black/50 text-white font-mono font-bold">DELETE MY ACCOUNT</code> below:
            </p>

            <input
              type="text"
              value={deleteConfirmPhrase}
              onChange={(e) => setDeleteConfirmPhrase(e.target.value)}
              placeholder="DELETE MY ACCOUNT"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-rose-500/30 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />

            {deleteError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                {deleteError}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteError(null);
                  setDeleteConfirmPhrase('');
                }}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount || deleteConfirmPhrase !== 'DELETE MY ACCOUNT'}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold transition-all disabled:opacity-40"
              >
                {isDeletingAccount ? 'Deleting Account...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
