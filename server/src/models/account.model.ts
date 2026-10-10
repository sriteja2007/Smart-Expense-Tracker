import mongoose, { Schema, Document, Model } from 'mongoose';
import type { FinancialAccount, AccountType, CurrencyCode } from '@lumaspend/shared';

export interface IAccount extends Document {
  userId: string;
  householdId?: string;
  name: string;
  type: AccountType;
  currency: CurrencyCode;
  balanceMinorUnits: number;
  accountNumberMask?: string;
  institutionName?: string;
  color?: string;
  icon?: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  toAccount(): FinancialAccount;
}

const AccountSchema = new Schema<IAccount>(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    householdId: {
      type: String,
      sparse: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['checking', 'savings', 'credit_card', 'upi_wallet', 'cash', 'investment', 'other'],
      default: 'savings'
    },
    currency: {
      type: String,
      default: 'INR'
    },
    balanceMinorUnits: {
      type: Number,
      required: true,
      default: 0
    },
    accountNumberMask: {
      type: String,
      trim: true
    },
    institutionName: {
      type: String,
      trim: true
    },
    color: {
      type: String,
      default: '#6366F1'
    },
    icon: {
      type: String,
      default: 'Wallet'
    },
    isArchived: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

AccountSchema.index({ userId: 1, isArchived: 1 });

AccountSchema.methods.toAccount = function (): FinancialAccount {
  return {
    id: this._id.toString(),
    userId: this.userId,
    householdId: this.householdId || undefined,
    name: this.name,
    type: this.type as AccountType,
    currency: this.currency as CurrencyCode,
    balanceMinorUnits: this.balanceMinorUnits,
    accountNumberMask: this.accountNumberMask || undefined,
    institutionName: this.institutionName || undefined,
    color: this.color || undefined,
    icon: this.icon || undefined,
    isArchived: this.isArchived,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString()
  };
};

export const Account: Model<IAccount> =
  mongoose.models.Account || mongoose.model<IAccount>('Account', AccountSchema);
