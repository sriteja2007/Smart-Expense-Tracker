import { ApiClient } from './api';
import type {
  FinancialAccount,
  CreateAccountInput,
  Transaction,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionListResult,
  Category,
  CreateCategoryInput,
  RecurringSchedule,
  CreateRecurringInput,
  UpdateRecurringInput,
  CsvImportPreviewResult
} from '@lumaspend/shared';

export interface AnalyticsSummary {
  monthlyIncomeMinorUnits: number;
  monthlyExpenseMinorUnits: number;
  netSavingsMinorUnits: number;
  savingsRatePercent: number;
  currency: string;
}

export class FinancialApi {
  // ==========================================
  // Accounts
  // ==========================================
  static async listAccounts(): Promise<FinancialAccount[]> {
    const res = await ApiClient.request<FinancialAccount[]>('/accounts');
    if (!res.success) throw new Error(res.error?.message || 'Failed to fetch accounts');
    return res.data;
  }

  static async createAccount(data: CreateAccountInput): Promise<FinancialAccount> {
    const res = await ApiClient.request<FinancialAccount>('/accounts', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to create account');
    return res.data;
  }

  // ==========================================
  // Categories
  // ==========================================
  static async listCategories(): Promise<Category[]> {
    const res = await ApiClient.request<Category[]>('/categories');
    if (!res.success) throw new Error(res.error?.message || 'Failed to fetch categories');
    return res.data;
  }

  static async createCategory(data: CreateCategoryInput): Promise<Category> {
    const res = await ApiClient.request<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to create category');
    return res.data;
  }

  static async deleteCategory(id: string): Promise<boolean> {
    const res = await ApiClient.request<{ message: string }>(`/categories/${id}`, {
      method: 'DELETE'
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to delete category');
    return true;
  }

  // ==========================================
  // Transactions
  // ==========================================
  static async listTransactions(params?: {
    search?: string;
    type?: string;
    categoryId?: string;
    accountId?: string;
    startDateUtc?: string;
    endDateUtc?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<TransactionListResult> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.type && params.type !== 'all') query.set('type', params.type);
    if (params?.categoryId) query.set('categoryId', params.categoryId);
    if (params?.accountId) query.set('accountId', params.accountId);
    if (params?.startDateUtc) query.set('startDateUtc', params.startDateUtc);
    if (params?.endDateUtc) query.set('endDateUtc', params.endDateUtc);
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    if (params?.sortOrder) query.set('sortOrder', params.sortOrder);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());

    const qs = query.toString();
    const endpoint = `/transactions${qs ? `?${qs}` : ''}`;
    const res = await ApiClient.request<TransactionListResult>(endpoint);
    if (!res.success) throw new Error(res.error?.message || 'Failed to fetch transactions');
    return res.data;
  }

  static async getTransaction(id: string): Promise<Transaction> {
    const res = await ApiClient.request<Transaction>(`/transactions/${id}`);
    if (!res.success) throw new Error(res.error?.message || 'Failed to fetch transaction');
    return res.data;
  }

  static async createTransaction(data: CreateTransactionInput): Promise<Transaction> {
    const res = await ApiClient.request<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to create transaction');
    return res.data;
  }

  static async updateTransaction(id: string, data: UpdateTransactionInput): Promise<Transaction> {
    const res = await ApiClient.request<Transaction>(`/transactions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to update transaction');
    return res.data;
  }

  static async deleteTransaction(id: string): Promise<boolean> {
    const res = await ApiClient.request<{ message: string }>(`/transactions/${id}`, {
      method: 'DELETE'
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to delete transaction');
    return true;
  }

  // ==========================================
  // CSV Import & Export
  // ==========================================
  static async previewCsv(csvContent: string, defaultAccountId?: string): Promise<CsvImportPreviewResult> {
    const res = await ApiClient.request<CsvImportPreviewResult>('/transactions/import/preview', {
      method: 'POST',
      body: JSON.stringify({ csvContent, defaultAccountId })
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to parse CSV preview');
    return res.data;
  }

  static async confirmCsvImport(rows: unknown[]): Promise<{ importedCount: number }> {
    const res = await ApiClient.request<{ importedCount: number }>('/transactions/import/confirm', {
      method: 'POST',
      body: JSON.stringify({ rows })
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to import CSV transactions');
    return res.data;
  }

  static async exportCsv(params?: {
    startDateUtc?: string;
    endDateUtc?: string;
    categoryId?: string;
  }): Promise<string> {
    const query = new URLSearchParams();
    if (params?.startDateUtc) query.set('startDateUtc', params.startDateUtc);
    if (params?.endDateUtc) query.set('endDateUtc', params.endDateUtc);
    if (params?.categoryId) query.set('categoryId', params.categoryId);
    const qs = query.toString();
    return ApiClient.downloadText(`/transactions/export-csv${qs ? `?${qs}` : ''}`);
  }

  // ==========================================
  // Recurring Schedules
  // ==========================================
  static async listRecurring(): Promise<RecurringSchedule[]> {
    const res = await ApiClient.request<RecurringSchedule[]>('/recurring');
    if (!res.success) throw new Error(res.error?.message || 'Failed to fetch recurring schedules');
    return res.data;
  }

  static async createRecurring(data: CreateRecurringInput): Promise<RecurringSchedule> {
    const res = await ApiClient.request<RecurringSchedule>('/recurring', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to create recurring rule');
    return res.data;
  }

  static async updateRecurring(id: string, data: UpdateRecurringInput): Promise<RecurringSchedule> {
    const res = await ApiClient.request<RecurringSchedule>(`/recurring/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to update recurring rule');
    return res.data;
  }

  static async deleteRecurring(id: string): Promise<boolean> {
    const res = await ApiClient.request<{ message: string }>(`/recurring/${id}`, {
      method: 'DELETE'
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to delete recurring schedule');
    return true;
  }

  static async processDueRecurring(): Promise<{ processedCount: number; transactions: Transaction[] }> {
    const res = await ApiClient.request<{ processedCount: number; transactions: Transaction[] }>(
      '/recurring/process-due',
      { method: 'POST' }
    );
    if (!res.success) throw new Error(res.error?.message || 'Failed to process recurring due items');
    return res.data;
  }

  // ==========================================
  // Analytics
  // ==========================================
  static async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    const res = await ApiClient.request<AnalyticsSummary>('/analytics/summary');
    if (!res.success) throw new Error(res.error?.message || 'Failed to fetch analytics summary');
    return res.data;
  }
}
