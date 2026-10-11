import { z } from 'zod';

const currencyEnum = z.enum(['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AED', 'CAD', 'AUD', 'SGD']);

// ==========================================
// Financial Account Schemas
// ==========================================
export const createAccountSchema = z.object({
  name: z.string().trim().min(1, 'Account name is required').max(50),
  type: z.enum(['checking', 'savings', 'credit_card', 'upi_wallet', 'cash', 'investment', 'other']),
  currency: currencyEnum.default('INR'),
  initialBalanceMinorUnits: z.number().int().default(0),
  accountNumberMask: z.string().trim().max(10).optional(),
  institutionName: z.string().trim().max(50).optional(),
  color: z.string().trim().max(20).optional(),
  icon: z.string().trim().max(30).optional(),
  householdId: z.string().optional()
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;

export const updateAccountSchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  color: z.string().trim().max(20).optional(),
  icon: z.string().trim().max(30).optional(),
  isArchived: z.boolean().optional()
});

export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

// ==========================================
// Category Schemas
// ==========================================
export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(40),
  type: z.enum(['expense', 'income']),
  icon: z.string().trim().default('Wallet'),
  color: z.string().trim().default('#8B5CF6'),
  householdId: z.string().optional()
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

// ==========================================
// Transaction Schemas
// ==========================================
export const createTransactionSchema = z.object({
  type: z.enum(['income', 'expense', 'transfer']),
  amountMinorUnits: z.number().int().positive('Amount must be positive in minor units'),
  currency: currencyEnum.default('INR'),
  sourceAccountId: z.string().min(1, 'Source account is required'),
  destinationAccountId: z.string().optional(), // Required if type is 'transfer'
  categoryId: z.string().optional(),
  description: z.string().trim().min(1, 'Description is required').max(150),
  merchantName: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(500).optional(),
  dateUtc: z.string().datetime({ message: 'dateUtc must be a valid ISO 8601 UTC timestamp' }).default(() => new Date().toISOString()),
  paymentMethod: z.enum(['upi', 'credit_card', 'debit_card', 'net_banking', 'cash', 'wallet', 'other']).default('upi'),
  tags: z.array(z.string().trim().max(30)).max(10).optional().default([]),
  householdId: z.string().optional()
}).refine(
  (data) => {
    if (data.type === 'transfer' && !data.destinationAccountId) {
      return false;
    }
    return true;
  },
  {
    message: 'Destination account is required for transfer transactions',
    path: ['destinationAccountId']
  }
);

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export const updateTransactionSchema = z.object({
  type: z.enum(['income', 'expense', 'transfer']).optional(),
  amountMinorUnits: z.number().int().positive().optional(),
  sourceAccountId: z.string().min(1).optional(),
  destinationAccountId: z.string().optional(),
  categoryId: z.string().optional(),
  description: z.string().trim().min(1).max(150).optional(),
  merchantName: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(500).optional(),
  dateUtc: z.string().datetime().optional(),
  paymentMethod: z.enum(['upi', 'credit_card', 'debit_card', 'net_banking', 'cash', 'wallet', 'other']).optional(),
  status: z.enum(['completed', 'pending', 'cancelled']).optional(),
  tags: z.array(z.string().trim().max(30)).max(10).optional()
});

export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

