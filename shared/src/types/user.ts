import type { CurrencyCode } from './currency.js';

export type UserRole = 'user' | 'admin' | 'household_manager' | 'household_member';

export interface UserPreferences {
  defaultCurrency: CurrencyCode;
  theme: 'dark' | 'light' | 'system';
  reducedMotion: boolean;
  budgetAlertsEnabled: boolean;
  weeklySummaryEmail: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: UserRole;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: UserProfile;
  token: string;
  expiresAt: string;
}
