import mongoose, { Schema, Document, Model } from 'mongoose';
import type {
  RecurringSchedule,
  RecurringFrequency,
  TransactionType,
  CurrencyCode
} from '@lumaspend/shared';

export interface IRecurring extends Document {
  userId: string;
  householdId?: string;
  type: TransactionType;
  amountMinorUnits: number;
  currency: CurrencyCode;
  sourceAccountId: string;
  destinationAccountId?: string;
  categoryId?: string;
  description: string;
  merchantName?: string;
  frequency: RecurringFrequency;
  timezone: string;
  startDateUtc: Date;
  nextRunDateUtc: Date;
  endDateUtc?: Date;
  isActive: boolean;
  lastRunDateUtc?: Date;
  createdAt: Date;
  updatedAt: Date;
  toSchedule(): RecurringSchedule;
}

const RecurringSchema = new Schema<IRecurring>(
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
    type: {
      type: String,
      enum: ['income', 'expense', 'transfer'],
      required: true
    },
    amountMinorUnits: {
      type: Number,
      required: true,
      min: 1
    },
    currency: {
      type: String,
      default: 'INR'
    },
    sourceAccountId: {
      type: String,
      required: true
    },
    destinationAccountId: {
      type: String
    },
    categoryId: {
      type: String
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    merchantName: {
      type: String,
      trim: true
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'biweekly', 'monthly', 'yearly'],
      required: true
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    },
    startDateUtc: {
      type: Date,
      required: true
    },
    nextRunDateUtc: {
      type: Date,
      required: true,
      index: true
    },
    endDateUtc: {
      type: Date
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    lastRunDateUtc: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

RecurringSchema.methods.toSchedule = function (): RecurringSchedule {
  return {
    id: this._id.toString(),
    userId: this.userId,
    householdId: this.householdId || undefined,
    type: this.type as TransactionType,
    amountMinorUnits: this.amountMinorUnits,
    currency: this.currency as CurrencyCode,
    sourceAccountId: this.sourceAccountId,
    destinationAccountId: this.destinationAccountId || undefined,
    categoryId: this.categoryId || undefined,
    description: this.description,
    merchantName: this.merchantName || undefined,
    frequency: this.frequency as RecurringFrequency,
    timezone: this.timezone,
    startDateUtc: this.startDateUtc.toISOString(),
    nextRunDateUtc: this.nextRunDateUtc.toISOString(),
    endDateUtc: this.endDateUtc ? this.endDateUtc.toISOString() : undefined,
    isActive: this.isActive,
    lastRunDateUtc: this.lastRunDateUtc ? this.lastRunDateUtc.toISOString() : undefined,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString()
  };
};

export const Recurring: Model<IRecurring> =
  mongoose.models.Recurring || mongoose.model<IRecurring>('Recurring', RecurringSchema);
