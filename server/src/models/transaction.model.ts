import mongoose, { Schema, Document, Model } from 'mongoose';
import type {
  Transaction,
  TransactionType,
  TransactionStatus,
  PaymentMethod,
  CurrencyCode,
  ReceiptMetadata
} from '@lumaspend/shared';

export interface ITransaction extends Document {
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
  notes?: string;
  dateUtc: Date;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  isRecurring: boolean;
  recurringRuleId?: string;
  receipt?: ReceiptMetadata;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  toTransaction(): Transaction;
}

const ReceiptItemSchema = new Schema(
  {
    description: { type: String, required: true },
    amountMinorUnits: { type: Number, required: true },
    quantity: { type: Number }
  },
  { _id: false }
);

const ReceiptMetadataSchema = new Schema(
  {
    merchantName: { type: String },
    date: { type: String },
    totalMinorUnits: { type: Number },
    taxMinorUnits: { type: Number },
    detectedItems: [ReceiptItemSchema],
    ocrConfidence: { type: Number },
    receiptUrl: { type: String }
  },
  { _id: false }
);

const TransactionSchema = new Schema<ITransaction>(
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
      required: true,
      index: true
    },
    destinationAccountId: {
      type: String,
      sparse: true
    },
    categoryId: {
      type: String,
      sparse: true,
      index: true
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
    notes: {
      type: String,
      trim: true
    },
    dateUtc: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },
    paymentMethod: {
      type: String,
      enum: ['upi', 'credit_card', 'debit_card', 'net_banking', 'cash', 'wallet', 'other'],
      default: 'upi'
    },
    status: {
      type: String,
      enum: ['completed', 'pending', 'cancelled'],
      default: 'completed'
    },
    isRecurring: {
      type: Boolean,
      default: false
    },
    recurringRuleId: {
      type: String
    },
    receipt: {
      type: ReceiptMetadataSchema
    },
    tags: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

TransactionSchema.index({ userId: 1, dateUtc: -1 });
TransactionSchema.index({ userId: 1, type: 1 });

TransactionSchema.methods.toTransaction = function (): Transaction {
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
    notes: this.notes || undefined,
    dateUtc: this.dateUtc.toISOString(),
    paymentMethod: this.paymentMethod as PaymentMethod,
    status: this.status as TransactionStatus,
    isRecurring: this.isRecurring,
    recurringRuleId: this.recurringRuleId || undefined,
    receipt: this.receipt || undefined,
    tags: this.tags || [],
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString()
  };
};

export const TransactionModel: Model<ITransaction> =
  mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);
