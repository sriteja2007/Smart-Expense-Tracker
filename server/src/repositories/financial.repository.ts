import mongoose from 'mongoose';
import crypto from 'crypto';
import { Account } from '../models/account.model.js';
import { Category } from '../models/category.model.js';
import { TransactionModel } from '../models/transaction.model.js';
import { BudgetModel } from '../models/budget.model.js';
import { Goal } from '../models/goal.model.js';
import { Recurring } from '../models/recurring.model.js';
import { HouseholdModel } from '../models/household.model.js';
import { NotificationModel } from '../models/notification.model.js';
import { AiConversationModel } from '../models/ai-conversation.model.js';
import { UserRepository } from './user.repository.js';
import { AppError, toMinorUnits, fromMinorUnits, formatCurrency, formatMinorUnits } from '@lumaspend/shared';
import type {
  FinancialAccount,
  FinancialCategory,
  Transaction,
  Budget,
  SavingsGoal,
  RecurringSchedule,
  RecurringFrequency,
  Household,
  HouseholdRole,
  HouseholdMember,
  HouseholdInvitation,
  HouseholdAuditLog,
  UserDataExport,
  Notification,
  NotificationType,
  AiConversation,
  TransactionQueryInput,
  CreateTransactionInput,
  UpdateTransactionInput,
  CreateAccountInput,
  CreateBudgetInput,
  CreateGoalInput,
  CreateRecurringInput,
  CreateHouseholdInput,
  InviteMemberInput,
  CreateHouseholdInvitationInput,
  CreateAiConversationInput,
  CsvImportRow,
  CsvImportPreviewResult,
  CsvImportPreviewInput,
  CsvImportConfirmInput,
  AnalyticsSummaryData,
  AnalyticsPreviousPeriodComparison,
  LargestExpenseItem,
  FrequentCategoryItem,
  AnalyticsTrendPoint,
  CategoryBreakdownItem,
  BudgetVsActualItem,
  AiInsightSummary
} from '@lumaspend/shared';

// Default system categories
const DEFAULT_SYSTEM_CATEGORIES: Array<{
  id: string;
  name: string;
  type: 'expense' | 'income';
  icon: string;
  color: string;
}> = [
  { id: 'sys-cat-1', name: 'Housing', type: 'expense', icon: 'Home', color: '#6366F1' },
  { id: 'sys-cat-2', name: 'Groceries', type: 'expense', icon: 'ShoppingBag', color: '#10B981' },
  { id: 'sys-cat-3', name: 'Dining & Food', type: 'expense', icon: 'Utensils', color: '#F59E0B' },
  { id: 'sys-cat-4', name: 'Transportation', type: 'expense', icon: 'Car', color: '#3B82F6' },
  { id: 'sys-cat-5', name: 'Utilities & Bills', type: 'expense', icon: 'Zap', color: '#EC4899' },
  { id: 'sys-cat-6', name: 'Healthcare', type: 'expense', icon: 'HeartPulse', color: '#EF4444' },
  { id: 'sys-cat-7', name: 'Entertainment', type: 'expense', icon: 'Film', color: '#8B5CF6' },
  { id: 'sys-cat-8', name: 'Shopping', type: 'expense', icon: 'ShoppingBag', color: '#06B6D4' },
  { id: 'sys-cat-9', name: 'Subscriptions', type: 'expense', icon: 'CreditCard', color: '#84CC16' },
  { id: 'sys-cat-10', name: 'Other Expense', type: 'expense', icon: 'MoreHorizontal', color: '#6B7280' },
  { id: 'sys-cat-11', name: 'Salary', type: 'income', icon: 'Briefcase', color: '#10B981' },
  { id: 'sys-cat-12', name: 'Freelance', type: 'income', icon: 'Laptop', color: '#3B82F6' },
  { id: 'sys-cat-13', name: 'Investments', type: 'income', icon: 'TrendingUp', color: '#8B5CF6' },
  { id: 'sys-cat-14', name: 'Business', type: 'income', icon: 'Building', color: '#F59E0B' },
  { id: 'sys-cat-15', name: 'Other Income', type: 'income', icon: 'PlusCircle', color: '#6B7280' }
];

// In-memory test stores
const memoryAccounts = new Map<string, FinancialAccount>();
const memoryCategories = new Map<string, FinancialCategory>();
const memoryTransactions = new Map<string, Transaction>();
const memoryBudgets = new Map<string, Budget>();
const memoryGoals = new Map<string, SavingsGoal>();
const memoryRecurring = new Map<string, RecurringSchedule>();
const memoryHouseholds = new Map<string, Household>();
const memoryNotifications = new Map<string, Notification>();
const memoryAi = new Map<string, AiConversation>();

