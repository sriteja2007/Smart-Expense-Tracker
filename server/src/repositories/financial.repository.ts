import mongoose from 'mongoose';
import { Account } from '../models/account.model.js';
import { Category } from '../models/category.model.js';
import { TransactionModel } from '../models/transaction.model.js';
import { BudgetModel } from '../models/budget.model.js';
import { Goal } from '../models/goal.model.js';
import { Recurring } from '../models/recurring.model.js';
import { HouseholdModel } from '../models/household.model.js';
import { NotificationModel } from '../models/notification.model.js';
import { AiConversationModel } from '../models/ai-conversation.model.js';
import { AppError } from '@lumaspend/shared';
import type {
  FinancialAccount,
  FinancialCategory,
  Transaction,
  Budget,
  SavingsGoal,
  RecurringSchedule,
  Household,
  HouseholdRole,
  Notification,
  AiConversation,
  TransactionQueryInput,
  CreateTransactionInput,
  CreateAccountInput,
  CreateBudgetInput,
  CreateGoalInput,
  CreateRecurringInput,
  CreateHouseholdInput,
  InviteMemberInput,
  CreateAiConversationInput
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
      const res = await Category.deleteOne({ _id: id, userId, isSystem: false }).exec();
      return (res.deletedCount || 0) > 0;
    }

    const cat = memoryCategories.get(id);
    if (!cat || cat.isSystem || cat.userId !== userId) return false;
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

    if (this.isDbConnected()) {
      const filter: any = { userId };
      if (query.type) filter.type = query.type;
      if (query.sourceAccountId) filter.sourceAccountId = query.sourceAccountId;
      if (query.categoryId) filter.categoryId = query.categoryId;
      if (query.householdId) filter.householdId = query.householdId;
      if (query.startDateUtc || query.endDateUtc) {
        filter.dateUtc = {};
        if (query.startDateUtc) filter.dateUtc.$gte = new Date(query.startDateUtc);
        if (query.endDateUtc) filter.dateUtc.$lte = new Date(query.endDateUtc);
      }
      if (query.search) {
        filter.$or = [
          { description: { $regex: query.search, $options: 'i' } },
          { merchantName: { $regex: query.search, $options: 'i' } }
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
      if (t.userId !== userId) continue;
      if (query.type && t.type !== query.type) continue;
      if (query.sourceAccountId && t.sourceAccountId !== query.sourceAccountId) continue;
      if (query.categoryId && t.categoryId !== query.categoryId) continue;
      if (query.householdId && t.householdId !== query.householdId) continue;
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
    if (this.isDbConnected()) {
      const existing = await BudgetModel.findOne({
        userId,
        categoryId: input.categoryId,
        periodMonth: input.periodMonth,
        periodYear: input.periodYear
      }).exec();

      if (existing) {
        throw AppError.conflict('A budget for this category and period already exists.');
      }

      const doc = await BudgetModel.create({
        userId,
        householdId: input.householdId,
        categoryId: input.categoryId,
        periodMonth: input.periodMonth,
        periodYear: input.periodYear,
        limitAmountMinorUnits: input.limitAmountMinorUnits,
        currency: input.currency,
        alertThresholdPct: input.alertThresholdPct
      });
      return doc.toBudget(0);
    }

    for (const b of memoryBudgets.values()) {
      if (
        b.userId === userId &&
        b.categoryId === input.categoryId &&
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
      categoryId: input.categoryId,
      periodMonth: input.periodMonth,
      periodYear: input.periodYear,
      limitAmountMinorUnits: input.limitAmountMinorUnits,
      currency: input.currency,
      alertThresholdPct: input.alertThresholdPct,
      spentAmountMinorUnits: 0,
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

    // 2. Calculate actual spending per category for this month
    const startOfMonth = new Date(Date.UTC(periodYear, periodMonth - 1, 1));
    const endOfMonth = new Date(Date.UTC(periodYear, periodMonth, 0, 23, 59, 59, 999));

    const spendingByCategory = new Map<string, number>();

    if (this.isDbConnected()) {
      const txns = await TransactionModel.find({
        userId,
        type: 'expense',
        dateUtc: { $gte: startOfMonth, $lte: endOfMonth }
      }).exec();

      for (const t of txns) {
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
          t.categoryId &&
          new Date(t.dateUtc) >= startOfMonth &&
          new Date(t.dateUtc) <= endOfMonth
        ) {
          const current = spendingByCategory.get(t.categoryId) || 0;
          spendingByCategory.set(t.categoryId, current + t.amountMinorUnits);
        }
      }
    }

    return budgets.map((b) => ({
      ...b,
      spentAmountMinorUnits: spendingByCategory.get(b.categoryId) || 0
    }));
  }

  static async getBudgetById(id: string, userId: string): Promise<Budget | null> {
    if (this.isDbConnected()) {
      const doc = await BudgetModel.findById(id).exec();
      if (!doc || doc.userId !== userId) return null;
      return doc.toBudget(0);
    }

    const b = memoryBudgets.get(id);
    if (!b || b.userId !== userId) return null;
    return b;
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
      return doc.toBudget(0);
    }

    const b = memoryBudgets.get(id);
    if (!b || b.userId !== userId) return null;
    const updated: Budget = {
      ...b,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    memoryBudgets.set(id, updated);
    return updated;
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

  // ==========================================
  // Savings Goals
  // ==========================================
  static async createGoal(userId: string, input: CreateGoalInput): Promise<SavingsGoal> {
    if (this.isDbConnected()) {
      const doc = await Goal.create({
        userId,
        householdId: input.householdId,
        name: input.name,
        targetAmountMinorUnits: input.targetAmountMinorUnits,
        currentAmountMinorUnits: 0,
        currency: input.currency,
        targetDateUtc: input.targetDateUtc ? new Date(input.targetDateUtc) : undefined,
        color: input.color,
        icon: input.icon,
        status: 'active'
      });
      return doc.toGoal();
    }

    const id = new mongoose.Types.ObjectId().toString();
    const now = new Date().toISOString();
    const goal: SavingsGoal = {
      id,
      userId,
      householdId: input.householdId,
      name: input.name,
      targetAmountMinorUnits: input.targetAmountMinorUnits,
      currentAmountMinorUnits: 0,
      currency: input.currency,
      targetDateUtc: input.targetDateUtc,
      color: input.color,
      icon: input.icon,
      status: 'active',
      createdAt: now,
      updatedAt: now
    };
    memoryGoals.set(id, goal);
    return goal;
  }

  static async listGoals(userId: string): Promise<SavingsGoal[]> {
    if (this.isDbConnected()) {
      const docs = await Goal.find({ userId }).sort({ createdAt: -1 }).exec();
      return docs.map((d) => d.toGoal());
    }

    const goals: SavingsGoal[] = [];
    for (const g of memoryGoals.values()) {
      if (g.userId === userId) goals.push(g);
    }
    return goals;
  }

  static async getGoalById(id: string, userId: string): Promise<SavingsGoal | null> {
    if (this.isDbConnected()) {
      const doc = await Goal.findById(id).exec();
      if (!doc || doc.userId !== userId) return null;
      return doc.toGoal();
    }

    const g = memoryGoals.get(id);
    if (!g || g.userId !== userId) return null;
    return g;
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
      await doc.save();
      return doc.toGoal();
    }

    const g = memoryGoals.get(id);
    if (!g || g.userId !== userId) return null;
    const updated: SavingsGoal = {
      ...g,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    memoryGoals.set(id, updated);
    return updated;
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
        return doc.toGoal();
      }
    }

    const updated: SavingsGoal = {
      ...goal,
      currentAmountMinorUnits: newCurrent,
      status: isCompleted ? 'completed' : goal.status,
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

  // ==========================================
  // Households / Shared Finances
  // ==========================================
  static async createHousehold(
    ownerId: string,
    ownerEmail: string,
    ownerName: string,
    input: CreateHouseholdInput
  ): Promise<Household> {
    const ownerMember = {
      userId: ownerId,
      email: ownerEmail,
      displayName: ownerName,
      role: 'owner' as HouseholdRole,
      joinedAt: new Date().toISOString()
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

  static async getHouseholdById(id: string, userId: string): Promise<Household | null> {
    if (this.isDbConnected()) {
      const doc = await HouseholdModel.findById(id).exec();
      if (!doc || !doc.members.some((m) => m.userId === userId)) return null;
      return doc.toHousehold();
    }

    const hh = memoryHouseholds.get(id);
    if (!hh || !hh.members.some((m) => m.userId === userId)) return null;
    return hh;
  }

  static async isUserInHousehold(userId: string, householdId: string): Promise<boolean> {
    const hh = await this.getHouseholdById(householdId, userId);
    return !!hh;
  }

  static async inviteMember(
    householdId: string,
    inviterUserId: string,
    input: InviteMemberInput,
    invitee: { id: string; displayName: string }
  ): Promise<Household> {
    const hh = await this.getHouseholdById(householdId, inviterUserId);
    if (!hh) throw AppError.notFound('Household not found.');

    const inviter = hh.members.find((m) => m.userId === inviterUserId);
    if (!inviter || (inviter.role !== 'owner' && inviter.role !== 'admin')) {
      throw AppError.forbidden('Only household owner or admins can invite members.');
    }

    if (hh.members.some((m) => m.userId === invitee.id)) {
      throw AppError.conflict('User is already a member of this household.');
    }

    const newMember = {
      userId: invitee.id,
      email: input.email,
      displayName: invitee.displayName,
      role: input.role,
      joinedAt: new Date().toISOString()
    };

    if (this.isDbConnected()) {
      const doc = await HouseholdModel.findById(householdId).exec();
      if (doc) {
        doc.members.push({
          ...newMember,
          joinedAt: new Date(newMember.joinedAt)
        });
        await doc.save();
        return doc.toHousehold();
      }
    }

    hh.members.push(newMember);
    hh.updatedAt = new Date().toISOString();
    memoryHouseholds.set(householdId, hh);
    return hh;
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
