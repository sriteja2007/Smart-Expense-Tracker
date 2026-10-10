import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/user.model.js';
import type { UserRole, AuthProviderType, CurrencyCode, UserProfile } from '@lumaspend/shared';

interface InMemoryUser {
  id: string;
  email: string;
  passwordHash?: string;
  displayName: string;
  avatarUrl?: string;
  role: UserRole;
  authProvider: AuthProviderType;
  googleId?: string;
  defaultCurrency: CurrencyCode;
  preferences: {
    theme: 'dark' | 'light' | 'system';
    reducedMotion: boolean;
    budgetAlertsEnabled: boolean;
    weeklySummaryEmail: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

const inMemoryStore = new Map<string, InMemoryUser>();

function toInMemoryProfile(user: InMemoryUser): UserProfile {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    authProvider: user.authProvider,
    preferences: {
      defaultCurrency: user.defaultCurrency,
      theme: user.preferences.theme,
      reducedMotion: user.preferences.reducedMotion,
      budgetAlertsEnabled: user.preferences.budgetAlertsEnabled,
      weeklySummaryEmail: user.preferences.weeklySummaryEmail
    },
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

export class UserRepository {
  private static isDbConnected(): boolean {
    return mongoose.connection.readyState === 1;
  }

  static async findByEmail(email: string, includePassword = false): Promise<any | null> {
    const normalizedEmail = email.toLowerCase().trim();

    if (this.isDbConnected()) {
      const query = User.findOne({ email: normalizedEmail });
      if (includePassword) {
        query.select('+passwordHash');
      }
      return query.exec();
    }

    for (const user of inMemoryStore.values()) {
      if (user.email === normalizedEmail) {
        return {
          ...user,
          _id: user.id,
          comparePassword: async (pwd: string) => {
            if (!user.passwordHash) return false;
            return bcrypt.compare(pwd, user.passwordHash);
          },
          toProfile: () => toInMemoryProfile(user)
        };
      }
    }
    return null;
  }

  static async findById(id: string): Promise<any | null> {
    if (this.isDbConnected()) {
      return User.findById(id).exec();
    }

    const user = inMemoryStore.get(id);
    if (!user) return null;

    return {
      ...user,
      _id: user.id,
      comparePassword: async (pwd: string) => {
        if (!user.passwordHash) return false;
        return bcrypt.compare(pwd, user.passwordHash);
      },
      toProfile: () => toInMemoryProfile(user)
    };
  }

  static async findByGoogleId(googleId: string): Promise<any | null> {
    if (this.isDbConnected()) {
      return User.findOne({ googleId }).exec();
    }

    for (const user of inMemoryStore.values()) {
      if (user.googleId === googleId) {
        return {
          ...user,
          _id: user.id,
          toProfile: () => toInMemoryProfile(user)
        };
      }
    }
    return null;
  }

  static async create(data: {
    email: string;
    passwordHash?: string;
    displayName: string;
    avatarUrl?: string;
    role?: UserRole;
    authProvider?: AuthProviderType;
    googleId?: string;
    defaultCurrency?: CurrencyCode;
  }): Promise<any> {
    const normalizedEmail = data.email.toLowerCase().trim();

    if (this.isDbConnected()) {
      return User.create({
        ...data,
        email: normalizedEmail
      });
    }

    const id = new mongoose.Types.ObjectId().toString();
    const now = new Date().toISOString();
    const newUser: InMemoryUser = {
      id,
      email: normalizedEmail,
      passwordHash: data.passwordHash,
      displayName: data.displayName,
      avatarUrl: data.avatarUrl,
      role: data.role || 'user',
      authProvider: data.authProvider || 'local',
      googleId: data.googleId,
      defaultCurrency: data.defaultCurrency || 'INR',
      preferences: {
        theme: 'dark',
        reducedMotion: false,
        budgetAlertsEnabled: true,
        weeklySummaryEmail: false
      },
      createdAt: now,
      updatedAt: now
    };

    inMemoryStore.set(id, newUser);

    return {
      ...newUser,
      _id: id,
      comparePassword: async (pwd: string) => {
        if (!newUser.passwordHash) return false;
        return bcrypt.compare(pwd, newUser.passwordHash);
      },
      toProfile: () => toInMemoryProfile(newUser)
    };
  }

  static async updateProfile(
    id: string,
    updates: {
      displayName?: string;
      defaultCurrency?: CurrencyCode;
      theme?: 'dark' | 'light' | 'system';
      reducedMotion?: boolean;
      budgetAlertsEnabled?: boolean;
      weeklySummaryEmail?: boolean;
      googleId?: string;
      authProvider?: AuthProviderType;
    }
  ): Promise<any | null> {
    if (this.isDbConnected()) {
      const user = await User.findById(id);
      if (!user) return null;

      if (updates.displayName) user.displayName = updates.displayName;
      if (updates.defaultCurrency) user.defaultCurrency = updates.defaultCurrency;
      if (updates.theme) user.preferences.theme = updates.theme;
      if (updates.reducedMotion !== undefined) user.preferences.reducedMotion = updates.reducedMotion;
      if (updates.budgetAlertsEnabled !== undefined) user.preferences.budgetAlertsEnabled = updates.budgetAlertsEnabled;
      if (updates.weeklySummaryEmail !== undefined) user.preferences.weeklySummaryEmail = updates.weeklySummaryEmail;
      if (updates.googleId) user.googleId = updates.googleId;
      if (updates.authProvider) user.authProvider = updates.authProvider;

      await user.save();
      return user;
    }

    const user = inMemoryStore.get(id);
    if (!user) return null;

    if (updates.displayName) user.displayName = updates.displayName;
    if (updates.defaultCurrency) user.defaultCurrency = updates.defaultCurrency;
    if (updates.theme) user.preferences.theme = updates.theme;
    if (updates.reducedMotion !== undefined) user.preferences.reducedMotion = updates.reducedMotion;
    if (updates.budgetAlertsEnabled !== undefined) user.preferences.budgetAlertsEnabled = updates.budgetAlertsEnabled;
    if (updates.weeklySummaryEmail !== undefined) user.preferences.weeklySummaryEmail = updates.weeklySummaryEmail;
    if (updates.googleId) user.googleId = updates.googleId;
    if (updates.authProvider) user.authProvider = updates.authProvider;
    user.updatedAt = new Date().toISOString();

    inMemoryStore.set(id, user);

    return {
      ...user,
      _id: user.id,
      toProfile: () => toInMemoryProfile(user)
    };
  }

  static clearInMemory(): void {
    inMemoryStore.clear();
  }
}