// Preload memory categories
for (const cat of DEFAULT_SYSTEM_CATEGORIES) {
  memoryCategories.set(cat.id, {
    ...cat,
    isSystem: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

export class FinancialRepository {
  private static isDbConnected(): boolean {
    return mongoose.connection.readyState === 1;
  }

  // ==========================================
  // Accounts
  // ==========================================
  static async createAccount(userId: string, input: CreateAccountInput): Promise<FinancialAccount> {
    if (this.isDbConnected()) {
      const doc = await Account.create({
        userId,
        householdId: input.householdId,
        name: input.name,
        type: input.type,
        currency: input.currency,
        balanceMinorUnits: input.initialBalanceMinorUnits,
        accountNumberMask: input.accountNumberMask,
        institutionName: input.institutionName,
        color: input.color,
        icon: input.icon
      });
      return doc.toAccount();
    }

    const id = new mongoose.Types.ObjectId().toString();
    const now = new Date().toISOString();
    const account: FinancialAccount = {
      id,
      userId,
      householdId: input.householdId,
      name: input.name,
      type: input.type,
      currency: input.currency,
      balanceMinorUnits: input.initialBalanceMinorUnits,
      accountNumberMask: input.accountNumberMask,
      institutionName: input.institutionName,
      color: input.color,
      icon: input.icon,
      isArchived: false,
      createdAt: now,
      updatedAt: now
    };
    memoryAccounts.set(id, account);
    return account;
  }

  static async listAccounts(userId: string, householdId?: string): Promise<FinancialAccount[]> {
    if (this.isDbConnected()) {
      const filter: any = householdId ? { householdId } : { userId, isArchived: false };
      const docs = await Account.find(filter).sort({ createdAt: 1 }).exec();
      return docs.map((d) => d.toAccount());
    }

    const accounts: FinancialAccount[] = [];
    for (const acc of memoryAccounts.values()) {
      if (householdId ? acc.householdId === householdId : acc.userId === userId && !acc.isArchived) {
        accounts.push(acc);
      }
    }
    return accounts;
  }

  static async getAccountById(id: string, userId: string): Promise<FinancialAccount | null> {
    if (this.isDbConnected()) {
      const doc = await Account.findById(id).exec();
      if (!doc) return null;
      if (doc.userId !== userId && (!doc.householdId || !(await this.isUserInHousehold(userId, doc.householdId)))) {
        return null;
      }
      return doc.toAccount();
    }

    const acc = memoryAccounts.get(id);
    if (!acc) return null;
    if (acc.userId !== userId && (!acc.householdId || !(await this.isUserInHousehold(userId, acc.householdId)))) {
      return null;
    }
    return acc;
  }

  static async updateAccount(
    id: string,
    userId: string,
    updates: Partial<FinancialAccount>
  ): Promise<FinancialAccount | null> {
    if (this.isDbConnected()) {
      const doc = await Account.findOne({ _id: id, userId }).exec();
      if (!doc) return null;
      if (updates.name) doc.name = updates.name;
      if (updates.color) doc.color = updates.color;
      if (updates.icon) doc.icon = updates.icon;
      if (updates.isArchived !== undefined) doc.isArchived = updates.isArchived;
      await doc.save();
      return doc.toAccount();
    }

    const acc = memoryAccounts.get(id);
    if (!acc || acc.userId !== userId) return null;
    const updated: FinancialAccount = {
      ...acc,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    memoryAccounts.set(id, updated);
    return updated;
  }

  static async deleteAccount(id: string, userId: string): Promise<boolean> {
    if (this.isDbConnected()) {
      const res = await Account.deleteOne({ _id: id, userId }).exec();
      return (res.deletedCount || 0) > 0;
    }

    const acc = memoryAccounts.get(id);
    if (!acc || acc.userId !== userId) return false;
    memoryAccounts.delete(id);
    return true;
  }

  static async adjustAccountBalance(accountId: string, deltaMinorUnits: number): Promise<void> {
    if (this.isDbConnected()) {
      await Account.updateOne(
        { _id: accountId },
        { $inc: { balanceMinorUnits: deltaMinorUnits } }
      ).exec();
      return;
    }

    const acc = memoryAccounts.get(accountId);
    if (acc) {
      acc.balanceMinorUnits += deltaMinorUnits;
      acc.updatedAt = new Date().toISOString();
      memoryAccounts.set(accountId, acc);
    }
  }

  // ==========================================
  // Categories
  // ==========================================
  static async listCategories(userId: string): Promise<FinancialCategory[]> {
    if (this.isDbConnected()) {
      // Find system categories OR user created categories
      const docs = await Category.find({
        $or: [{ isSystem: true }, { userId }]
      })
        .sort({ isSystem: -1, name: 1 })
        .exec();
      return docs.map((d) => d.toCategory());
    }

    const list: FinancialCategory[] = [];
    for (const cat of memoryCategories.values()) {
      if (cat.isSystem || cat.userId === userId) {
        list.push(cat);
      }
    }
    return list;
  }

  static async createCategory(
    userId: string,
    data: { name: string; type: 'expense' | 'income'; icon?: string; color?: string; householdId?: string }
  ): Promise<FinancialCategory> {
    if (this.isDbConnected()) {
      const doc = await Category.create({
        userId,
        householdId: data.householdId,
        name: data.name,
        type: data.type,
        icon: data.icon || 'Tag',
        color: data.color || '#8B5CF6',
        isSystem: false
      });
      return doc.toCategory();
    }

    const id = new mongoose.Types.ObjectId().toString();
    const now = new Date().toISOString();
    const cat: FinancialCategory = {
      id,
      userId,
      householdId: data.householdId,
      name: data.name,
      type: data.type,
      icon: data.icon || 'Tag',
      color: data.color || '#8B5CF6',
      isSystem: false,
      isArchived: false,
      createdAt: now,
      updatedAt: now
    };
    memoryCategories.set(id, cat);
    return cat;
  }

  static async deleteCategory(id: string, userId: string): Promise<boolean> {
    if (this.isDbConnected()) {
      const referenced = await TransactionModel.exists({ categoryId: id, userId }).exec();
      if (referenced) {
        throw AppError.conflict('Cannot delete category: existing transactions reference this category. Archive it instead.');
      }
      const res = await Category.deleteOne({ _id: id, userId, isSystem: false }).exec();
      return (res.deletedCount || 0) > 0;
    }

    const cat = memoryCategories.get(id);
    if (!cat || cat.isSystem || cat.userId !== userId) return false;

    for (const t of memoryTransactions.values()) {
      if (t.categoryId === id && t.userId === userId) {
        throw AppError.conflict('Cannot delete category: existing transactions reference this category. Archive it instead.');
      }
    }

    memoryCategories.delete(id);
    return true;
  }

  // ==========================================
  // Transactions
  // ==========================================
  static async createTransaction(
    userId: string,
    input: CreateTransactionInput
  ): Promise<Transaction> {
    // 0. If scoped to a household, verify user has editor or owner role
    if (input.householdId) {
      await this.validateHouseholdAccess(input.householdId, userId, 'editor');
    }

    // 1. Verify source account exists and belongs to user
    const sourceAcc = await this.getAccountById(input.sourceAccountId, userId);
    if (!sourceAcc) {
      throw AppError.notFound('Source account not found or access denied.');
    }

    // 2. If transfer, verify destination account exists
    let destAcc: FinancialAccount | null = null;
    if (input.type === 'transfer') {
      if (!input.destinationAccountId) {
        throw AppError.badRequest('Destination account is required for transfer.');
      }
      destAcc = await this.getAccountById(input.destinationAccountId, userId);
      if (!destAcc) {
        throw AppError.notFound('Destination account not found or access denied.');
      }
      if (input.sourceAccountId === input.destinationAccountId) {
        throw AppError.badRequest('Source and destination accounts must be different.');
      }
    }

    // 3. Atomically update balances
    if (input.type === 'expense') {
      await this.adjustAccountBalance(input.sourceAccountId, -input.amountMinorUnits);
    } else if (input.type === 'income') {
      await this.adjustAccountBalance(input.sourceAccountId, input.amountMinorUnits);
    } else if (input.type === 'transfer' && input.destinationAccountId) {
      await this.adjustAccountBalance(input.sourceAccountId, -input.amountMinorUnits);
      await this.adjustAccountBalance(input.destinationAccountId, input.amountMinorUnits);
    }

    // 4. Save transaction
    if (this.isDbConnected()) {
      const doc = await TransactionModel.create({
        userId,
        householdId: input.householdId,
        type: input.type,
        amountMinorUnits: input.amountMinorUnits,
        currency: input.currency,
        sourceAccountId: input.sourceAccountId,
        destinationAccountId: input.destinationAccountId,
        categoryId: input.categoryId,
        description: input.description,
        merchantName: input.merchantName,
        notes: input.notes,
        dateUtc: new Date(input.dateUtc),
        paymentMethod: input.paymentMethod,
        status: 'completed',
        tags: input.tags || []
      });
      return doc.toTransaction();
    }

    const id = new mongoose.Types.ObjectId().toString();
    const now = new Date().toISOString();
    const txn: Transaction = {
      id,
      userId,
      householdId: input.householdId,
      type: input.type,
      amountMinorUnits: input.amountMinorUnits,
      currency: input.currency,
      sourceAccountId: input.sourceAccountId,
      destinationAccountId: input.destinationAccountId,
      categoryId: input.categoryId,
      description: input.description,
      merchantName: input.merchantName,
      notes: input.notes,
      dateUtc: input.dateUtc,
      paymentMethod: input.paymentMethod,
      status: 'completed',
      isRecurring: false,
      tags: input.tags || [],
      createdAt: now,
      updatedAt: now
    };
    memoryTransactions.set(id, txn);
    return txn;
  }

  static async listTransactions(
    userId: string,
    query: Partial<TransactionQueryInput> = {}
  ): Promise<{ transactions: Transaction[]; total: number; page: number; limit: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    if (query.householdId) {
      await this.validateHouseholdAccess(query.householdId, userId, 'viewer');
    }

    if (this.isDbConnected()) {
      const filter: any = query.householdId
        ? { householdId: query.householdId }
        : {
            userId,
            $or: [{ householdId: { $exists: false } }, { householdId: null }, { householdId: '' }]
          };

      if (query.type) filter.type = query.type;
      if (query.sourceAccountId) filter.sourceAccountId = query.sourceAccountId;
      if (query.categoryId) filter.categoryId = query.categoryId;
      if (query.startDateUtc || query.endDateUtc) {
        filter.dateUtc = {};
        if (query.startDateUtc) filter.dateUtc.$gte = new Date(query.startDateUtc);
        if (query.endDateUtc) filter.dateUtc.$lte = new Date(query.endDateUtc);
      }
      if (query.search) {
        const safeRegex = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.$or = [
          { description: { $regex: safeRegex, $options: 'i' } },
          { merchantName: { $regex: safeRegex, $options: 'i' } }
        ];
      }

      const sortField = query.sortBy || 'dateUtc';
      const sortDirection = query.sortOrder === 'asc' ? 1 : -1;

      const [docs, total] = await Promise.all([
        TransactionModel.find(filter)
          .sort({ [sortField]: sortDirection })
          .skip((page - 1) * limit)
          .limit(limit)
          .exec(),
        TransactionModel.countDocuments(filter).exec()
      ]);

      return {
        transactions: docs.map((d) => d.toTransaction()),
        total,
        page,
        limit
      };
    }

    let all: Transaction[] = [];
    for (const t of memoryTransactions.values()) {
      if (query.householdId) {
        if (t.householdId !== query.householdId) continue;
      } else {
        if (t.userId !== userId || t.householdId) continue;
      }
      if (query.type && t.type !== query.type) continue;
      if (query.sourceAccountId && t.sourceAccountId !== query.sourceAccountId) continue;
      if (query.categoryId && t.categoryId !== query.categoryId) continue;
      if (query.startDateUtc && new Date(t.dateUtc) < new Date(query.startDateUtc)) continue;
      if (query.endDateUtc && new Date(t.dateUtc) > new Date(query.endDateUtc)) continue;
      if (query.search) {
        const s = query.search.toLowerCase();
        const matchesDesc = t.description.toLowerCase().includes(s);
        const matchesMerchant = t.merchantName?.toLowerCase().includes(s);
        if (!matchesDesc && !matchesMerchant) continue;
      }
      all.push(t);
    }

    // Sort
    const sortField = query.sortBy || 'dateUtc';
    const sortDir = query.sortOrder === 'asc' ? 1 : -1;
    all.sort((a, b) => {
      const valA = (a as any)[sortField];
      const valB = (b as any)[sortField];
      if (valA < valB) return -1 * sortDir;
      if (valA > valB) return 1 * sortDir;
      return 0;
    });

    const total = all.length;
    const paginated = all.slice((page - 1) * limit, page * limit);
    return { transactions: paginated, total, page, limit };
  }

  static async getTransactionById(id: string, userId: string): Promise<Transaction | null> {
    if (this.isDbConnected()) {
      const doc = await TransactionModel.findById(id).exec();
      if (!doc || doc.userId !== userId) return null;
      return doc.toTransaction();
    }

    const t = memoryTransactions.get(id);
    if (!t || t.userId !== userId) return null;
    return t;
  }

  static async updateTransaction(
    id: string,
    userId: string,
    updates: UpdateTransactionInput
  ): Promise<Transaction | null> {
    const existing = await this.getTransactionById(id, userId);
    if (!existing) return null;

    const newSourceAccountId = updates.sourceAccountId || existing.sourceAccountId;
    const newDestAccountId =
      updates.destinationAccountId !== undefined ? updates.destinationAccountId : existing.destinationAccountId;
    const newType = updates.type || existing.type;
    const newAmount =
      updates.amountMinorUnits !== undefined ? updates.amountMinorUnits : existing.amountMinorUnits;

    // Verify source account belongs to user
    const sourceAcc = await this.getAccountById(newSourceAccountId, userId);
    if (!sourceAcc) {
      throw AppError.notFound('Source account not found or access denied.');
    }

    if (newType === 'transfer') {
      if (!newDestAccountId) {
        throw AppError.badRequest('Destination account is required for transfer.');
      }
      const destAcc = await this.getAccountById(newDestAccountId, userId);
      if (!destAcc) {
        throw AppError.notFound('Destination account not found or access denied.');
      }
      if (newSourceAccountId === newDestAccountId) {
        throw AppError.badRequest('Source and destination accounts must be different.');
      }
    }

    const newStatus = updates.status || existing.status;

    // 1. Revert old transaction balance impact if it wasn't already cancelled
    if (existing.status !== 'cancelled') {
      if (existing.type === 'expense') {
        await this.adjustAccountBalance(existing.sourceAccountId, existing.amountMinorUnits);
      } else if (existing.type === 'income') {
        await this.adjustAccountBalance(existing.sourceAccountId, -existing.amountMinorUnits);
      } else if (existing.type === 'transfer' && existing.destinationAccountId) {
        await this.adjustAccountBalance(existing.sourceAccountId, existing.amountMinorUnits);
        await this.adjustAccountBalance(existing.destinationAccountId, -existing.amountMinorUnits);
      }
    }

    // 2. Apply new transaction balance impact only if new status is not cancelled
    if (newStatus !== 'cancelled') {
      if (newType === 'expense') {
        await this.adjustAccountBalance(newSourceAccountId, -newAmount);
      } else if (newType === 'income') {
        await this.adjustAccountBalance(newSourceAccountId, newAmount);
      } else if (newType === 'transfer' && newDestAccountId) {
        await this.adjustAccountBalance(newSourceAccountId, -newAmount);
        await this.adjustAccountBalance(newDestAccountId, newAmount);
      }
    }

    // 3. Persist updates
    if (this.isDbConnected()) {
      const doc = await TransactionModel.findOne({ _id: id, userId }).exec();
      if (!doc) return null;

      if (updates.type) doc.type = updates.type;
      if (updates.amountMinorUnits !== undefined) doc.amountMinorUnits = updates.amountMinorUnits;
      if (updates.sourceAccountId) doc.sourceAccountId = updates.sourceAccountId;
      if (updates.destinationAccountId !== undefined) doc.destinationAccountId = updates.destinationAccountId;
      if (updates.categoryId !== undefined) doc.categoryId = updates.categoryId;
      if (updates.description) doc.description = updates.description;
      if (updates.merchantName !== undefined) doc.merchantName = updates.merchantName;
      if (updates.notes !== undefined) (doc as any).notes = updates.notes;
      if (updates.dateUtc) doc.dateUtc = new Date(updates.dateUtc);
      if (updates.paymentMethod) doc.paymentMethod = updates.paymentMethod;
      if (updates.status) doc.status = updates.status;
      if (updates.tags) doc.tags = updates.tags;

      await doc.save();
      return doc.toTransaction();
    }

    const updated: Transaction = {
      ...existing,
      type: newType,
      amountMinorUnits: newAmount,
      sourceAccountId: newSourceAccountId,
      destinationAccountId: newDestAccountId,
      categoryId: updates.categoryId !== undefined ? updates.categoryId : existing.categoryId,
      description: updates.description || existing.description,
      merchantName: updates.merchantName !== undefined ? updates.merchantName : existing.merchantName,
      notes: updates.notes !== undefined ? updates.notes : existing.notes,
      dateUtc: updates.dateUtc || existing.dateUtc,
      paymentMethod: updates.paymentMethod || existing.paymentMethod,
      status: newStatus,
      tags: updates.tags || existing.tags,
      updatedAt: new Date().toISOString()
    };
    memoryTransactions.set(id, updated);
    return updated;
  }

  static async deleteTransaction(id: string, userId: string): Promise<boolean> {
    const txn = await this.getTransactionById(id, userId);
    if (!txn) return false;

    // Reverse balance effect
    if (txn.type === 'expense') {
      await this.adjustAccountBalance(txn.sourceAccountId, txn.amountMinorUnits);
    } else if (txn.type === 'income') {
      await this.adjustAccountBalance(txn.sourceAccountId, -txn.amountMinorUnits);
    } else if (txn.type === 'transfer' && txn.destinationAccountId) {
      await this.adjustAccountBalance(txn.sourceAccountId, txn.amountMinorUnits);
      await this.adjustAccountBalance(txn.destinationAccountId, -txn.amountMinorUnits);
    }

    if (this.isDbConnected()) {
      const res = await TransactionModel.deleteOne({ _id: id, userId }).exec();
      return (res.deletedCount || 0) > 0;
    }

    memoryTransactions.delete(id);
    return true;
  }

  // ==========================================
  // Budgets
  // ==========================================
  static async createBudget(userId: string, input: CreateBudgetInput): Promise<Budget> {
    const categoryId = input.categoryId || 'OVERALL';

    if (this.isDbConnected()) {
      const existing = await BudgetModel.findOne({
        userId,
        categoryId,
        periodMonth: input.periodMonth,
        periodYear: input.periodYear
      }).exec();

      if (existing) {
        throw AppError.conflict('A budget for this category and period already exists.');
      }

      const doc = await BudgetModel.create({
        userId,
        householdId: input.householdId,
        categoryId,
        periodMonth: input.periodMonth,
        periodYear: input.periodYear,
        limitAmountMinorUnits: input.limitAmountMinorUnits,
        currency: input.currency,
        alertThresholdPct: input.alertThresholdPct
      });
      return doc.toBudget(0);
    }

    for (const b of memoryBudgets.values()) {
      const existingCat = b.categoryId || 'OVERALL';
      if (
        b.userId === userId &&
        existingCat === categoryId &&
        b.periodMonth === input.periodMonth &&
        b.periodYear === input.periodYear
      ) {
        throw AppError.conflict('A budget for this category and period already exists.');
      }
    }

    const id = new mongoose.Types.ObjectId().toString();
    const now = new Date().toISOString();
    const budget: Budget = {
      id,
      userId,
      householdId: input.householdId,
      categoryId: categoryId === 'OVERALL' ? undefined : categoryId,
      periodMonth: input.periodMonth,
      periodYear: input.periodYear,
      limitAmountMinorUnits: input.limitAmountMinorUnits,
      currency: input.currency,
      alertThresholdPct: input.alertThresholdPct,
      spentAmountMinorUnits: 0,
      remainingAmountMinorUnits: input.limitAmountMinorUnits,
      consumedPercent: 0,
      isExceeded: false,
      createdAt: now,
      updatedAt: now
    };
    memoryBudgets.set(id, budget);
    return budget;
  }

  static async listBudgets(
    userId: string,
    periodMonth: number,
    periodYear: number
  ): Promise<Budget[]> {
    // 1. Fetch all budgets for the period
    let budgets: Budget[] = [];

    if (this.isDbConnected()) {
      const docs = await BudgetModel.find({ userId, periodMonth, periodYear }).exec();
      budgets = docs.map((d) => d.toBudget(0));
    } else {
      for (const b of memoryBudgets.values()) {
        if (b.userId === userId && b.periodMonth === periodMonth && b.periodYear === periodYear) {
          budgets.push({ ...b, spentAmountMinorUnits: 0 });
        }
      }
    }

    // 2. Calculate actual spending per category and overall for this month
    // Strictly eligible expense transactions: type === 'expense' && status !== 'cancelled'
    const startOfMonth = new Date(Date.UTC(periodYear, periodMonth - 1, 1));
    const endOfMonth = new Date(Date.UTC(periodYear, periodMonth, 0, 23, 59, 59, 999));

    const spendingByCategory = new Map<string, number>();
    let totalExpenseMinorUnits = 0;

    if (this.isDbConnected()) {
      const txns = await TransactionModel.find({
        userId,
        type: 'expense',
        status: { $ne: 'cancelled' },
        dateUtc: { $gte: startOfMonth, $lte: endOfMonth }
      }).exec();

      for (const t of txns) {
        totalExpenseMinorUnits += t.amountMinorUnits;
        if (t.categoryId) {
          const current = spendingByCategory.get(t.categoryId) || 0;
          spendingByCategory.set(t.categoryId, current + t.amountMinorUnits);
        }
      }
    } else {
      for (const t of memoryTransactions.values()) {
        if (
          t.userId === userId &&
          t.type === 'expense' &&
          t.status !== 'cancelled' &&
          new Date(t.dateUtc) >= startOfMonth &&
          new Date(t.dateUtc) <= endOfMonth
        ) {
          totalExpenseMinorUnits += t.amountMinorUnits;
          if (t.categoryId) {
            const current = spendingByCategory.get(t.categoryId) || 0;
            spendingByCategory.set(t.categoryId, current + t.amountMinorUnits);
          }
        }
      }
    }

    return budgets.map((b) => {
      const isOverall = !b.categoryId || b.categoryId === 'OVERALL';
      const spentAmountMinorUnits = isOverall
        ? totalExpenseMinorUnits
        : spendingByCategory.get(b.categoryId!) || 0;

      const remainingAmountMinorUnits = Math.max(0, b.limitAmountMinorUnits - spentAmountMinorUnits);
      const consumedPercent =
        b.limitAmountMinorUnits > 0
          ? Number(((spentAmountMinorUnits / b.limitAmountMinorUnits) * 100).toFixed(1))
          : 0;
      const isExceeded = spentAmountMinorUnits > b.limitAmountMinorUnits;

      return {
        ...b,
        spentAmountMinorUnits,
        remainingAmountMinorUnits,
        consumedPercent,
        isExceeded
      };
    });
  }

  static async getBudgetById(id: string, userId: string): Promise<Budget | null> {
    let rawBudget: Budget | null = null;
    if (this.isDbConnected()) {
      const doc = await BudgetModel.findById(id).exec();
      if (!doc || doc.userId !== userId) return null;
      rawBudget = doc.toBudget(0);
    } else {
      const b = memoryBudgets.get(id);
      if (!b || b.userId !== userId) return null;
      rawBudget = b;
    }

    if (!rawBudget) return null;

    // Recalculate spending for this budget's period
    const list = await this.listBudgets(userId, rawBudget.periodMonth, rawBudget.periodYear);
    const found = list.find((b) => b.id === id);
    return found || rawBudget;
  }

  static async updateBudget(
    id: string,
    userId: string,
    updates: { limitAmountMinorUnits?: number; alertThresholdPct?: number }
  ): Promise<Budget | null> {
    if (this.isDbConnected()) {
      const doc = await BudgetModel.findOne({ _id: id, userId }).exec();
      if (!doc) return null;
      if (updates.limitAmountMinorUnits) doc.limitAmountMinorUnits = updates.limitAmountMinorUnits;
      if (updates.alertThresholdPct) doc.alertThresholdPct = updates.alertThresholdPct;
      await doc.save();
      return this.getBudgetById(id, userId);
    }

    const b = memoryBudgets.get(id);
    if (!b || b.userId !== userId) return null;
    const updated: Budget = {
      ...b,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    memoryBudgets.set(id, updated);
    return this.getBudgetById(id, userId);
  }

  static async deleteBudget(id: string, userId: string): Promise<boolean> {
    if (this.isDbConnected()) {
      const res = await BudgetModel.deleteOne({ _id: id, userId }).exec();
      return (res.deletedCount || 0) > 0;
    }

    const b = memoryBudgets.get(id);
    if (!b || b.userId !== userId) return false;
    memoryBudgets.delete(id);
    return true;
  }

  static async checkAndTriggerBudgetAlerts(
    userId: string,
    periodMonth: number,
    periodYear: number
  ): Promise<Notification[]> {
    const budgets = await this.listBudgets(userId, periodMonth, periodYear);
    const categories = await this.listCategories(userId);
    const catMap = new Map(categories.map((c) => [c.id, c.name]));

    const existingNotifications = await this.listNotifications(userId);
    const triggered: Notification[] = [];

    for (const budget of budgets) {
      const thresholdsToCheck = Array.from(
        new Set([budget.alertThresholdPct, 75, 90, 100])
      ).sort((a, b) => a - b);

      const consumedPct = budget.consumedPercent || 0;
      const catName = budget.categoryId ? (catMap.get(budget.categoryId) || 'Category') : 'Overall Monthly Budget';

      for (const threshold of thresholdsToCheck) {
        if (consumedPct >= threshold) {
          // Check if an alert for this budget, period, and threshold already exists
          const alreadyTriggered = existingNotifications.some((n) => {
            return (
              n.type === 'budget_alert' &&
              n.metadata?.budgetId === budget.id &&
              n.metadata?.periodMonth === periodMonth &&
              n.metadata?.periodYear === periodYear &&
              n.metadata?.thresholdPct === threshold
            );
          });

          if (!alreadyTriggered) {
            const formattedSpent = formatMinorUnits(budget.spentAmountMinorUnits || 0, budget.currency);
            const formattedLimit = formatMinorUnits(budget.limitAmountMinorUnits, budget.currency);

            const title = consumedPct >= 100
              ? `Budget Exceeded: ${catName}`
              : `Budget Alert: ${catName} (${threshold}% Reached)`;

            const message = consumedPct >= 100
              ? `You have exceeded your ${catName} budget for ${periodMonth}/${periodYear}. Spent: ${formattedSpent} (Limit: ${formattedLimit}).`
              : `You have consumed ${consumedPct}% of your ${catName} budget for ${periodMonth}/${periodYear} (${formattedSpent} of ${formattedLimit}).`;

            const notif = await this.createNotification(userId, 'budget_alert', title, message, {
              budgetId: budget.id,
              categoryId: budget.categoryId,
              periodMonth,
              periodYear,
              thresholdPct: threshold,
              consumedPercent: consumedPct,
              spentAmountMinorUnits: budget.spentAmountMinorUnits,
              limitAmountMinorUnits: budget.limitAmountMinorUnits
            });

            triggered.push(notif);
            existingNotifications.push(notif);
          }
        }
      }
    }

    return triggered;
  }

  // ==========================================
  // Savings Goals
  // ==========================================
  static async createGoal(userId: string, input: CreateGoalInput): Promise<SavingsGoal> {
    const isLinked = input.fundingMode === 'linked_account' && !!input.linkedAccountId;
    let linkedBalance = 0;
    if (isLinked && input.linkedAccountId) {
      const acc = await this.getAccountById(input.linkedAccountId, userId);
      if (acc) linkedBalance = acc.balanceMinorUnits;
    }

    if (this.isDbConnected()) {
      const doc = await Goal.create({
        userId,
        householdId: input.householdId,
        name: input.name,
        targetAmountMinorUnits: input.targetAmountMinorUnits,
        currentAmountMinorUnits: isLinked ? linkedBalance : 0,
        currency: input.currency,
        targetDateUtc: input.targetDateUtc ? new Date(input.targetDateUtc) : undefined,
        color: input.color,
        icon: input.icon,
        linkedAccountId: input.linkedAccountId,
        fundingMode: input.fundingMode || 'explicit_contribution',
        status: 'active'
      });
      return doc.toGoal(isLinked ? linkedBalance : undefined);
    }

    const id = new mongoose.Types.ObjectId().toString();
    const now = new Date().toISOString();
    const currentAmount = isLinked ? linkedBalance : 0;
    const progressPercent = Math.min(100, Math.round((currentAmount / input.targetAmountMinorUnits) * 100));

    let daysRemaining: number | undefined;
    let requiredDailyPaceMinorUnits: number | undefined;
    let requiredMonthlyPaceMinorUnits: number | undefined;

    if (input.targetDateUtc) {
      const diffMs = new Date(input.targetDateUtc).getTime() - Date.now();
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      const needed = Math.max(0, input.targetAmountMinorUnits - currentAmount);

      if (daysRemaining > 0 && needed > 0) {
        requiredDailyPaceMinorUnits = Math.ceil(needed / daysRemaining);
        requiredMonthlyPaceMinorUnits = Math.ceil(needed / Math.max(1, daysRemaining / 30.44));
      } else if (needed === 0) {
        requiredDailyPaceMinorUnits = 0;
        requiredMonthlyPaceMinorUnits = 0;
      }
    }

    const goal: SavingsGoal = {
      id,
      userId,
      householdId: input.householdId,
      name: input.name,
      targetAmountMinorUnits: input.targetAmountMinorUnits,
      currentAmountMinorUnits: currentAmount,
      currency: input.currency,
      targetDateUtc: input.targetDateUtc,
      color: input.color,
      icon: input.icon,
      linkedAccountId: input.linkedAccountId,
      fundingMode: input.fundingMode || 'explicit_contribution',
      status: currentAmount >= input.targetAmountMinorUnits ? 'completed' : 'active',
      progressPercent,
      requiredDailyPaceMinorUnits,
      requiredMonthlyPaceMinorUnits,
      daysRemaining,
      createdAt: now,
      updatedAt: now
    };
    memoryGoals.set(id, goal);
    return goal;
  }

  static async listGoals(userId: string): Promise<SavingsGoal[]> {
    const accounts = await this.listAccounts(userId);
    const accountMap = new Map(accounts.map((a) => [a.id, a.balanceMinorUnits]));

    if (this.isDbConnected()) {
      const docs = await Goal.find({ userId }).sort({ createdAt: -1 }).exec();
      return docs.map((d) => {
        const isLinked = d.fundingMode === 'linked_account' && d.linkedAccountId;
        const accBal = isLinked && d.linkedAccountId ? accountMap.get(d.linkedAccountId) : undefined;
        return d.toGoal(accBal);
      });
    }

    const goals: SavingsGoal[] = [];
    for (const g of memoryGoals.values()) {
      if (g.userId === userId) {
        const isLinked = g.fundingMode === 'linked_account' && g.linkedAccountId;
        const accBal = isLinked && g.linkedAccountId ? accountMap.get(g.linkedAccountId) : undefined;
        const currentAmount = accBal !== undefined ? Math.max(0, accBal) : g.currentAmountMinorUnits;
        const progressPercent = Math.min(100, Math.round((currentAmount / g.targetAmountMinorUnits) * 100));

        let daysRemaining: number | undefined;
        let requiredDailyPaceMinorUnits: number | undefined;
        let requiredMonthlyPaceMinorUnits: number | undefined;

        if (g.targetDateUtc) {
          const diffMs = new Date(g.targetDateUtc).getTime() - Date.now();
          daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
          const needed = Math.max(0, g.targetAmountMinorUnits - currentAmount);

          if (daysRemaining > 0 && needed > 0) {
            requiredDailyPaceMinorUnits = Math.ceil(needed / daysRemaining);
            requiredMonthlyPaceMinorUnits = Math.ceil(needed / Math.max(1, daysRemaining / 30.44));
          } else if (needed === 0) {
            requiredDailyPaceMinorUnits = 0;
            requiredMonthlyPaceMinorUnits = 0;
          }
        }

        const status = currentAmount >= g.targetAmountMinorUnits ? 'completed' : g.status;

        goals.push({
          ...g,
          currentAmountMinorUnits: currentAmount,
          progressPercent,
          requiredDailyPaceMinorUnits,
          requiredMonthlyPaceMinorUnits,
          daysRemaining,
          status
        });
      }
    }
    return goals;
  }

  static async getGoalById(id: string, userId: string): Promise<SavingsGoal | null> {
    const accounts = await this.listAccounts(userId);
    const accountMap = new Map(accounts.map((a) => [a.id, a.balanceMinorUnits]));

    if (this.isDbConnected()) {
      const doc = await Goal.findById(id).exec();
      if (!doc || doc.userId !== userId) return null;
      const isLinked = doc.fundingMode === 'linked_account' && doc.linkedAccountId;
      const accBal = isLinked && doc.linkedAccountId ? accountMap.get(doc.linkedAccountId) : undefined;
      return doc.toGoal(accBal);
    }

    const g = memoryGoals.get(id);
    if (!g || g.userId !== userId) return null;

    const isLinked = g.fundingMode === 'linked_account' && g.linkedAccountId;
    const accBal = isLinked && g.linkedAccountId ? accountMap.get(g.linkedAccountId) : undefined;
    const currentAmount = accBal !== undefined ? Math.max(0, accBal) : g.currentAmountMinorUnits;
    const progressPercent = Math.min(100, Math.round((currentAmount / g.targetAmountMinorUnits) * 100));

    let daysRemaining: number | undefined;
    let requiredDailyPaceMinorUnits: number | undefined;
    let requiredMonthlyPaceMinorUnits: number | undefined;

    if (g.targetDateUtc) {
      const diffMs = new Date(g.targetDateUtc).getTime() - Date.now();
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      const needed = Math.max(0, g.targetAmountMinorUnits - currentAmount);

      if (daysRemaining > 0 && needed > 0) {
        requiredDailyPaceMinorUnits = Math.ceil(needed / daysRemaining);
        requiredMonthlyPaceMinorUnits = Math.ceil(needed / Math.max(1, daysRemaining / 30.44));
      } else if (needed === 0) {
        requiredDailyPaceMinorUnits = 0;
        requiredMonthlyPaceMinorUnits = 0;
      }
    }

    return {
      ...g,
      currentAmountMinorUnits: currentAmount,
      progressPercent,
      requiredDailyPaceMinorUnits,
      requiredMonthlyPaceMinorUnits,
      daysRemaining,
      status: currentAmount >= g.targetAmountMinorUnits ? 'completed' : g.status
    };
  }

  static async updateGoal(
    id: string,
    userId: string,
    updates: Partial<SavingsGoal>
  ): Promise<SavingsGoal | null> {
    if (this.isDbConnected()) {
      const doc = await Goal.findOne({ _id: id, userId }).exec();
      if (!doc) return null;
      if (updates.name) doc.name = updates.name;
      if (updates.targetAmountMinorUnits) doc.targetAmountMinorUnits = updates.targetAmountMinorUnits;
      if (updates.targetDateUtc) doc.targetDateUtc = new Date(updates.targetDateUtc);
      if (updates.status) doc.status = updates.status;
      if (updates.linkedAccountId !== undefined) doc.linkedAccountId = updates.linkedAccountId;
      if (updates.fundingMode) doc.fundingMode = updates.fundingMode;
      await doc.save();
      return this.getGoalById(id, userId);
    }

    const g = memoryGoals.get(id);
    if (!g || g.userId !== userId) return null;
    const updated: SavingsGoal = {
      ...g,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    memoryGoals.set(id, updated);
    return this.getGoalById(id, userId);
  }

  static async contributeToGoal(
    goalId: string,
    userId: string,
    amountMinorUnits: number,
    sourceAccountId: string
  ): Promise<SavingsGoal> {
    const goal = await this.getGoalById(goalId, userId);
    if (!goal) throw AppError.notFound('Savings goal not found.');

    const sourceAcc = await this.getAccountById(sourceAccountId, userId);
    if (!sourceAcc) throw AppError.notFound('Source account not found.');

    // If fundingMode is linked_account, prevent double counting
    if (goal.fundingMode === 'linked_account') {
      throw AppError.badRequest(
        'This goal is funded directly by a linked account balance. Deposit or transfer money to that account instead.'
      );
    }

    // Deduct from account
    await this.adjustAccountBalance(sourceAccountId, -amountMinorUnits);

    const newCurrent = goal.currentAmountMinorUnits + amountMinorUnits;
    const isCompleted = newCurrent >= goal.targetAmountMinorUnits;

    if (this.isDbConnected()) {
      const doc = await Goal.findById(goalId).exec();
      if (doc) {
        doc.currentAmountMinorUnits = newCurrent;
        if (isCompleted) doc.status = 'completed';
        await doc.save();
        return this.getGoalById(goalId, userId) as Promise<SavingsGoal>;
      }
    }

    const updated: SavingsGoal = {
      ...goal,
      currentAmountMinorUnits: newCurrent,
      status: isCompleted ? 'completed' : goal.status,
      progressPercent: Math.min(100, Math.round((newCurrent / goal.targetAmountMinorUnits) * 100)),
      updatedAt: new Date().toISOString()
    };
    memoryGoals.set(goalId, updated);
    return updated;
  }

  static async deleteGoal(id: string, userId: string): Promise<boolean> {
    if (this.isDbConnected()) {
      const res = await Goal.deleteOne({ _id: id, userId }).exec();
      return (res.deletedCount || 0) > 0;
    }

    const g = memoryGoals.get(id);
    if (!g || g.userId !== userId) return false;
    memoryGoals.delete(id);
    return true;
  }

  // ==========================================
  // Recurring Schedules
  // ==========================================
  static async createRecurring(
    userId: string,
    input: CreateRecurringInput
  ): Promise<RecurringSchedule> {
    const sourceAcc = await this.getAccountById(input.sourceAccountId, userId);
    if (!sourceAcc) throw AppError.notFound('Source account not found.');

    const nextRun = new Date(input.startDateUtc);

    if (this.isDbConnected()) {
      const doc = await Recurring.create({
        userId,
        householdId: input.householdId,
        type: input.type,
        amountMinorUnits: input.amountMinorUnits,
        currency: input.currency,
        sourceAccountId: input.sourceAccountId,
        destinationAccountId: input.destinationAccountId,
        categoryId: input.categoryId,
        description: input.description,
        merchantName: input.merchantName,
        frequency: input.frequency,
        timezone: input.timezone,
        startDateUtc: new Date(input.startDateUtc),
        nextRunDateUtc: nextRun,
        endDateUtc: input.endDateUtc ? new Date(input.endDateUtc) : undefined,
        isActive: true
      });
      return doc.toSchedule();
    }

    const id = new mongoose.Types.ObjectId().toString();
    const now = new Date().toISOString();
    const schedule: RecurringSchedule = {
      id,
      userId,
      householdId: input.householdId,
      type: input.type,
      amountMinorUnits: input.amountMinorUnits,
      currency: input.currency,
      sourceAccountId: input.sourceAccountId,
      destinationAccountId: input.destinationAccountId,
      categoryId: input.categoryId,
      description: input.description,
      merchantName: input.merchantName,
      frequency: input.frequency,
      timezone: input.timezone,
      startDateUtc: input.startDateUtc,
      nextRunDateUtc: nextRun.toISOString(),
      endDateUtc: input.endDateUtc,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };
    memoryRecurring.set(id, schedule);
    return schedule;
  }

  static async listRecurring(userId: string): Promise<RecurringSchedule[]> {
    if (this.isDbConnected()) {
      const docs = await Recurring.find({ userId }).sort({ nextRunDateUtc: 1 }).exec();
      return docs.map((d) => d.toSchedule());
    }

    const list: RecurringSchedule[] = [];
    for (const r of memoryRecurring.values()) {
      if (r.userId === userId) list.push(r);
    }
    return list;
  }

  static async deleteRecurring(id: string, userId: string): Promise<boolean> {
    if (this.isDbConnected()) {
      const res = await Recurring.deleteOne({ _id: id, userId }).exec();
      return (res.deletedCount || 0) > 0;
    }

    const r = memoryRecurring.get(id);
    if (!r || r.userId !== userId) return false;
    memoryRecurring.delete(id);
    return true;
  }

  static async getRecurringById(id: string, userId: string): Promise<RecurringSchedule | null> {
    if (this.isDbConnected()) {
      const doc = await Recurring.findById(id).exec();
      if (!doc || doc.userId !== userId) return null;
      return doc.toSchedule();
    }
    const r = memoryRecurring.get(id);
    if (!r || r.userId !== userId) return null;
    return r;
  }

  static async updateRecurring(
    id: string,
    userId: string,
    updates: Partial<RecurringSchedule>
  ): Promise<RecurringSchedule | null> {
    if (this.isDbConnected()) {
      const doc = await Recurring.findOne({ _id: id, userId }).exec();
      if (!doc) return null;
      if (updates.isActive !== undefined) doc.isActive = updates.isActive;
      if (updates.amountMinorUnits !== undefined) doc.amountMinorUnits = updates.amountMinorUnits;
      if (updates.frequency) doc.frequency = updates.frequency;
      if (updates.description) doc.description = updates.description;
      if (updates.endDateUtc) doc.endDateUtc = new Date(updates.endDateUtc);
      if (updates.nextRunDateUtc) doc.nextRunDateUtc = new Date(updates.nextRunDateUtc);
      await doc.save();
      return doc.toSchedule();
    }
    const r = memoryRecurring.get(id);
    if (!r || r.userId !== userId) return null;
    const updated: RecurringSchedule = {
      ...r,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    memoryRecurring.set(id, updated);
    return updated;
  }

  static calculateNextRunDate(
    startDate: Date,
    currentRunDate: Date,
    frequency: RecurringFrequency
  ): Date {
    const next = new Date(currentRunDate.getTime());
    const origDay = startDate.getUTCDate();

    if (frequency === 'daily') {
      next.setUTCDate(next.getUTCDate() + 1);
    } else if (frequency === 'weekly') {
      next.setUTCDate(next.getUTCDate() + 7);
    } else if (frequency === 'biweekly') {
      next.setUTCDate(next.getUTCDate() + 14);
    } else if (frequency === 'monthly') {
      let targetYear = next.getUTCFullYear();
      let targetMonth = next.getUTCMonth() + 1;
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear += 1;
      }
      const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
      const clampedDay = Math.min(origDay, daysInTargetMonth);
      next.setUTCDate(1);
      next.setUTCFullYear(targetYear);
      next.setUTCMonth(targetMonth);
      next.setUTCDate(clampedDay);
    } else if (frequency === 'yearly') {
      const targetYear = next.getUTCFullYear() + 1;
      const targetMonth = startDate.getUTCMonth();
      const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
      const clampedDay = Math.min(origDay, daysInTargetMonth);
      next.setUTCDate(1);
      next.setUTCFullYear(targetYear);
      next.setUTCMonth(targetMonth);
      next.setUTCDate(clampedDay);
    }

    return next;
  }

  static async processDueRecurring(userId: string): Promise<{
    processedCount: number;
    transactions: Transaction[];
  }> {
    const now = new Date();
    const processedTransactions: Transaction[] = [];

    const rules = await this.listRecurring(userId);
    const dueRules = rules.filter((r) => r.isActive && new Date(r.nextRunDateUtc) <= now);

    for (const rule of dueRules) {
      const currentRunDate = new Date(rule.nextRunDateUtc);
      const cycleKey = currentRunDate.toISOString().slice(0, 10);

      const existing = await this.listTransactions(userId, { limit: 100 });
      const alreadyPosted = existing.transactions.some(
        (t) => t.recurringRuleId === rule.id && t.dateUtc.slice(0, 10) === cycleKey
      );

      if (!alreadyPosted) {
        const txn = await this.createTransaction(userId, {
          type: rule.type,
          amountMinorUnits: rule.amountMinorUnits,
          currency: rule.currency,
          sourceAccountId: rule.sourceAccountId,
          destinationAccountId: rule.destinationAccountId,
          categoryId: rule.categoryId,
          description: `${rule.description} (Recurring)`,
          merchantName: rule.merchantName,
          dateUtc: currentRunDate.toISOString(),
          paymentMethod: 'other',
          tags: ['recurring']
        });

        if (this.isDbConnected()) {
          await TransactionModel.updateOne({ _id: txn.id }, { isRecurring: true, recurringRuleId: rule.id }).exec();
        } else {
          const memTx = memoryTransactions.get(txn.id);
          if (memTx) {
            memTx.isRecurring = true;
            memTx.recurringRuleId = rule.id;
            memoryTransactions.set(txn.id, memTx);
          }
        }
        processedTransactions.push({ ...txn, isRecurring: true, recurringRuleId: rule.id });
      }

      const nextRun = this.calculateNextRunDate(new Date(rule.startDateUtc), currentRunDate, rule.frequency);
      const isPastEnd = rule.endDateUtc && nextRun > new Date(rule.endDateUtc);

      await this.updateRecurring(rule.id, userId, {
        nextRunDateUtc: nextRun.toISOString(),
        lastRunDateUtc: now.toISOString(),
        isActive: !isPastEnd
      });
    }

    return {
      processedCount: processedTransactions.length,
      transactions: processedTransactions
    };
  }

  // ==========================================
  // CSV Import
  // ==========================================
  static parseCsv(csvString: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let insideQuote = false;

    const normalized = csvString.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    for (let i = 0; i < normalized.length; i++) {
      const char = normalized[i];
      const nextChar = normalized[i + 1];

      if (char === '"') {
        if (insideQuote && nextChar === '"') {
          currentField += '"';
          i++;
        } else {
          insideQuote = !insideQuote;
        }
      } else if (char === ',' && !insideQuote) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\n' && !insideQuote) {
        currentRow.push(currentField.trim());
        if (currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }

    if (currentField.length > 0 || currentRow.length > 0) {
      currentRow.push(currentField.trim());
      if (currentRow.some((f) => f.length > 0)) {
        rows.push(currentRow);
      }
    }

    return rows;
  }

  static async previewCsvImport(
    userId: string,
    input: CsvImportPreviewInput
  ): Promise<CsvImportPreviewResult> {
    const rawRows = this.parseCsv(input.csvContent);
    if (rawRows.length < 2) {
      throw AppError.badRequest('CSV must contain at least a header row and one data row.');
    }

    const maxRows = 500;
    if (rawRows.length - 1 > maxRows) {
      throw AppError.badRequest(`CSV exceeds maximum limit of ${maxRows} rows.`);
    }

    const firstRow = rawRows[0];
    if (!firstRow) {
      throw AppError.badRequest('CSV header row is missing.');
    }

    const header = firstRow.map((h) => h.toLowerCase());
    const findCol = (keywords: string[]) =>
      header.findIndex((h) => keywords.some((k) => h.includes(k)));

    const dateCol = findCol(['date', 'time', 'day']);
    const typeCol = findCol(['type']);
    const amountCol = findCol(['amount', 'sum', 'total', 'price', 'inr']);
    const descCol = findCol(['description', 'desc', 'title', 'narrative', 'details', 'memo']);
    const catCol = findCol(['category', 'tag']);
    const merchantCol = findCol(['merchant', 'payee', 'vendor', 'store']);
    const notesCol = findCol(['note', 'comment', 'remark']);

    const [existingTxns, categories] = await Promise.all([
      this.listTransactions(userId, { limit: 1000 }),
      this.listCategories(userId)
    ]);

    const catMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));

    const parsedRows: CsvImportRow[] = [];
    let validCount = 0;
    let invalidCount = 0;
    let duplicateCount = 0;

    for (let i = 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row) continue;
      const getCell = (colIdx: number): string => (colIdx >= 0 && row[colIdx] ? row[colIdx]! : '');

      const errors: string[] = [];

      // 1. Parse Date
      const rawDate = getCell(dateCol);
      let parsedDate: Date | null = null;
      if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          parsedDate = d;
        } else {
          errors.push(`Invalid date format: "${rawDate}"`);
        }
      } else {
        parsedDate = new Date();
      }

      // 2. Parse Amount
      const rawAmount = getCell(amountCol).replace(/[^\d.-]/g, '');
      let amountMinorUnits = 0;
      const numAmount = parseFloat(rawAmount || '0');
      if (isNaN(numAmount) || numAmount <= 0) {
        errors.push(`Amount must be a positive number: "${getCell(amountCol)}"`);
      } else {
        amountMinorUnits = toMinorUnits(numAmount, 'INR');
      }

      // 3. Parse Type
      const rawType = getCell(typeCol).toLowerCase();
      let type: 'income' | 'expense' | 'transfer' = 'expense';
      if (rawType.includes('inc') || rawType.includes('credit') || rawType.includes('deposit')) {
        type = 'income';
      } else if (rawType.includes('trans') || rawType.includes('sweep')) {
        type = 'transfer';
      }

      // 4. Parse Description
      const description = getCell(descCol).trim();
      if (!description) {
        errors.push('Description cannot be empty');
      }

      const rawCategory = getCell(catCol).trim() || undefined;
      const matchedCatId = rawCategory ? catMap.get(rawCategory.toLowerCase()) : undefined;

      const merchantName = getCell(merchantCol).trim() || undefined;
      const notes = getCell(notesCol).trim() || undefined;

      const isValid = errors.length === 0;

      let isDuplicate = false;
      let duplicateReason: string | undefined;

      if (isValid && parsedDate) {
        const dateStr = parsedDate.toISOString().slice(0, 10);
        const dupMatch = existingTxns.transactions.find((t) => {
          const tDate = t.dateUtc.slice(0, 10);
          const sameAmount = t.amountMinorUnits === amountMinorUnits;
          const sameDate = tDate === dateStr;
          const sameDesc = t.description.toLowerCase() === description.toLowerCase();
          return sameDate && sameAmount && sameDesc;
        });

        if (dupMatch) {
          isDuplicate = true;
          duplicateReason = `Matches existing transaction on ${dateStr} for ${formatMinorUnits(amountMinorUnits)}`;
          duplicateCount++;
        }
      }

      if (isValid) validCount++;
      else invalidCount++;

      parsedRows.push({
        rowNumber: i,
        dateUtc: parsedDate ? parsedDate.toISOString() : new Date().toISOString(),
        type,
        amountMinorUnits,
        description: description || 'Untitled Transaction',
        categoryName: rawCategory,
        categoryId: matchedCatId,
        accountId: input.defaultAccountId,
        merchantName,
        notes,
        paymentMethod: 'other',
        isDuplicate,
        duplicateReason,
        isValid,
        errors
      });
    }

    return {
      totalRows: rawRows.length - 1,
      validCount,
      invalidCount,
      duplicateCount,
      rows: parsedRows
    };
  }

  static async confirmCsvImport(
    userId: string,
    rows: CsvImportConfirmInput['rows']
  ): Promise<{ importedCount: number; transactions: Transaction[] }> {
    const importedTransactions: Transaction[] = [];

    for (const row of rows) {
      const txn = await this.createTransaction(userId, {
        type: row.type,
        amountMinorUnits: row.amountMinorUnits,
        currency: 'INR',
        sourceAccountId: row.sourceAccountId,
        destinationAccountId: row.destinationAccountId,
        categoryId: row.categoryId,
        description: row.description,
        merchantName: row.merchantName,
        notes: row.notes,
        dateUtc: row.dateUtc,
        paymentMethod: row.paymentMethod,
        tags: row.tags
      });
      importedTransactions.push(txn);
    }

    return {
      importedCount: importedTransactions.length,
      transactions: importedTransactions
    };
  }

  // ==========================================
  // Households / Shared Finances
  // ==========================================
  static async createHousehold(
    ownerId: string,
    ownerEmail: string,
    ownerName: string,
    input: CreateHouseholdInput
  ): Promise<Household> {
    const ownerMember: HouseholdMember = {
      userId: ownerId,
      email: ownerEmail,
      displayName: ownerName,
      role: 'owner' as HouseholdRole,
      joinedAt: new Date().toISOString()
    };

    const initialAudit: HouseholdAuditLog = {
      id: new mongoose.Types.ObjectId().toString(),
      action: 'household_created',
      actorUserId: ownerId,
      actorName: ownerName,
      role: 'owner',
      details: `Created household "${input.name}"`,
      timestamp: new Date().toISOString()
    };

    if (this.isDbConnected()) {
      const doc = await HouseholdModel.create({
        name: input.name,
        ownerId,
        members: [
          {
            ...ownerMember,
            joinedAt: new Date(ownerMember.joinedAt)
          }
        ],
        invitations: [],
        auditLogs: [
          {
            ...initialAudit,
            timestamp: new Date(initialAudit.timestamp)
          }
        ],
        currency: input.currency
      });
      return doc.toHousehold();
    }

    const id = new mongoose.Types.ObjectId().toString();
    const now = new Date().toISOString();
    const hh: Household = {
      id,
      name: input.name,
      ownerId,
      members: [ownerMember],
      invitations: [],
      auditLogs: [initialAudit],
      currency: input.currency,
      createdAt: now,
      updatedAt: now
    };
    memoryHouseholds.set(id, hh);
    return hh;
  }

  static async listHouseholdsForUser(userId: string): Promise<Household[]> {
    if (this.isDbConnected()) {
      const docs = await HouseholdModel.find({ 'members.userId': userId }).exec();
      return docs.map((d) => d.toHousehold());
    }

    const list: Household[] = [];
    for (const hh of memoryHouseholds.values()) {
      if (hh.members.some((m) => m.userId === userId)) {
        list.push(hh);
      }
    }
    return list;
  }

  static async getHouseholdById(id: string, userId?: string): Promise<Household | null> {
    if (this.isDbConnected()) {
      const doc = await HouseholdModel.findById(id).exec();
      if (!doc) return null;
      if (userId && !doc.members.some((m) => m.userId === userId)) return null;
      return doc.toHousehold();
    }

    const hh = memoryHouseholds.get(id);
    if (!hh) return null;
    if (userId && !hh.members.some((m) => m.userId === userId)) return null;
    return hh;
  }

  static async isUserInHousehold(userId: string, householdId: string): Promise<boolean> {
    const hh = await this.getHouseholdById(householdId, userId);
    return !!hh;
  }

  static async validateHouseholdAccess(
    householdId: string,
    userId: string,
    requiredRole: 'viewer' | 'editor' | 'owner' = 'viewer'
  ): Promise<Household> {
    const hh = await this.getHouseholdById(householdId, userId);
    if (!hh) {
      throw AppError.notFound('Household not found or you are not a member.');
    }

    const member = hh.members.find((m) => m.userId === userId);
    if (!member) {
      throw AppError.forbidden('You are not a member of this household.');
    }

    if (requiredRole === 'owner') {
      if (member.role !== 'owner') {
        throw AppError.forbidden('Only the household owner can perform this action.');
      }
    } else if (requiredRole === 'editor') {
      if (member.role === 'viewer') {
        throw AppError.forbidden('Viewers have read-only access and cannot modify household financial data.');
      }
    }

    return hh;
  }

  static async inviteMember(
    householdId: string,
    inviterId: string,
    input: InviteMemberInput,
    targetUser: { id: string; displayName: string }
  ): Promise<Household> {
    const hh = await this.validateHouseholdAccess(householdId, inviterId, 'owner');
    if (hh.members.some((m) => m.userId === targetUser.id)) {
      throw AppError.conflict('User is already a member of this household.');
    }
    const role = (input.role === 'admin' ? 'editor' : input.role === 'member' ? 'viewer' : input.role) as HouseholdRole;
    const newMember: HouseholdMember = {
      userId: targetUser.id,
      email: input.email.toLowerCase().trim(),
      displayName: targetUser.displayName,
      role: role || 'editor',
      joinedAt: new Date().toISOString()
    };
    if (this.isDbConnected()) {
      const doc = await HouseholdModel.findById(householdId).exec();
      if (!doc) throw AppError.notFound('Household not found.');
      doc.members.push({
        ...newMember,
        joinedAt: new Date(newMember.joinedAt)
      });
      await doc.save();
      return doc.toHousehold();
    }
    hh.members.push(newMember);
    hh.updatedAt = new Date().toISOString();
    memoryHouseholds.set(householdId, hh);
    return hh;
  }

  static async createHouseholdInvitation(
    householdId: string,
    inviterUserId: string,
    inviterName: string,
    input: CreateHouseholdInvitationInput
  ): Promise<{ invitation: HouseholdInvitation; inviteLink: string }> {
    const hh = await this.validateHouseholdAccess(householdId, inviterUserId, 'owner');

    const normalizedEmail = input.email.toLowerCase().trim();
    if (hh.members.some((m) => m.email.toLowerCase() === normalizedEmail)) {
      throw AppError.conflict('User is already a member of this household.');
    }

    const token = crypto.randomBytes(24).toString('hex');
    const id = new mongoose.Types.ObjectId().toString();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation: HouseholdInvitation = {
      id,
      householdId,
      householdName: hh.name,
      inviterUserId,
      inviterName,
      inviteeEmail: normalizedEmail,
      role: input.role,
      token,
      status: 'pending',
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString()
    };

    const auditEntry: HouseholdAuditLog = {
      id: new mongoose.Types.ObjectId().toString(),
      action: 'member_invited',
      actorUserId: inviterUserId,
      actorName: inviterName,
      targetEmail: normalizedEmail,
      role: input.role,
      details: `Invited ${normalizedEmail} as ${input.role}`,
      timestamp: now.toISOString()
    };

    if (this.isDbConnected()) {
      const doc = await HouseholdModel.findById(householdId).exec();
      if (doc) {
        doc.invitations.push({
          ...invitation,
          expiresAt: new Date(invitation.expiresAt),
          createdAt: new Date(invitation.createdAt)
        });
        doc.auditLogs.push({
          ...auditEntry,
          timestamp: new Date(auditEntry.timestamp)
        });
        await doc.save();
      }
    } else {
      hh.invitations = [...(hh.invitations || []), invitation];
      hh.auditLogs = [...(hh.auditLogs || []), auditEntry];
      hh.updatedAt = now.toISOString();
      memoryHouseholds.set(householdId, hh);
    }

    // Proactively send in-app notification if target user is registered
    const targetUser = await UserRepository.findByEmail(normalizedEmail);
    if (targetUser) {
      await this.createNotification(
        targetUser._id ? targetUser._id.toString() : targetUser.id,
        'household_invite',
        `Invitation to join "${hh.name}"`,
        `${inviterName} invited you to join their shared household budget as a ${input.role}.`,
        {
          dedupKey: `invite:${id}`,
          householdId,
          invitationId: id,
          token
        }
      );
    }

    return {
      invitation,
      inviteLink: `/invite?token=${token}`
    };
  }

  static async acceptHouseholdInvitation(
    token: string,
    userId: string,
    userEmail: string,
    userName: string
  ): Promise<Household> {
    let targetHh: Household | null = null;
    let targetInv: HouseholdInvitation | null = null;

    if (this.isDbConnected()) {
      const doc = await HouseholdModel.findOne({ 'invitations.token': token }).exec();
      if (!doc) {
        throw AppError.notFound('Invalid or non-existent invitation token.');
      }
      targetHh = doc.toHousehold();
      const found = targetHh.invitations?.find((i) => i.token === token);
      if (found) targetInv = found;
    } else {
      for (const h of memoryHouseholds.values()) {
        const found = h.invitations?.find((i) => i.token === token);
        if (found) {
          targetHh = h;
          targetInv = found;
          break;
        }
      }
    }

    if (!targetHh || !targetInv) {
      throw AppError.notFound('Invalid or non-existent invitation token.');
    }

    if (targetInv.status === 'revoked') {
      throw AppError.forbidden('This invitation has been revoked by the household owner.');
    }
    if (targetInv.status === 'accepted') {
      throw AppError.badRequest('This invitation has already been accepted.');
    }
    if (new Date(targetInv.expiresAt) < new Date() || targetInv.status === 'expired') {
      throw AppError.badRequest('This invitation has expired.');
    }

    const normalizedUserEmail = userEmail.toLowerCase().trim();
    if (targetInv.inviteeEmail.toLowerCase() !== normalizedUserEmail) {
      throw AppError.forbidden(`This invitation was issued for ${targetInv.inviteeEmail}, not ${userEmail}.`);
    }

    if (targetHh.members.some((m) => m.userId === userId)) {
      throw AppError.conflict('You are already a member of this household.');
    }

    const newMember: HouseholdMember = {
      userId,
      email: normalizedUserEmail,
      displayName: userName,
      role: targetInv.role,
      joinedAt: new Date().toISOString()
    };

    const auditEntry: HouseholdAuditLog = {
      id: new mongoose.Types.ObjectId().toString(),
      action: 'invitation_accepted',
      actorUserId: userId,
      actorName: userName,
      targetUserId: userId,
      targetEmail: normalizedUserEmail,
      role: targetInv.role,
      details: `${userName} accepted invitation and joined as ${targetInv.role}`,
      timestamp: new Date().toISOString()
    };

    if (this.isDbConnected()) {
      const doc = await HouseholdModel.findById(targetHh.id).exec();
      if (doc) {
        doc.members.push({
          ...newMember,
          joinedAt: new Date(newMember.joinedAt)
        });
        const invSub = doc.invitations.find((i) => i.token === token);
        if (invSub) invSub.status = 'accepted';
        doc.auditLogs.push({
          ...auditEntry,
          timestamp: new Date(auditEntry.timestamp)
        });
        await doc.save();
        return doc.toHousehold();
      }
    }

    targetHh.members.push(newMember);
    targetInv.status = 'accepted';
    targetHh.auditLogs = [...(targetHh.auditLogs || []), auditEntry];
    targetHh.updatedAt = new Date().toISOString();
    memoryHouseholds.set(targetHh.id, targetHh);
    return targetHh;
  }

  static async revokeHouseholdInvitation(
    householdId: string,
    ownerId: string,
    invitationId: string
  ): Promise<Household> {
    const hh = await this.validateHouseholdAccess(householdId, ownerId, 'owner');
    const ownerMember = hh.members.find((m) => m.userId === ownerId);

    if (this.isDbConnected()) {
      const doc = await HouseholdModel.findById(householdId).exec();
      if (!doc) throw AppError.notFound('Household not found.');
      const inv = doc.invitations.find((i) => i.id === invitationId);
      if (!inv) throw AppError.notFound('Invitation not found.');
      inv.status = 'revoked';
      doc.auditLogs.push({
        id: new mongoose.Types.ObjectId().toString(),
        action: 'invitation_revoked',
        actorUserId: ownerId,
        actorName: ownerMember?.displayName || 'Owner',
        targetEmail: inv.inviteeEmail,
        details: `Revoked invitation for ${inv.inviteeEmail}`,
        timestamp: new Date()
      });
      await doc.save();
      return doc.toHousehold();
    }

    const inv = hh.invitations?.find((i) => i.id === invitationId);
    if (!inv) throw AppError.notFound('Invitation not found.');
    inv.status = 'revoked';
    hh.auditLogs = [
      ...(hh.auditLogs || []),
      {
        id: new mongoose.Types.ObjectId().toString(),
        action: 'invitation_revoked',
        actorUserId: ownerId,
        actorName: ownerMember?.displayName || 'Owner',
        targetEmail: inv.inviteeEmail,
        details: `Revoked invitation for ${inv.inviteeEmail}`,
        timestamp: new Date().toISOString()
      }
    ];
    hh.updatedAt = new Date().toISOString();
    memoryHouseholds.set(householdId, hh);
    return hh;
  }

  static async removeHouseholdMember(
    householdId: string,
    ownerId: string,
    targetUserId: string
  ): Promise<Household> {
    const hh = await this.validateHouseholdAccess(householdId, ownerId, 'owner');
    if (targetUserId === ownerId) {
      throw AppError.badRequest('Cannot remove the household owner. Delete the household instead.');
    }

    const ownerMember = hh.members.find((m) => m.userId === ownerId);
    const targetMember = hh.members.find((m) => m.userId === targetUserId);
    if (!targetMember) throw AppError.notFound('Member not found in this household.');

    const auditEntry: HouseholdAuditLog = {
      id: new mongoose.Types.ObjectId().toString(),
      action: 'member_removed',
      actorUserId: ownerId,
      actorName: ownerMember?.displayName || 'Owner',
      targetUserId,
      targetEmail: targetMember.email,
      details: `Removed ${targetMember.displayName} from household`,
      timestamp: new Date().toISOString()
    };

    if (this.isDbConnected()) {
      const doc = await HouseholdModel.findById(householdId).exec();
      if (!doc) throw AppError.notFound('Household not found.');
      doc.members = doc.members.filter((m) => m.userId !== targetUserId);
      doc.auditLogs.push({
        ...auditEntry,
        timestamp: new Date(auditEntry.timestamp)
      });
      await doc.save();
      return doc.toHousehold();
    }

    hh.members = hh.members.filter((m) => m.userId !== targetUserId);
    hh.auditLogs = [...(hh.auditLogs || []), auditEntry];
    hh.updatedAt = new Date().toISOString();
    memoryHouseholds.set(householdId, hh);
    return hh;
  }

  static async updateHouseholdMemberRole(
    householdId: string,
    ownerId: string,
    targetUserId: string,
    newRole: 'editor' | 'viewer'
  ): Promise<Household> {
    const hh = await this.validateHouseholdAccess(householdId, ownerId, 'owner');
    if (targetUserId === ownerId) {
      throw AppError.badRequest('Cannot modify the role of the household owner.');
    }

    const ownerMember = hh.members.find((m) => m.userId === ownerId);
    const targetMember = hh.members.find((m) => m.userId === targetUserId);
    if (!targetMember) throw AppError.notFound('Member not found in this household.');

    const auditEntry: HouseholdAuditLog = {
      id: new mongoose.Types.ObjectId().toString(),
      action: 'role_updated',
      actorUserId: ownerId,
      actorName: ownerMember?.displayName || 'Owner',
      targetUserId,
      targetEmail: targetMember.email,
      role: newRole,
      details: `Updated role of ${targetMember.displayName} to ${newRole}`,
      timestamp: new Date().toISOString()
    };

    if (this.isDbConnected()) {
      const doc = await HouseholdModel.findById(householdId).exec();
      if (!doc) throw AppError.notFound('Household not found.');
      const mem = doc.members.find((m) => m.userId === targetUserId);
      if (mem) mem.role = newRole;
      doc.auditLogs.push({
        ...auditEntry,
        timestamp: new Date(auditEntry.timestamp)
      });
      await doc.save();
      return doc.toHousehold();
    }

    targetMember.role = newRole;
    hh.auditLogs = [...(hh.auditLogs || []), auditEntry];
    hh.updatedAt = new Date().toISOString();
    memoryHouseholds.set(householdId, hh);
    return hh;
  }

  static async deleteHousehold(householdId: string, ownerId: string): Promise<boolean> {
    await this.validateHouseholdAccess(householdId, ownerId, 'owner');

    if (this.isDbConnected()) {
      const res = await HouseholdModel.deleteOne({ _id: householdId, ownerId }).exec();
      return (res.deletedCount || 0) > 0;
    }

    return memoryHouseholds.delete(householdId);
  }

  // ==========================================
  // Notifications
  // ==========================================
  static async listNotifications(userId: string): Promise<Notification[]> {
    if (this.isDbConnected()) {
      const docs = await NotificationModel.find({ userId }).sort({ createdAt: -1 }).limit(50).exec();
      return docs.map((d) => d.toNotification());
    }

    const list: Notification[] = [];
    for (const n of memoryNotifications.values()) {
      if (n.userId === userId) list.push(n);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static async markNotificationRead(id: string, userId: string): Promise<boolean> {
    if (this.isDbConnected()) {
      const res = await NotificationModel.updateOne({ _id: id, userId }, { isRead: true }).exec();
      return (res.modifiedCount || 0) > 0;
    }

    const n = memoryNotifications.get(id);
    if (!n || n.userId !== userId) return false;
    n.isRead = true;
    memoryNotifications.set(id, n);
    return true;
  }

  static async markAllNotificationsRead(userId: string): Promise<number> {
    if (this.isDbConnected()) {
      const res = await NotificationModel.updateMany({ userId, isRead: false }, { isRead: true }).exec();
      return res.modifiedCount || 0;
    }

    let count = 0;
    for (const n of memoryNotifications.values()) {
      if (n.userId === userId && !n.isRead) {
        n.isRead = true;
        count++;
      }
    }
    return count;
  }

  static async deleteNotification(id: string, userId: string): Promise<boolean> {
    if (this.isDbConnected()) {
      const res = await NotificationModel.deleteOne({ _id: id, userId }).exec();
      return (res.deletedCount || 0) > 0;
    }

    const n = memoryNotifications.get(id);
    if (!n || n.userId !== userId) return false;
    return memoryNotifications.delete(id);
  }

  static async hasNotificationWithDedupKey(userId: string, dedupKey: string): Promise<boolean> {
    if (this.isDbConnected()) {
      const existing = await NotificationModel.findOne({
        userId,
        'metadata.dedupKey': dedupKey
      }).exec();
      return !!existing;
    }

    for (const n of memoryNotifications.values()) {
      if (n.userId === userId && n.metadata?.dedupKey === dedupKey) {
        return true;
      }
    }
    return false;
  }

  static async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<Notification> {
    const dedupKey = metadata?.dedupKey as string | undefined;

    // Idempotency: if dedupKey provided, check if a notification already exists with this key
    if (dedupKey) {
      if (this.isDbConnected()) {
        const existing = await NotificationModel.findOne({
          userId,
          'metadata.dedupKey': dedupKey
        }).exec();
        if (existing) {
          return existing.toNotification();
        }
      } else {
        for (const n of memoryNotifications.values()) {
          if (n.userId === userId && n.metadata?.dedupKey === dedupKey) {
            return n;
          }
        }
      }
    }

    if (this.isDbConnected()) {
      const doc = await NotificationModel.create({
        userId,
        type,
        title,
        message,
        isRead: false,
        metadata
      });
      return doc.toNotification();
    }

    const id = new mongoose.Types.ObjectId().toString();
    const notif: Notification = {
      id,
      userId,
      type,
      title,
      message,
      isRead: false,
      metadata,
      createdAt: new Date().toISOString()
    };
    memoryNotifications.set(id, notif);
    return notif;
  }

  static async runPeriodicChecks(
    userId: string
  ): Promise<{ createdCount: number; notifications: Notification[] }> {
    const created: Notification[] = [];
    const user = await UserRepository.findById(userId);
    const prefs = user?.preferences || {};

    if (prefs.inAppNotifications === false) {
      return { createdCount: 0, notifications: [] };
    }

    // 1. Check budget alerts if enabled
    if (prefs.budgetAlertsEnabled !== false) {
      const now = new Date();
      const budgets = await this.listBudgets(userId, now.getUTCMonth() + 1, now.getUTCFullYear());
      const categories = await this.listCategories(userId);
      const catMap = new Map(categories.map((c) => [c.id, c.name]));
      for (const b of budgets) {
        const pct = b.consumedPercent || 0;
        const thresholds = [100, 90, 75];
        for (const t of thresholds) {
          if (pct >= t) {
            const dedupKey = `budget-alert:${b.id}-${t}-${b.periodMonth}-${b.periodYear}`;
            if (await this.hasNotificationWithDedupKey(userId, dedupKey)) {
              break;
            }

            const catName = b.categoryId
              ? catMap.get(b.categoryId) || 'Category'
              : 'Overall Monthly';
            const title = t >= 100 ? `Budget Exceeded: ${catName}` : `Budget Warning: ${catName} at ${pct}%`;
            const msg =
              t >= 100
                ? `You have consumed ${pct}% of your ${catName} budget for ${b.periodMonth}/${b.periodYear}. Please review expenses.`
                : `You have reached ${pct}% of your ${catName} spending limit (${t}% threshold reached).`;

            const notif = await this.createNotification(userId, 'budget_alert', title, msg, {
              dedupKey,
              budgetId: b.id,
              threshold: t,
              periodMonth: b.periodMonth,
              periodYear: b.periodYear
            });
            created.push(notif);
            break;
          }
        }
      }
    }

    // 2. Check recurring schedules if enabled
    if (prefs.recurringRemindersEnabled !== false) {
      const recurringList = await this.listRecurring(userId);
      const now = new Date();
      const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      for (const rec of recurringList) {
        if (!rec.isActive) continue;
        const nextRun = new Date(rec.nextRunDateUtc);
        if (nextRun <= threeDaysLater) {
          const dateStr = rec.nextRunDateUtc.slice(0, 10);
          const dedupKey = `recurring-reminder:${rec.id}-${dateStr}`;
          if (await this.hasNotificationWithDedupKey(userId, dedupKey)) {
            continue;
          }

          const isOverdue = nextRun < now;
          const title = isOverdue
            ? `Recurring Bill Overdue: ${rec.description}`
            : `Upcoming Bill: ${rec.description}`;
          const msg = `Scheduled ${rec.type} of ${formatCurrency(fromMinorUnits(rec.amountMinorUnits, rec.currency), rec.currency)} is due on ${dateStr}.`;

          const notif = await this.createNotification(userId, 'recurring_due', title, msg, {
            dedupKey,
            recurringId: rec.id,
            dueDate: dateStr
          });
          created.push(notif);
        }
      }
    }

    // 3. Check savings goals if enabled
    if (prefs.goalMilestonesEnabled !== false) {
      const goals = await this.listGoals(userId);
      for (const g of goals) {
        const progress = g.progressPercent || 0;
        if (progress >= 100) {
          const dedupKey = `goal-milestone:${g.id}-100`;
          if (!(await this.hasNotificationWithDedupKey(userId, dedupKey))) {
            const notif = await this.createNotification(
              userId,
              'goal_milestone',
              `Goal Reached: ${g.name}! 🎉`,
              `Congratulations! You have reached 100% of your target amount for ${g.name}.`,
              { dedupKey, goalId: g.id, milestone: 100 }
            );
            created.push(notif);
          }
        } else if (progress >= 50) {
          const dedupKey = `goal-milestone:${g.id}-50`;
          if (!(await this.hasNotificationWithDedupKey(userId, dedupKey))) {
            const notif = await this.createNotification(
              userId,
              'goal_milestone',
              `Halfway Milestone: ${g.name}`,
              `You have achieved 50% progress towards your savings goal "${g.name}". Keep it up!`,
              { dedupKey, goalId: g.id, milestone: 50 }
            );
            created.push(notif);
          }
        }
      }
    }

    return { createdCount: created.length, notifications: created };
  }

  // ==========================================
  // User Data Export & Account Deletion Cascade
  // ==========================================
  static async exportUserData(userId: string): Promise<UserDataExport> {
    const userDoc = await UserRepository.findById(userId);
    const userProfile = userDoc ? (typeof userDoc.toProfile === 'function' ? userDoc.toProfile() : userDoc) : null;

    let userBudgets: Budget[] = [];
    if (this.isDbConnected()) {
      const docs = await BudgetModel.find({ userId }).exec();
      userBudgets = docs.map((d) => d.toBudget(0));
    } else {
      for (const b of memoryBudgets.values()) {
        if (b.userId === userId) userBudgets.push(b);
      }
    }

    const [accounts, txResult, goals, recurringSchedules, notifications, households] = await Promise.all([
      this.listAccounts(userId),
      this.listTransactions(userId, { limit: 10000 }),
      this.listGoals(userId),
      this.listRecurring(userId),
      this.listNotifications(userId),
      this.listHouseholdsForUser(userId)
    ]);

    return {
      exportedAt: new Date().toISOString(),
      formatVersion: '1.0',
      user: userProfile,
      accounts,
      transactions: txResult.transactions,
      budgets: userBudgets,
      goals,
      recurringSchedules,
      notifications,
      households
    };
  }

  static async deleteUserDataCascade(userId: string): Promise<{ deleted: boolean; message: string }> {
    // 1. Check if user is owner of any shared household with active other members
    const households = await this.listHouseholdsForUser(userId);
    for (const hh of households) {
      if (hh.ownerId === userId && hh.members.length > 1) {
        throw AppError.badRequest(
          `You are the owner of the shared space "${hh.name}" with active members. Please transfer ownership or delete the shared space before deleting your account.`
        );
      }
    }

    // 2. Cascade delete personal records from DB or memory
    if (this.isDbConnected()) {
      await Promise.all([
        Account.deleteMany({ userId }).exec(),
        TransactionModel.deleteMany({ userId }).exec(),
        BudgetModel.deleteMany({ userId }).exec(),
        Goal.deleteMany({ userId }).exec(),
        Recurring.deleteMany({ userId }).exec(),
        NotificationModel.deleteMany({ userId }).exec(),
        AiConversationModel.deleteMany({ userId }).exec(),
        HouseholdModel.deleteMany({ ownerId: userId }).exec(),
        HouseholdModel.updateMany({ 'members.userId': userId }, { $pull: { members: { userId } } }).exec()
      ]);
    } else {
      // In-memory cleanup
      for (const [id, acc] of memoryAccounts.entries()) {
        if (acc.userId === userId) memoryAccounts.delete(id);
      }
      for (const [id, tx] of memoryTransactions.entries()) {
        if (tx.userId === userId) memoryTransactions.delete(id);
      }
      for (const [id, b] of memoryBudgets.entries()) {
        if (b.userId === userId) memoryBudgets.delete(id);
      }
      for (const [id, g] of memoryGoals.entries()) {
        if (g.userId === userId) memoryGoals.delete(id);
      }
      for (const [id, r] of memoryRecurring.entries()) {
        if (r.userId === userId) memoryRecurring.delete(id);
      }
      for (const [id, n] of memoryNotifications.entries()) {
        if (n.userId === userId) memoryNotifications.delete(id);
      }
      for (const [id, c] of memoryAi.entries()) {
        if (c.userId === userId) memoryAi.delete(id);
      }
      for (const [id, hh] of memoryHouseholds.entries()) {
        if (hh.ownerId === userId) {
          memoryHouseholds.delete(id);
        } else {
          hh.members = hh.members.filter((m) => m.userId !== userId);
        }
      }
    }

    // 3. Delete user account record
    await UserRepository.deleteUser(userId);

    return {
      deleted: true,
      message: 'Account and associated personal records permanently deleted.'
    };
  }

  // ==========================================
  // AI Conversations
  // ==========================================
  static async listAiConversations(userId: string): Promise<AiConversation[]> {
    if (this.isDbConnected()) {
      const docs = await AiConversationModel.find({ userId, isArchived: false })
        .sort({ updatedAt: -1 })
        .exec();
      return docs.map((d) => d.toAiConversation());
    }

    const list: AiConversation[] = [];
    for (const conv of memoryAi.values()) {
      if (conv.userId === userId && !conv.isArchived) {
        list.push(conv);
      }
    }
    return list;
  }

  static async createAiConversation(
    userId: string,
    input: CreateAiConversationInput
  ): Promise<AiConversation> {
    if (this.isDbConnected()) {
      const doc = await AiConversationModel.create({
        userId,
        title: input.title,
        retentionDays: input.retentionDays,
        messages: []
      });
      return doc.toAiConversation();
    }

    const id = new mongoose.Types.ObjectId().toString();
    const now = new Date().toISOString();
    const conv: AiConversation = {
      id,
      userId,
      title: input.title,
      messages: [],
      retentionDays: input.retentionDays,
      isArchived: false,
      createdAt: now,
      updatedAt: now
    };
    memoryAi.set(id, conv);
    return conv;
  }

  static async addAiMessage(
    conversationId: string,
    userId: string,
    message: { role: 'user' | 'model' | 'system'; content: string }
  ): Promise<AiConversation> {
    const msgId = new mongoose.Types.ObjectId().toString();
    const now = new Date().toISOString();
    const newMsg = {
      id: msgId,
      role: message.role,
      content: message.content,
      timestamp: now
    };

    if (this.isDbConnected()) {
      const doc = await AiConversationModel.findOne({ _id: conversationId, userId }).exec();
      if (!doc) throw AppError.notFound('Conversation not found.');
      doc.messages.push({
        id: msgId,
        role: message.role,
        content: message.content,
        timestamp: new Date(now)
      });
      await doc.save();
      return doc.toAiConversation();
    }

    const conv = memoryAi.get(conversationId);
    if (!conv || conv.userId !== userId) throw AppError.notFound('Conversation not found.');
    conv.messages.push(newMsg);
    conv.updatedAt = now;
    memoryAi.set(conversationId, conv);
    return conv;
  }

  static async getAiConversationById(id: string, userId: string): Promise<AiConversation | null> {
    if (this.isDbConnected()) {
      const doc = await AiConversationModel.findOne({ _id: id, userId, isArchived: false }).exec();
      return doc ? doc.toAiConversation() : null;
    }
    const conv = memoryAi.get(id);
    if (!conv || conv.userId !== userId || conv.isArchived) return null;
    return conv;
  }

  static async deleteAiConversation(id: string, userId: string): Promise<boolean> {
    if (this.isDbConnected()) {
      const res = await AiConversationModel.updateOne({ _id: id, userId }, { isArchived: true }).exec();
      return (res.modifiedCount || 0) > 0;
    }
    const conv = memoryAi.get(id);
    if (!conv || conv.userId !== userId) return false;
    conv.isArchived = true;
    memoryAi.set(id, conv);
    return true;
  }

  static async getAiInsightSummary(
    userId: string,
    month?: number,
    year?: number
  ): Promise<AiInsightSummary> {
    const now = new Date();
    const targetMonth = month || now.getUTCMonth() + 1;
    const targetYear = year || now.getUTCFullYear();

    const startOfMonth = new Date(Date.UTC(targetYear, targetMonth - 1, 1)).toISOString();
    const endOfMonth = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59, 999)).toISOString();

    const [summary, breakdown, budgetVsActual] = await Promise.all([
      this.getAnalyticsSummary(userId, { startDateUtc: startOfMonth, endDateUtc: endOfMonth }),
      this.getCategoryBreakdown(userId, { month: targetMonth, year: targetYear }),
      this.getBudgetVsActual(userId, targetMonth, targetYear)
    ]);

    const overBudgetCategories = budgetVsActual
      .filter((b) => b.isOverBudget || b.consumedPercent >= 100)
      .map((b) => ({
        categoryName: b.categoryName,
        spentMinorUnits: b.spentAmountMinorUnits,
        limitMinorUnits: b.limitAmountMinorUnits,
        percent: b.consumedPercent
      }));

    const topExpenseCategories = breakdown
      .slice(0, 5)
      .map((c) => ({
        categoryName: c.categoryName,
        amountMinorUnits: c.amountMinorUnits,
        percentage: c.percentage
      }));

    const largestExpenses = (summary.largestExpenses || []).map((e) => ({
      description: e.description,
      amountMinorUnits: e.amountMinorUnits,
      dateUtc: e.dateUtc,
      categoryName: e.categoryName
    }));

    const ruleBasedSuggestions: string[] = [];

    if (overBudgetCategories.length > 0 && overBudgetCategories[0]) {
      ruleBasedSuggestions.push(
        `You have ${overBudgetCategories.length} categories over budget (including ${overBudgetCategories[0].categoryName}). Pause non-essential purchases in these envelopes.`
      );
    }

    const topCat = topExpenseCategories[0];
    if (topCat && topCat.percentage > 35) {
      ruleBasedSuggestions.push(
        `${topCat.categoryName} represents ${topCat.percentage}% of total outflows. Consider reviewing routine purchases in this category.`
      );
    }

    if (summary.savingsRatePct < 20 && summary.monthlyIncomeMinorUnits > 0) {
      ruleBasedSuggestions.push(
        `Your current savings rate is ${summary.savingsRatePct}%. Aim for the 50/30/20 guideline by reserving at least 20% toward liquid emergency funds.`
      );
    } else if (summary.savingsRatePct >= 20) {
      ruleBasedSuggestions.push(
        `Strong savings pace! You preserved ${summary.savingsRatePct}% of verified income. Consider allocating surplus to active savings goals.`
      );
    }

    return {
      periodMonth: targetMonth,
      periodYear: targetYear,
      totalIncomeMinorUnits: summary.monthlyIncomeMinorUnits,
      totalExpenseMinorUnits: summary.monthlyExpenseMinorUnits,
      netSavingsMinorUnits: summary.netSavingsMinorUnits,
      savingsRatePct: summary.savingsRatePct,
      overBudgetCategories,
      topExpenseCategories,
      largestExpenses,
      spendingComparisonVsPrevMonth: summary.previousPeriod
        ? {
            expenseDeltaPct: summary.previousPeriod.expenseDeltaPct,
            incomeDeltaPct:
              summary.previousPeriod.incomeMinorUnits > 0
                ? Math.round(
                    ((summary.monthlyIncomeMinorUnits - summary.previousPeriod.incomeMinorUnits) /
                      summary.previousPeriod.incomeMinorUnits) *
                      100
                  )
                : 0
          }
        : undefined,
      ruleBasedSuggestions
    };
  }

  // ==========================================
  // Financial Analytics & Insights
  // ==========================================
  static async getAnalyticsSummary(
    userId: string,
    query: {
      startDateUtc?: string;
      endDateUtc?: string;
      accountId?: string;
      categoryId?: string;
    } = {}
  ): Promise<AnalyticsSummaryData> {
    const allAccounts = await this.listAccounts(userId);
    const targetAccounts = query.accountId
      ? allAccounts.filter((a) => a.id === query.accountId)
      : allAccounts;

    const totalBalanceMinorUnits = targetAccounts.reduce(
      (acc, a) => acc + a.balanceMinorUnits,
      0
    );

    // Current period bounds
    let startDate: Date;
    let endDate: Date;

    if (query.startDateUtc && query.endDateUtc) {
      startDate = new Date(query.startDateUtc);
      endDate = new Date(query.endDateUtc);
    } else {
      const now = new Date();
      startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    }

    const { transactions: currentTxns } = await this.listTransactions(userId, {
      startDateUtc: startDate.toISOString(),
      endDateUtc: endDate.toISOString(),
      sourceAccountId: query.accountId,
      categoryId: query.categoryId,
      limit: 2000
    });

    const eligibleCurrent = currentTxns.filter((t) => t.status !== 'cancelled');

    let monthlyIncomeMinorUnits = 0;
    let monthlyExpenseMinorUnits = 0;

    for (const t of eligibleCurrent) {
      if (t.type === 'income') monthlyIncomeMinorUnits += t.amountMinorUnits;
      if (t.type === 'expense') monthlyExpenseMinorUnits += t.amountMinorUnits;
    }

    const netSavingsMinorUnits = monthlyIncomeMinorUnits - monthlyExpenseMinorUnits;
    const savingsRatePct =
      monthlyIncomeMinorUnits > 0
        ? Math.round(Math.max(0, (netSavingsMinorUnits / monthlyIncomeMinorUnits) * 100))
        : 0;

    // Previous period comparison
    const periodDurationMs = Math.max(1, endDate.getTime() - startDate.getTime());
    const prevEndDate = new Date(startDate.getTime() - 1);
    const prevStartDate = new Date(prevEndDate.getTime() - periodDurationMs);

    const { transactions: prevTxns } = await this.listTransactions(userId, {
      startDateUtc: prevStartDate.toISOString(),
      endDateUtc: prevEndDate.toISOString(),
      sourceAccountId: query.accountId,
      categoryId: query.categoryId,
      limit: 2000
    });

    const eligiblePrev = prevTxns.filter((t) => t.status !== 'cancelled');
    let prevIncome = 0;
    let prevExpense = 0;

    for (const t of eligiblePrev) {
      if (t.type === 'income') prevIncome += t.amountMinorUnits;
      if (t.type === 'expense') prevExpense += t.amountMinorUnits;
    }

    const prevNet = prevIncome - prevExpense;
    const expenseDeltaMinorUnits = monthlyExpenseMinorUnits - prevExpense;
    const expenseDeltaPct =
      prevExpense > 0
        ? Math.round(((monthlyExpenseMinorUnits - prevExpense) / prevExpense) * 100)
        : 0;

    const previousPeriod: AnalyticsPreviousPeriodComparison = {
      incomeMinorUnits: prevIncome,
      expenseMinorUnits: prevExpense,
      netSavingsMinorUnits: prevNet,
      expenseDeltaPct,
      expenseDeltaMinorUnits
    };

    // Category mapping for readable names
    const categories = await this.listCategories(userId);
    const catMap = new Map(categories.map((c) => [c.id, c]));

    // Largest expenses (Top 5)
    const largestExpenses: LargestExpenseItem[] = eligibleCurrent
      .filter((t) => t.type === 'expense')
      .sort((a, b) => b.amountMinorUnits - a.amountMinorUnits)
      .slice(0, 5)
      .map((t) => ({
        id: t.id,
        description: t.description,
        merchantName: t.merchantName,
        categoryName: t.categoryId ? (catMap.get(t.categoryId)?.name || 'Category') : 'Uncategorized',
        dateUtc: t.dateUtc,
        amountMinorUnits: t.amountMinorUnits,
        currency: t.currency
      }));

    // Frequently used categories (Top 5)
    const categoryStats = new Map<string, { count: number; total: number }>();
    for (const t of eligibleCurrent) {
      if (t.type === 'expense') {
        const catId = t.categoryId || 'uncategorized';
        const existing = categoryStats.get(catId) || { count: 0, total: 0 };
        categoryStats.set(catId, {
          count: existing.count + 1,
          total: existing.total + t.amountMinorUnits
        });
      }
    }

    const frequentlyUsedCategories: FrequentCategoryItem[] = Array.from(categoryStats.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([catId, stat]) => {
        const cat = catMap.get(catId);
        return {
          categoryId: catId,
          categoryName: cat ? cat.name : 'Uncategorized',
          color: cat ? cat.color : '#94A3B8',
          count: stat.count,
          totalAmountMinorUnits: stat.total
        };
      });

    return {
      totalBalanceMinorUnits,
      monthlyIncomeMinorUnits,
      monthlyExpenseMinorUnits,
      netSavingsMinorUnits,
      savingsRatePct,
      previousPeriod,
      largestExpenses,
      frequentlyUsedCategories,
      accountCount: targetAccounts.length,
      transactionCount: eligibleCurrent.length
    };
  }

  static async getAnalyticsTrends(
    userId: string,
    query: {
      interval?: 'daily' | 'weekly' | 'monthly';
      startDateUtc?: string;
      endDateUtc?: string;
      accountId?: string;
      categoryId?: string;
    } = {}
  ): Promise<AnalyticsTrendPoint[]> {
    const interval = query.interval || 'daily';
    const now = new Date();

    let startDate: Date;
    let endDate: Date;

    if (query.startDateUtc && query.endDateUtc) {
      startDate = new Date(query.startDateUtc);
      endDate = new Date(query.endDateUtc);
    } else if (interval === 'monthly') {
      startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
      endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    } else {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      endDate = now;
    }

    const { transactions } = await this.listTransactions(userId, {
      startDateUtc: startDate.toISOString(),
      endDateUtc: endDate.toISOString(),
      sourceAccountId: query.accountId,
      categoryId: query.categoryId,
      limit: 2000
    });

    const eligible = transactions.filter((t) => t.status !== 'cancelled');
    const pointMap = new Map<string, { income: number; expense: number }>();

    for (const t of eligible) {
      const tDate = new Date(t.dateUtc);
      let dateKey: string;

      if (interval === 'monthly') {
        dateKey = t.dateUtc.slice(0, 7); // YYYY-MM
      } else if (interval === 'weekly') {
        // Find Monday of the week
        const day = tDate.getUTCDay();
        const diff = tDate.getUTCDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(tDate);
        monday.setUTCDate(diff);
        dateKey = monday.toISOString().slice(0, 10);
      } else {
        dateKey = t.dateUtc.slice(0, 10); // YYYY-MM-DD
      }

      const existing = pointMap.get(dateKey) || { income: 0, expense: 0 };
      if (t.type === 'income') existing.income += t.amountMinorUnits;
      if (t.type === 'expense') existing.expense += t.amountMinorUnits;
      pointMap.set(dateKey, existing);
    }

    return Array.from(pointMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dateKey, val]) => ({
        dateKey,
        incomeMinorUnits: val.income,
        expenseMinorUnits: val.expense,
        netMinorUnits: val.income - val.expense
      }));
  }

  static async getCategoryBreakdown(
    userId: string,
    query: {
      month?: number;
      year?: number;
      startDateUtc?: string;
      endDateUtc?: string;
      accountId?: string;
    } = {}
  ): Promise<CategoryBreakdownItem[]> {
    let startDate: Date;
    let endDate: Date;

    if (query.startDateUtc && query.endDateUtc) {
      startDate = new Date(query.startDateUtc);
      endDate = new Date(query.endDateUtc);
    } else {
      const now = new Date();
      const month = query.month || now.getUTCMonth() + 1;
      const year = query.year || now.getUTCFullYear();
      startDate = new Date(Date.UTC(year, month - 1, 1));
      endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    }

    const [categories, { transactions }] = await Promise.all([
      this.listCategories(userId),
      this.listTransactions(userId, {
        type: 'expense',
        startDateUtc: startDate.toISOString(),
        endDateUtc: endDate.toISOString(),
        sourceAccountId: query.accountId,
        limit: 2000
      })
    ]);

    const catMap = new Map(categories.map((c) => [c.id, c]));
    const totals = new Map<string, { amount: number; count: number }>();
    let grandTotalExpense = 0;

    for (const t of transactions) {
      if (t.status === 'cancelled') continue;
      const catId = t.categoryId || 'uncategorized';
      const current = totals.get(catId) || { amount: 0, count: 0 };
      totals.set(catId, {
        amount: current.amount + t.amountMinorUnits,
        count: current.count + 1
      });
      grandTotalExpense += t.amountMinorUnits;
    }

    return Array.from(totals.entries())
      .sort((a, b) => b[1].amount - a[1].amount)
      .map(([catId, stat]) => {
        const cat = catMap.get(catId);
        const percentage =
          grandTotalExpense > 0
            ? Number(((stat.amount / grandTotalExpense) * 100).toFixed(1))
            : 0;

        return {
          categoryId: catId,
          categoryName: cat ? cat.name : 'Uncategorized',
          color: cat ? cat.color : '#94A3B8',
          amountMinorUnits: stat.amount,
          percentage,
          transactionCount: stat.count
        };
      });
  }

  static async getBudgetVsActual(
    userId: string,
    periodMonth: number,
    periodYear: number
  ): Promise<BudgetVsActualItem[]> {
    const budgets = await this.listBudgets(userId, periodMonth, periodYear);
    const categories = await this.listCategories(userId);
    const catMap = new Map(categories.map((c) => [c.id, c.name]));

    return budgets.map((b) => {
      const catName = b.categoryId ? (catMap.get(b.categoryId) || 'Category') : 'Overall Monthly Limit';
      return {
        budgetId: b.id,
        categoryId: b.categoryId,
        categoryName: catName,
        limitAmountMinorUnits: b.limitAmountMinorUnits,
        spentAmountMinorUnits: b.spentAmountMinorUnits || 0,
        remainingAmountMinorUnits: b.remainingAmountMinorUnits || 0,
        consumedPercent: b.consumedPercent || 0,
        isOverBudget: (b.spentAmountMinorUnits || 0) > b.limitAmountMinorUnits
      };
    });
  }

  // Clear memory stores for test isolation
  static clearInMemory(): void {
    memoryAccounts.clear();
    memoryCategories.clear();
    for (const cat of DEFAULT_SYSTEM_CATEGORIES) {
      memoryCategories.set(cat.id, {
        ...cat,
        isSystem: true,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    memoryTransactions.clear();
    memoryBudgets.clear();
    memoryGoals.clear();
    memoryRecurring.clear();
    memoryHouseholds.clear();
    memoryNotifications.clear();
    memoryAi.clear();
  }
}
