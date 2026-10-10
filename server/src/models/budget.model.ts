import mongoose, { Schema, Document, Model } from 'mongoose';
import type { Budget, CurrencyCode } from '@lumaspend/shared';

export interface IBudget extends Document {
  userId: string;
  householdId?: string;
  categoryId: string;
  periodMonth: number;
  periodYear: number;
  limitAmountMinorUnits: number;
  currency: CurrencyCode;
  alertThresholdPct: number;
  createdAt: Date;
  updatedAt: Date;
  toBudget(spentAmountMinorUnits?: number): Budget;
}

const BudgetSchema = new Schema<IBudget>(
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
    categoryId: {
      type: String,
      required: true
    },
    periodMonth: {
      type: Number,
      required: true,
      min: 1,
      max: 12
    },
    periodYear: {
      type: Number,
      required: true,
      min: 2020,
      max: 2100
    },
    limitAmountMinorUnits: {
      type: Number,
      required: true,
      min: 1
    },
    currency: {
      type: String,
      default: 'INR'
    },
    alertThresholdPct: {
      type: Number,
      default: 80,
      min: 1,
      max: 100
    }
  },
  {
    timestamps: true
  }
);

BudgetSchema.index({ userId: 1, periodYear: 1, periodMonth: 1 });
BudgetSchema.index(
  { userId: 1, categoryId: 1, periodMonth: 1, periodYear: 1 },
  { unique: true }
);

BudgetSchema.methods.toBudget = function (spentAmountMinorUnits = 0): Budget {
  return {
    id: this._id.toString(),
    userId: this.userId,
    householdId: this.householdId || undefined,
    categoryId: this.categoryId,
    periodMonth: this.periodMonth,
    periodYear: this.periodYear,
    limitAmountMinorUnits: this.limitAmountMinorUnits,
    currency: this.currency as CurrencyCode,
    alertThresholdPct: this.alertThresholdPct,
    spentAmountMinorUnits,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString()
  };
};

export const BudgetModel: Model<IBudget> =
  mongoose.models.Budget || mongoose.model<IBudget>('Budget', BudgetSchema);
