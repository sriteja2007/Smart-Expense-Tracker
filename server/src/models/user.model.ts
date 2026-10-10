import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import type { UserProfile, UserRole, AuthProviderType, CurrencyCode } from '@lumaspend/shared';

export interface IUser extends Document {
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
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  toProfile(): UserProfile;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    passwordHash: {
      type: String,
      select: false // Never return in standard queries
    },
    displayName: {
      type: String,
      required: true,
      trim: true
    },
    avatarUrl: {
      type: String,
      default: ''
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'household_manager', 'household_member'],
      default: 'user'
    },
    authProvider: {
      type: String,
      enum: ['local', 'google', 'both'],
      default: 'local'
    },
    googleId: {
      type: String,
      sparse: true,
      index: true
    },
    defaultCurrency: {
      type: String,
      default: 'INR'
    },
    preferences: {
      theme: {
        type: String,
        enum: ['dark', 'light', 'system'],
        default: 'dark'
      },
      reducedMotion: {
        type: Boolean,
        default: false
      },
      budgetAlertsEnabled: {
        type: Boolean,
        default: true
      },
      weeklySummaryEmail: {
        type: Boolean,
        default: false
      }
    }
  },
  {
    timestamps: true
  }
);

// Method to verify password securely
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Method to convert Mongoose document to public UserProfile contract
UserSchema.methods.toProfile = function (): UserProfile {
  return {
    id: this._id.toString(),
    email: this.email,
    displayName: this.displayName,
    avatarUrl: this.avatarUrl || undefined,
    role: this.role as UserRole,
    authProvider: this.authProvider as AuthProviderType,
    preferences: {
      defaultCurrency: this.defaultCurrency as CurrencyCode,
      theme: this.preferences.theme,
      reducedMotion: this.preferences.reducedMotion,
      budgetAlertsEnabled: this.preferences.budgetAlertsEnabled,
      weeklySummaryEmail: this.preferences.weeklySummaryEmail
    },
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString()
  };
};

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
