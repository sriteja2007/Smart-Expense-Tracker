import mongoose, { Schema, Document, Model } from 'mongoose';
import type { SavingsGoal, GoalStatus, CurrencyCode } from '@lumaspend/shared';

export interface IGoal extends Document {
  userId: string;
  householdId?: string;
  name: string;
  targetAmountMinorUnits: number;
  currentAmountMinorUnits: number;
  currency: CurrencyCode;
  targetDateUtc?: Date;
  color?: string;
  icon?: string;
  status: GoalStatus;
  linkedAccountId?: string;
  fundingMode: 'explicit_contribution' | 'linked_account';
  createdAt: Date;
  updatedAt: Date;
  toGoal(accountBalance?: number): SavingsGoal;
}

const GoalSchema = new Schema<IGoal>(
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
    targetAmountMinorUnits: {
      type: Number,
      required: true,
      min: 1
    },
    currentAmountMinorUnits: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'INR'
    },
    targetDateUtc: {
      type: Date
    },
    color: {
      type: String,
      default: '#10B981'
    },
    icon: {
      type: String,
      default: 'Target'
    },
    linkedAccountId: {
      type: String,
      sparse: true
    },
    fundingMode: {
      type: String,
      enum: ['explicit_contribution', 'linked_account'],
      default: 'explicit_contribution'
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'paused', 'archived'],
      default: 'active'
    }
  },
  {
    timestamps: true
  }
);

GoalSchema.index({ userId: 1, status: 1 });

GoalSchema.methods.toGoal = function (accountBalance?: number): SavingsGoal {
  const isLinked = this.fundingMode === 'linked_account' && this.linkedAccountId;
  const currentAmount = isLinked && accountBalance !== undefined
    ? Math.max(0, accountBalance)
    : this.currentAmountMinorUnits;

  const progressPercent = Math.min(100, Math.round((currentAmount / this.targetAmountMinorUnits) * 100));

  let daysRemaining: number | undefined;
  let requiredDailyPaceMinorUnits: number | undefined;
  let requiredMonthlyPaceMinorUnits: number | undefined;

  if (this.targetDateUtc) {
    const diffMs = this.targetDateUtc.getTime() - Date.now();
    daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const needed = Math.max(0, this.targetAmountMinorUnits - currentAmount);

    if (daysRemaining > 0 && needed > 0) {
      requiredDailyPaceMinorUnits = Math.ceil(needed / daysRemaining);
      requiredMonthlyPaceMinorUnits = Math.ceil(needed / Math.max(1, daysRemaining / 30.44));
    } else if (needed === 0) {
      requiredDailyPaceMinorUnits = 0;
      requiredMonthlyPaceMinorUnits = 0;
    }
  }

  return {
    id: this._id.toString(),
    userId: this.userId,
    householdId: this.householdId || undefined,
    name: this.name,
    targetAmountMinorUnits: this.targetAmountMinorUnits,
    currentAmountMinorUnits: currentAmount,
    currency: this.currency as CurrencyCode,
    targetDateUtc: this.targetDateUtc ? this.targetDateUtc.toISOString() : undefined,
    color: this.color || undefined,
    icon: this.icon || undefined,
    status: this.status as GoalStatus,
    linkedAccountId: this.linkedAccountId || undefined,
    fundingMode: this.fundingMode || 'explicit_contribution',
    progressPercent,
    requiredDailyPaceMinorUnits,
    requiredMonthlyPaceMinorUnits,
    daysRemaining,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString()
  };
};

export const Goal: Model<IGoal> =
  mongoose.models.Goal || mongoose.model<IGoal>('Goal', GoalSchema);
