import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { NotificationCenter } from '../components/notifications/NotificationCenter';
import { HouseholdManager } from '../components/household/HouseholdManager';
import { SettingsView } from '../components/settings/SettingsView';
import { FinancialApi } from '../lib/financial-api';
import type { Notification, Household, UserProfile } from '@lumaspend/shared';

// Mock FinancialApi
vi.mock('../lib/financial-api', () => ({
  FinancialApi: {
    listNotifications: vi.fn(),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
    checkAlerts: vi.fn(),
    deleteNotification: vi.fn(),
    listHouseholds: vi.fn(),
    createHousehold: vi.fn(),
    createHouseholdInvitation: vi.fn(),
    revokeHouseholdInvitation: vi.fn(),
    removeHouseholdMember: vi.fn(),
    updateHouseholdMemberRole: vi.fn(),
    deleteHousehold: vi.fn(),
    updateProfile: vi.fn(),
    exportUserData: vi.fn(),
    deleteAccount: vi.fn()
  }
}));

// Mock useAuth
const mockLogout = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'usr-1',
      email: 'aarav@example.com',
      displayName: 'Aarav Sharma',
      role: 'user',
      authProvider: 'local',
      preferences: {
        defaultCurrency: 'INR',
        theme: 'dark',
        reducedMotion: false,
        timezone: 'Asia/Kolkata',
        inAppNotifications: true,
        budgetAlertsEnabled: true,
        recurringRemindersEnabled: true,
        goalMilestonesEnabled: true,
        weeklySummaryEmail: false
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    logout: mockLogout,
    isAuthenticated: true,
    isLoading: false
  })
}));

const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    userId: 'usr-1',
    type: 'budget_alert',
    title: 'Budget Warning: Groceries at 90%',
    message: 'You have reached 90% of your Groceries spending limit.',
    isRead: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'notif-2',
    userId: 'usr-1',
    type: 'recurring_due',
    title: 'Upcoming Bill: Electricity',
    message: 'Scheduled expense of ₹3,500 is due soon.',
    isRead: true,
    createdAt: new Date(Date.now() - 3600000).toISOString()
  }
];

