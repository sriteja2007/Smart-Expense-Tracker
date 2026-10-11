import type { CurrencyCode } from './currency.js';
import type { TransactionType, TransactionStatus, PaymentMethod } from './transaction.js';

// ==========================================
// Financial Account / Wallet
// ==========================================
export type AccountType =
  | 'checking'
  | 'savings'
  | 'credit_card'
  | 'upi_wallet'
  | 'cash'
  | 'investment'
  | 'other';

export interface FinancialAccount {
  id: string;
  userId: string;
  householdId?: string;
  name: string;
  type: AccountType;
  currency: CurrencyCode;
  balanceMinorUnits: number; // Stored in minor units (e.g. paise)
  accountNumberMask?: string; // e.g. "•••• 4821"
  institutionName?: string;
  color?: string;
  icon?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Category
// ==========================================
export type CategoryClassification = 'expense' | 'income';

export interface FinancialCategory {
  id: string;
  userId?: string; // If undefined, system default category
  householdId?: string;
  name: string;
  type: CategoryClassification;
  icon: string;
  color: string;
  isSystem: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export type Category = FinancialCategory;

// ==========================================
// Receipt Metadata
// ==========================================
export interface ReceiptItem {
  description: string;
  amountMinorUnits: number;
  quantity?: number;
}

export interface ReceiptMetadata {
  merchantName?: string;
  date?: string;
  totalMinorUnits?: number;
  taxMinorUnits?: number;
  detectedItems?: ReceiptItem[];
  ocrConfidence?: number;
  receiptUrl?: string;
}

// ==========================================
// Transaction
// ==========================================
export interface Transaction {
  id: string;
  userId: string;
  householdId?: string;
  type: TransactionType;
  amountMinorUnits: number; // Integer minor units (e.g. paise)
  currency: CurrencyCode;
  sourceAccountId: string;
  destinationAccountId?: string; // For transfers
  categoryId?: string;
  description: string;
  merchantName?: string;
  notes?: string;
  dateUtc: string; // ISO 8601 UTC timestamp
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  isRecurring: boolean;
  recurringRuleId?: string;
  receipt?: ReceiptMetadata;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TransactionListResult {
  transactions: Transaction[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ==========================================
// Budget
// ==========================================
export interface Budget {
  id: string;
  userId: string;
  householdId?: string;
  categoryId?: string; // If undefined or 'OVERALL', represents an overall monthly spending limit
  periodMonth: number; // 1-12
  periodYear: number;
  limitAmountMinorUnits: number;
  currency: CurrencyCode;
  alertThresholdPct: number; // e.g. 80 for 80%
  spentAmountMinorUnits?: number; // Calculated dynamically
  remainingAmountMinorUnits?: number; // Math.max(0, limitAmountMinorUnits - spentAmountMinorUnits)
  consumedPercent?: number; // (spentAmountMinorUnits / limitAmountMinorUnits) * 100
  isExceeded?: boolean; // spentAmountMinorUnits > limitAmountMinorUnits
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Savings Goal
// ==========================================
export type GoalStatus = 'active' | 'completed' | 'paused' | 'archived';
export type GoalFundingMode = 'explicit_contribution' | 'linked_account';

export interface SavingsGoal {
  id: string;
  userId: string;
  householdId?: string;
  name: string;
  targetAmountMinorUnits: number;
  currentAmountMinorUnits: number;
  currency: CurrencyCode;
  targetDateUtc?: string;
  color?: string;
  icon?: string;
  status: GoalStatus;
  linkedAccountId?: string;
  fundingMode?: GoalFundingMode;
  progressPercent?: number;
  requiredDailyPaceMinorUnits?: number;
  requiredMonthlyPaceMinorUnits?: number;
  daysRemaining?: number;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Analytics Domain Types
// ==========================================
export interface AnalyticsPreviousPeriodComparison {
  incomeMinorUnits: number;
  expenseMinorUnits: number;
  netSavingsMinorUnits: number;
  expenseDeltaPct: number;
  expenseDeltaMinorUnits: number;
}

export interface LargestExpenseItem {
  id: string;
  description: string;
  merchantName?: string;
  categoryName?: string;
  dateUtc: string;
  amountMinorUnits: number;
  currency: CurrencyCode;
}

export interface FrequentCategoryItem {
  categoryId: string;
  categoryName: string;
  color: string;
  count: number;
  totalAmountMinorUnits: number;
}

export interface AnalyticsTrendPoint {
  dateKey: string;
  incomeMinorUnits: number;
  expenseMinorUnits: number;
  netMinorUnits: number;
}

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  color: string;
  amountMinorUnits: number;
  percentage: number;
  transactionCount: number;
}

export interface BudgetVsActualItem {
  budgetId: string;
  categoryId?: string;
  categoryName: string;
  limitAmountMinorUnits: number;
  spentAmountMinorUnits: number;
  remainingAmountMinorUnits: number;
  consumedPercent: number;
  isOverBudget: boolean;
}

export interface AnalyticsSummaryData {
  totalBalanceMinorUnits: number;
  monthlyIncomeMinorUnits: number;
  monthlyExpenseMinorUnits: number;
  netSavingsMinorUnits: number;
  savingsRatePct: number;
  previousPeriod?: AnalyticsPreviousPeriodComparison;
  largestExpenses?: LargestExpenseItem[];
  frequentlyUsedCategories?: FrequentCategoryItem[];
  accountCount: number;
  transactionCount: number;
}

// ==========================================
// Recurring Transaction Schedule
// ==========================================
export type RecurringFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export interface RecurringSchedule {
  id: string;
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
  timezone: string; // e.g. 'Asia/Kolkata'
  startDateUtc: string;
  nextRunDateUtc: string;
  endDateUtc?: string;
  isActive: boolean;
  lastRunDateUtc?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Notification
// ==========================================
export type NotificationType =
  | 'budget_alert'
  | 'recurring_due'
  | 'goal_milestone'
  | 'household_invite'
  | 'system';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
}

// ==========================================
// Household / Shared Budget
// ==========================================
export type HouseholdRole = 'owner' | 'editor' | 'viewer' | 'admin' | 'member';

export interface HouseholdMember {
  userId: string;
  email: string;
  displayName: string;
  role: HouseholdRole;
  joinedAt: string;
}

export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface HouseholdInvitation {
  id: string;
  householdId: string;
  householdName: string;
  inviterUserId: string;
  inviterName: string;
  inviteeEmail: string;
  role: 'editor' | 'viewer';
  token: string;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
}

export interface HouseholdAuditLog {
  id: string;
  action:
    | 'household_created'
    | 'member_invited'
    | 'invitation_accepted'
    | 'invitation_revoked'
    | 'member_removed'
    | 'role_updated';
  actorUserId: string;
  actorName: string;
  targetUserId?: string;
  targetEmail?: string;
  role?: HouseholdRole;
  details?: string;
  timestamp: string;
}

export interface Household {
  id: string;
  name: string;
  ownerId: string;
  members: HouseholdMember[];
  invitations?: HouseholdInvitation[];
  auditLogs?: HouseholdAuditLog[];
  currency: CurrencyCode;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// User Data Archive Export
// ==========================================
export interface UserDataExport {
  exportedAt: string;
  formatVersion: string;
  user: any;
  accounts: FinancialAccount[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: SavingsGoal[];
  recurringSchedules: RecurringSchedule[];
  notifications: Notification[];
  households: Household[];
}

// ==========================================
// AI Conversation Metadata & Controls
// ==========================================
export interface AiMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: string;
}

export interface AiConversation {
  id: string;
  userId: string;
  title: string;
  messages: AiMessage[];
  retentionDays: number; // e.g. 30 days
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// CSV Import Types
// ==========================================
export interface CsvImportRow {
  rowNumber: number;
  dateUtc: string;
  type: TransactionType;
  amountMinorUnits: number;
  description: string;
  categoryName?: string;
  categoryId?: string;
  accountName?: string;
  accountId: string;
  destinationAccountId?: string;
  merchantName?: string;
  notes?: string;
  paymentMethod: PaymentMethod;
  isDuplicate: boolean;
  duplicateReason?: string;
  isValid: boolean;
  errors: string[];
}

export interface CsvImportPreviewResult {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  rows: CsvImportRow[];
}

// ==========================================
// Receipt OCR Scanning Types
// ==========================================
export interface ReceiptScanResult {
  candidateMerchant?: string;
  candidateDateUtc?: string;
  candidateAmountMinorUnits?: number;
  candidateCurrency: CurrencyCode;
  suggestedCategoryId?: string;
  confidenceScore: number; // 0 - 100
  isReadable: boolean;
  rawTextPreview?: string;
  warning?: string;
}

// ==========================================
// AI Assistant & Insights Types
// ==========================================
export interface AiInsightSummary {
  periodMonth: number;
  periodYear: number;
  totalIncomeMinorUnits: number;
  totalExpenseMinorUnits: number;
  netSavingsMinorUnits: number;
  savingsRatePct: number;
  overBudgetCategories: {
    categoryName: string;
    spentMinorUnits: number;
    limitMinorUnits: number;
    percent: number;
  }[];
  topExpenseCategories: {
    categoryName: string;
    amountMinorUnits: number;
    percentage: number;
  }[];
  largestExpenses: {
    description: string;
    amountMinorUnits: number;
    dateUtc: string;
    categoryName?: string;
  }[];
  spendingComparisonVsPrevMonth?: {
    expenseDeltaPct: number;
    incomeDeltaPct: number;
  };
  ruleBasedSuggestions: string[];
}

export interface AiChatMessageResponse {
  conversationId: string;
  userMessage: AiMessage;
  aiMessage: AiMessage;
  isAiGenerated: boolean;
  isFallback: boolean;
  model: string;
  analysisPeriod: string;
  disclaimer: string;
}