export const transactionQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  type: z.enum(['income', 'expense', 'transfer']).optional(),
  sourceAccountId: z.string().optional(),
  categoryId: z.string().optional(),
  householdId: z.string().optional(),
  startDateUtc: z.string().datetime().optional(),
  endDateUtc: z.string().datetime().optional(),
  search: z.string().trim().max(100).optional(),
  sortBy: z.enum(['dateUtc', 'amountMinorUnits', 'createdAt']).default('dateUtc'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export type TransactionQueryInput = z.infer<typeof transactionQuerySchema>;

// ==========================================
// Budget Schemas
// ==========================================
export const createBudgetSchema = z.object({
  categoryId: z.string().optional(), // If omitted or 'OVERALL', represents an overall monthly spending limit
  periodMonth: z.number().int().min(1).max(12),
  periodYear: z.number().int().min(2020).max(2100),
  limitAmountMinorUnits: z.number().int().positive('Budget limit must be positive in minor units'),
  currency: currencyEnum.default('INR'),
  alertThresholdPct: z.number().int().min(1).max(100).default(80),
  householdId: z.string().optional()
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;

export const updateBudgetSchema = z.object({
  limitAmountMinorUnits: z.number().int().positive().optional(),
  alertThresholdPct: z.number().int().min(1).max(100).optional(),
  categoryId: z.string().optional()
});

export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;

// ==========================================
// Savings Goal Schemas
// ==========================================
export const createGoalSchema = z.object({
  name: z.string().trim().min(1, 'Goal name is required').max(60),
  targetAmountMinorUnits: z.number().int().positive('Target must be positive in minor units'),
  currency: currencyEnum.default('INR'),
  targetDateUtc: z.string().datetime().optional(),
  color: z.string().trim().max(20).default('#10B981'),
  icon: z.string().trim().max(30).default('Shield'),
  linkedAccountId: z.string().optional(),
  fundingMode: z.enum(['explicit_contribution', 'linked_account']).default('explicit_contribution'),
  householdId: z.string().optional()
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;

export const updateGoalSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  targetAmountMinorUnits: z.number().int().positive().optional(),
  targetDateUtc: z.string().datetime().optional(),
  status: z.enum(['active', 'completed', 'paused', 'archived']).optional(),
  linkedAccountId: z.string().optional(),
  fundingMode: z.enum(['explicit_contribution', 'linked_account']).optional(),
  color: z.string().trim().max(20).optional(),
  icon: z.string().trim().max(30).optional()
});

export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;

export const goalContributionSchema = z.object({
  amountMinorUnits: z.number().int().positive('Contribution must be positive in minor units'),
  sourceAccountId: z.string().min(1, 'Source account is required')
});

export type GoalContributionInput = z.infer<typeof goalContributionSchema>;

// ==========================================
// Recurring Schedule Schemas
// ==========================================
export const createRecurringSchema = z.object({
  type: z.enum(['income', 'expense', 'transfer']),
  amountMinorUnits: z.number().int().positive('Amount must be positive in minor units'),
  currency: currencyEnum.default('INR'),
  sourceAccountId: z.string().min(1, 'Source account is required'),
  destinationAccountId: z.string().optional(),
  categoryId: z.string().optional(),
  description: z.string().trim().min(1).max(150),
  merchantName: z.string().trim().max(60).optional(),
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'yearly']),
  timezone: z.string().trim().optional().default('Asia/Kolkata'),
  startDateUtc: z.string().datetime(),
  endDateUtc: z.string().datetime().optional(),
  householdId: z.string().optional()
});

export type CreateRecurringInput = z.infer<typeof createRecurringSchema>;

export const updateRecurringSchema = z.object({
  isActive: z.boolean().optional(),
  amountMinorUnits: z.number().int().positive().optional(),
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'yearly']).optional(),
  description: z.string().trim().min(1).max(150).optional(),
  endDateUtc: z.string().datetime().optional()
});

export type UpdateRecurringInput = z.infer<typeof updateRecurringSchema>;

// ==========================================
// CSV Import Schemas
// ==========================================
export const csvImportPreviewSchema = z.object({
  csvContent: z.string().min(1, 'CSV content is required').max(2 * 1024 * 1024, 'CSV exceeds 2MB limit'),
  defaultAccountId: z.string().min(1, 'Default account is required')
});

export type CsvImportPreviewInput = z.infer<typeof csvImportPreviewSchema>;

export const csvImportConfirmSchema = z.object({
  rows: z.array(
    z.object({
      dateUtc: z.string().datetime(),
      type: z.enum(['income', 'expense', 'transfer']),
      amountMinorUnits: z.number().int().positive(),
      sourceAccountId: z.string().min(1),
      destinationAccountId: z.string().optional(),
      categoryId: z.string().optional(),
      description: z.string().min(1).max(150),
      merchantName: z.string().max(60).optional(),
      notes: z.string().max(500).optional(),
      paymentMethod: z.enum(['upi', 'credit_card', 'debit_card', 'net_banking', 'cash', 'wallet', 'other']).default('upi'),
      tags: z.array(z.string()).default([])
    })
  ).min(1, 'At least one transaction is required to import').max(500, 'Maximum 500 rows per import batch')
});

export type CsvImportConfirmInput = z.infer<typeof csvImportConfirmSchema>;

// ==========================================
// Household Schemas
// ==========================================
export const createHouseholdSchema = z.object({
  name: z.string().trim().min(1, 'Household name is required').max(50),
  currency: currencyEnum.default('INR')
});

export type CreateHouseholdInput = z.infer<typeof createHouseholdSchema>;

export const inviteMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(['owner', 'editor', 'viewer', 'admin', 'member']).default('editor')
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const createHouseholdInvitationSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email address'),
  role: z.enum(['editor', 'viewer']).default('editor')
});

export type CreateHouseholdInvitationInput = z.infer<typeof createHouseholdInvitationSchema>;

export const acceptHouseholdInvitationSchema = z.object({
  token: z.string().trim().min(10, 'Invitation token is required')
});

export type AcceptHouseholdInvitationInput = z.infer<typeof acceptHouseholdInvitationSchema>;

export const updateHouseholdMemberRoleSchema = z.object({
  role: z.enum(['editor', 'viewer'])
});

export type UpdateHouseholdMemberRoleInput = z.infer<typeof updateHouseholdMemberRoleSchema>;

// ==========================================
// AI Conversation Schemas
// ==========================================
export const createAiConversationSchema = z.object({
  title: z.string().trim().min(1).max(80).default('Financial Strategy Session'),
  retentionDays: z.number().int().min(1).max(365).default(30)
});

export type CreateAiConversationInput = z.infer<typeof createAiConversationSchema>;

export const aiChatQuerySchema = z.object({
  content: z.string().trim().min(1, 'Message cannot be empty').max(2000, 'Message cannot exceed 2000 characters'),
  conversationId: z.string().optional()
});

export type AiChatQueryInput = z.infer<typeof aiChatQuerySchema>;