const mockHouseholds: Household[] = [
  {
    id: 'hh-1',
    name: 'Home & Groceries',
    ownerId: 'usr-1',
    currency: 'INR',
    members: [
      {
        userId: 'usr-1',
        email: 'aarav@example.com',
        displayName: 'Aarav Sharma',
        role: 'owner',
        joinedAt: new Date().toISOString()
      },
      {
        userId: 'usr-2',
        email: 'priya@example.com',
        displayName: 'Priya Sharma',
        role: 'editor',
        joinedAt: new Date().toISOString()
      }
    ],
    invitations: [
      {
        id: 'inv-1',
        householdId: 'hh-1',
        householdName: 'Home & Groceries',
        inviterUserId: 'usr-1',
        inviterName: 'Aarav Sharma',
        inviteeEmail: 'guest@example.com',
        role: 'viewer',
        token: 'token-abc-1234567890',
        status: 'pending',
        expiresAt: new Date(Date.now() + 604800000).toISOString(),
        createdAt: new Date().toISOString()
      }
    ],
    auditLogs: [
      {
        id: 'log-1',
        action: 'household_created',
        actorUserId: 'usr-1',
        actorName: 'Aarav Sharma',
        details: 'Created household Home & Groceries',
        timestamp: new Date().toISOString()
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

describe('Phase 8: Client Notifications, Household & Data Lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(FinancialApi.listNotifications).mockResolvedValue(mockNotifications);
    vi.mocked(FinancialApi.listHouseholds).mockResolvedValue(mockHouseholds);
  });

  // ==========================================
  // 1. NotificationCenter
  // ==========================================
  describe('NotificationCenter Component', () => {
    it('renders bell trigger with unread badge and opens dropdown', async () => {
      render(<NotificationCenter />);

      await waitFor(() => {
        expect(screen.getByTestId('notification-unread-badge')).toHaveTextContent('1');
      });

      const bellBtn = screen.getByLabelText('Open notifications center');
      fireEvent.click(bellBtn);

      expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
      expect(screen.getByText('Budget Warning: Groceries at 90%')).toBeInTheDocument();
      expect(screen.getByText('Upcoming Bill: Electricity')).toBeInTheDocument();
      expect(screen.getByText(/Delivery Note:/i)).toBeInTheDocument();
    });

    it('triggers checkAlerts and evaluates on-demand alerts', async () => {
      vi.mocked(FinancialApi.checkAlerts).mockResolvedValue({
        createdCount: 2,
        notifications: mockNotifications
      });

      render(<NotificationCenter />);

      const bellBtn = screen.getByLabelText('Open notifications center');
      fireEvent.click(bellBtn);

      const checkAlertsBtn = screen.getByRole('button', { name: /Check Alerts/i });
      fireEvent.click(checkAlertsBtn);

      await waitFor(() => {
        expect(FinancialApi.checkAlerts).toHaveBeenCalledTimes(1);
        expect(screen.getByText(/Generated 2 new alerts!/i)).toBeInTheDocument();
      });
    });

    it('marks all notifications as read', async () => {
      vi.mocked(FinancialApi.markAllNotificationsRead).mockResolvedValue(1);

      render(<NotificationCenter />);

      await waitFor(() => {
        expect(screen.getByTestId('notification-unread-badge')).toBeInTheDocument();
      });

      const bellBtn = screen.getByLabelText('Open notifications center');
      fireEvent.click(bellBtn);

      const markAllBtn = screen.getByRole('button', { name: /Mark all read/i });
      fireEvent.click(markAllBtn);

      await waitFor(() => {
        expect(FinancialApi.markAllNotificationsRead).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ==========================================
  // 2. HouseholdManager
  // ==========================================
  describe('HouseholdManager Component', () => {
    it('renders space selector and shows active household space with role badge', async () => {
      const handleSelect = vi.fn();
      render(
        <HouseholdManager
          currentUserId="usr-1"
          activeHouseholdId="hh-1"
          onSelectHousehold={handleSelect}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Home & Groceries')).toBeInTheDocument();
        expect(screen.getByTestId('household-role-badge')).toHaveTextContent(/owner/i);
        expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
      });

      // Role permission notice
      expect(screen.getByText(/Transactions added inside "Home & Groceries" are visible only to invited members/i)).toBeInTheDocument();
    });

    it('generates single-use invitation token with link', async () => {
      vi.mocked(FinancialApi.createHouseholdInvitation).mockResolvedValue({
        invitation: {
          id: 'inv-new',
          householdId: 'hh-1',
          householdName: 'Home & Groceries',
          inviterUserId: 'usr-1',
          inviterName: 'Aarav Sharma',
          inviteeEmail: 'newmember@example.com',
          role: 'editor',
          token: 'token-xyz-9876543210',
          status: 'pending',
          expiresAt: new Date(Date.now() + 604800000).toISOString(),
          createdAt: new Date().toISOString()
        },
        inviteLink: '/invite?token=token-xyz-9876543210'
      });

      render(
        <HouseholdManager
          currentUserId="usr-1"
          activeHouseholdId="hh-1"
          onSelectHousehold={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText('partner@example.com')).toBeInTheDocument();
      });

      const emailInput = screen.getByPlaceholderText('partner@example.com');
      fireEvent.change(emailInput, { target: { value: 'newmember@example.com' } });

      const submitBtn = screen.getByRole('button', { name: /Create Invite Token/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(FinancialApi.createHouseholdInvitation).toHaveBeenCalledWith('hh-1', {
          email: 'newmember@example.com',
          role: 'editor'
        });
        expect(screen.getByText('Single-Use Invitation Token Created')).toBeInTheDocument();
      });
    });
  });

  // ==========================================
  // 3. SettingsView
  // ==========================================
  describe('SettingsView Component', () => {
    const mockUser: UserProfile = {
      id: 'usr-1',
      email: 'aarav@example.com',
      displayName: 'Aarav Sharma',
      role: 'user',
      authProvider: 'local',
      preferences: {
        defaultCurrency: 'INR',
        theme: 'dark',
        reducedMotion: false,
        timezone: 'Asia/Kolkata',
        inAppNotifications: true,
        budgetAlertsEnabled: true,
        recurringRemindersEnabled: true,
        goalMilestonesEnabled: true,
        weeklySummaryEmail: false
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    it('renders profile preferences, timezone, theme, and toggles', () => {
      render(
        <BrowserRouter>
          <SettingsView
            user={mockUser}
            currency="INR"
            onCurrencyChange={vi.fn()}
          />
        </BrowserRouter>
      );

      expect(screen.getByDisplayValue('Aarav Sharma')).toBeInTheDocument();
      expect(screen.getByText(/Asia\/Kolkata \(IST, UTC\+5:30\)/i)).toBeInTheDocument();
      expect(screen.getByText('Reduced Motion Mode')).toBeInTheDocument();
      expect(screen.getByText('Budget Threshold Warnings')).toBeInTheDocument();
      expect(screen.getByText('Upcoming Recurring Bill Reminders')).toBeInTheDocument();
      expect(screen.getByText('Savings Goal Milestones')).toBeInTheDocument();
    });

    it('triggers full JSON data export', async () => {
      vi.mocked(FinancialApi.exportUserData).mockResolvedValue({
        exportedAt: new Date().toISOString(),
        formatVersion: '1.0',
        user: mockUser,
        accounts: [],
        transactions: [],
        budgets: [],
        goals: [],
        recurringSchedules: [],
        notifications: [],
        households: []
      });

      // Mock URL.createObjectURL
      global.URL.createObjectURL = vi.fn(() => 'blob:mock');
      global.URL.revokeObjectURL = vi.fn();

      render(
        <BrowserRouter>
          <SettingsView
            user={mockUser}
            currency="INR"
            onCurrencyChange={vi.fn()}
          />
        </BrowserRouter>
      );

      const exportBtn = screen.getByRole('button', { name: /Download Full Data Export/i });
      fireEvent.click(exportBtn);

      await waitFor(() => {
        expect(FinancialApi.exportUserData).toHaveBeenCalledTimes(1);
        expect(screen.getByText(/Your full financial data archive has been downloaded/i)).toBeInTheDocument();
      });
    });

    it('enforces confirmation phrase for cascading account deletion', async () => {
      vi.mocked(FinancialApi.deleteAccount).mockResolvedValue(true);

      render(
        <BrowserRouter>
          <SettingsView
            user={mockUser}
            currency="INR"
            onCurrencyChange={vi.fn()}
          />
        </BrowserRouter>
      );

      const openDeleteBtn = screen.getByRole('button', { name: /Delete Account & All Data/i });
      fireEvent.click(openDeleteBtn);

      expect(screen.getByText('Confirm Permanent Deletion')).toBeInTheDocument();
      const deleteActionBtn = screen.getByRole('button', { name: /Permanently Delete/i });
      expect(deleteActionBtn).toBeDisabled();

      const phraseInput = screen.getByPlaceholderText('DELETE MY ACCOUNT');
      fireEvent.change(phraseInput, { target: { value: 'DELETE MY ACCOUNT' } });

      expect(deleteActionBtn).not.toBeDisabled();
      fireEvent.click(deleteActionBtn);

      await waitFor(() => {
        expect(FinancialApi.deleteAccount).toHaveBeenCalledWith('DELETE MY ACCOUNT');
        expect(mockLogout).toHaveBeenCalledTimes(1);
      });
    });
  });
});
