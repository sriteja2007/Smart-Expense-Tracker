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
  createdAt: Date;
  updatedAt: Date;
  toGoal(): SavingsGoal;
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

GoalSchema.methods.toGoal = function (): SavingsGoal {
  return {
    id: this._id.toString(),
    userId: this.userId,
    householdId: this.householdId || undefined,
    name: this.name,
    targetAmountMinorUnits: this.targetAmountMinorUnits,
    currentAmountMinorUnits: this.currentAmountMinorUnits,
    currency: this.currency as CurrencyCode,
    targetDateUtc: this.targetDateUtc ? this.targetDateUtc.toISOString() : undefined,
    color: this.color || undefined,
    icon: this.icon || undefined,
    status: this.status as GoalStatus,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString()
  };
};

export const Goal: Model<IGoal> =
  mongoose.models.Goal || mongoose.model<IGoal>('Goal', GoalSchema);
