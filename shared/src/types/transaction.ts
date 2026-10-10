import type { CurrencyCode } from './currency.js';

export type TransactionType = 'expense' | 'income' | 'transfer';

export type TransactionStatus = 'completed' | 'pending' | 'cancelled';

export type ExpenseCategory =
  | 'housing'
  | 'groceries'
  | 'dining'
  | 'transportation'
  | 'utilities'
  | 'healthcare'
  | 'entertainment'
  | 'shopping'
  | 'education'
  | 'investment'
  | 'travel'
  | 'subscriptions'
  | 'other';

export type IncomeCategory =
  | 'salary'
  | 'freelance'
  | 'business'
  | 'dividend'
  | 'rental'
  | 'gift'
  | 'interest'
  | 'other';

export type PaymentMethod =
  | 'upi'
  | 'credit_card'
  | 'debit_card'
  | 'net_banking'
  | 'cash'
  | 'wallet'
  | 'other';

export interface TransactionSummaryItem {
  id: string;
  type: TransactionType;
  amount: number;
  currency: CurrencyCode;
  category: ExpenseCategory | IncomeCategory | string;
  description: string;
  merchantName?: string;
  date: string;
  accountId: string;
  status: TransactionStatus;
  isRecurring: boolean;
  tags: string[];
}
