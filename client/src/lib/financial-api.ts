import { ApiClient } from './api';
import type {
  FinancialAccount,
  CreateAccountInput,
  Transaction,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionListResult,
  FinancialCategory,
  CreateCategoryInput,
  Budget,
  CreateBudgetInput,
  UpdateBudgetInput,
  SavingsGoal,
  CreateGoalInput,
  RecurringSchedule,
  CreateRecurringInput,
  UpdateRecurringInput,
  CsvImportPreviewResult,
  AnalyticsSummaryData,
  AnalyticsTrendPoint,
  CategoryBreakdownItem,
  BudgetVsActualItem,
  AiConversation,
  AiChatMessageResponse,
  AiInsightSummary,
  ReceiptScanResult,
  Household,
  CreateHouseholdInput,
  HouseholdInvitation,
  Notification,
  UserDataExport,
  UserProfile,
  UpdateProfileInput
} from '@lumaspend/shared';

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
  static async listCategories(): Promise<FinancialCategory[]> {
    const res = await ApiClient.request<FinancialCategory[]>('/categories');
    if (!res.success) throw new Error(res.error?.message || 'Failed to fetch categories');
    return res.data;
  }

  static async createCategory(data: CreateCategoryInput): Promise<FinancialCategory> {
    const res = await ApiClient.request<FinancialCategory>('/categories', {
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
    householdId?: string;
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
    if (params?.householdId) query.set('householdId', params.householdId);
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
  }): Promise<string> {
    const query = new URLSearchParams();
    if (params?.startDateUtc) query.set('startDateUtc', params.startDateUtc);
    if (params?.endDateUtc) query.set('endDateUtc', params.endDateUtc);
    const qs = query.toString();
    return ApiClient.downloadText(`/reports/export-csv${qs ? `?${qs}` : ''}`);
  }

  // ==========================================
  // Budgets
  // ==========================================
  static async listBudgets(month?: number, year?: number): Promise<Budget[]> {
    const query = new URLSearchParams();
    if (month) query.set('month', month.toString());
    if (year) query.set('year', year.toString());
    const qs = query.toString();
    const res = await ApiClient.request<Budget[]>(`/budgets${qs ? `?${qs}` : ''}`);
    if (!res.success) throw new Error(res.error?.message || 'Failed to fetch budgets');
    return res.data;
  }

  static async createBudget(data: CreateBudgetInput): Promise<Budget> {
    const res = await ApiClient.request<Budget>('/budgets', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to create budget');
    return res.data;
  }

  static async updateBudget(id: string, data: UpdateBudgetInput): Promise<Budget> {
    const res = await ApiClient.request<Budget>(`/budgets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to update budget');
    return res.data;
  }

  static async deleteBudget(id: string): Promise<boolean> {
    const res = await ApiClient.request<{ message: string }>(`/budgets/${id}`, {
      method: 'DELETE'
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to delete budget');
    return true;
  }

  static async checkBudgetAlerts(month?: number, year?: number): Promise<{ triggeredCount: number; alerts: any[] }> {
    const res = await ApiClient.request<{ triggeredCount: number; alerts: any[] }>('/budgets/check-alerts', {
      method: 'POST',
      body: JSON.stringify({ month, year })
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to check budget alerts');
    return res.data;
  }

  // ==========================================
  // Savings Goals
  // ==========================================
  static async listGoals(): Promise<SavingsGoal[]> {
    const res = await ApiClient.request<SavingsGoal[]>('/goals');
    if (!res.success) throw new Error(res.error?.message || 'Failed to fetch goals');
    return res.data;
  }

  static async createGoal(data: CreateGoalInput): Promise<SavingsGoal> {
    const res = await ApiClient.request<SavingsGoal>('/goals', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to create savings goal');
    return res.data;
  }

  static async updateGoal(id: string, data: Partial<SavingsGoal>): Promise<SavingsGoal> {
    const res = await ApiClient.request<SavingsGoal>(`/goals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to update savings goal');
    return res.data;
  }

  static async contributeToGoal(
    id: string,
    amountMinorUnits: number,
    sourceAccountId: string
  ): Promise<SavingsGoal> {
    const res = await ApiClient.request<SavingsGoal>(`/goals/${id}/contribute`, {
      method: 'POST',
      body: JSON.stringify({ amountMinorUnits, sourceAccountId })
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to contribute to goal');
    return res.data;
  }

  static async deleteGoal(id: string): Promise<boolean> {
    const res = await ApiClient.request<{ message: string }>(`/goals/${id}`, {
      method: 'DELETE'
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to delete goal');
    return true;
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
  static async getAnalyticsSummary(params?: {
    startDateUtc?: string;
    endDateUtc?: string;
    accountId?: string;
    categoryId?: string;
  }): Promise<AnalyticsSummaryData> {
    const query = new URLSearchParams();
    if (params?.startDateUtc) query.set('startDateUtc', params.startDateUtc);
    if (params?.endDateUtc) query.set('endDateUtc', params.endDateUtc);
    if (params?.accountId) query.set('accountId', params.accountId);
    if (params?.categoryId) query.set('categoryId', params.categoryId);
    const qs = query.toString();
    const res = await ApiClient.request<AnalyticsSummaryData>(`/analytics/summary${qs ? `?${qs}` : ''}`);
    if (!res.success) throw new Error(res.error?.message || 'Failed to fetch analytics summary');
    return res.data;
  }

  static async getAnalyticsTrends(params?: {
    interval?: 'daily' | 'weekly' | 'monthly';
    startDateUtc?: string;
    endDateUtc?: string;
    accountId?: string;
    categoryId?: string;
  }): Promise<AnalyticsTrendPoint[]> {
    const query = new URLSearchParams();
    if (params?.interval) query.set('interval', params.interval);
    if (params?.startDateUtc) query.set('startDateUtc', params.startDateUtc);
    if (params?.endDateUtc) query.set('endDateUtc', params.endDateUtc);
    if (params?.accountId) query.set('accountId', params.accountId);
    if (params?.categoryId) query.set('categoryId', params.categoryId);
    const qs = query.toString();
    const res = await ApiClient.request<AnalyticsTrendPoint[]>(`/analytics/trends${qs ? `?${qs}` : ''}`);
    if (!res.success) throw new Error(res.error?.message || 'Failed to fetch trends');
    return res.data;
  }

  static async getCategoryBreakdown(params?: {
    month?: number;
    year?: number;
    startDateUtc?: string;
    endDateUtc?: string;
    accountId?: string;
  }): Promise<CategoryBreakdownItem[]> {
    const query = new URLSearchParams();
    if (params?.month) query.set('month', params.month.toString());
    if (params?.year) query.set('year', params.year.toString());
    if (params?.startDateUtc) query.set('startDateUtc', params.startDateUtc);
    if (params?.endDateUtc) query.set('endDateUtc', params.endDateUtc);
    if (params?.accountId) query.set('accountId', params.accountId);
    const qs = query.toString();
    const res = await ApiClient.request<CategoryBreakdownItem[]>(`/analytics/category-breakdown${qs ? `?${qs}` : ''}`);
    if (!res.success) throw new Error(res.error?.message || 'Failed to fetch category breakdown');
    return res.data;
  }

  static async getBudgetVsActual(month?: number, year?: number): Promise<BudgetVsActualItem[]> {
    const query = new URLSearchParams();
    if (month) query.set('month', month.toString());
    if (year) query.set('year', year.toString());
    const qs = query.toString();
    const res = await ApiClient.request<BudgetVsActualItem[]>(`/analytics/budget-vs-actual${qs ? `?${qs}` : ''}`);
    if (!res.success) throw new Error(res.error?.message || 'Failed to fetch budget vs actual');
    return res.data;
  }

  // ==========================================
  // Reports
  // ==========================================
  static async getMonthlyReport(month?: number, year?: number): Promise<any> {
    const query = new URLSearchParams();
    if (month) query.set('month', month.toString());
    if (year) query.set('year', year.toString());
    const qs = query.toString();
    const res = await ApiClient.request<any>(`/reports/monthly${qs ? `?${qs}` : ''}`);
    if (!res.success) throw new Error(res.error?.message || 'Failed to fetch monthly report');
    return res.data;
  }

  static async downloadPdfReport(month?: number, year?: number): Promise<Blob> {
    const query = new URLSearchParams();
    if (month) query.set('month', month.toString());
    if (year) query.set('year', year.toString());
    const qs = query.toString();
    return ApiClient.downloadBlob(`/reports/export-pdf${qs ? `?${qs}` : ''}`);
  }

  // ==========================================
  // AI Assistant & Insights
  // ==========================================
  static async getAiInsights(month?: number, year?: number): Promise<AiInsightSummary> {
    const query = new URLSearchParams();
    if (month) query.set('month', month.toString());
    if (year) query.set('year', year.toString());
    const qs = query.toString();
    const res = await ApiClient.request<AiInsightSummary>(`/ai/insights${qs ? `?${qs}` : ''}`);
    if (!res.success) throw new Error(res.error?.message || 'Failed to fetch AI financial insights');
    return res.data;
  }

  static async listAiConversations(): Promise<AiConversation[]> {
    const res = await ApiClient.request<AiConversation[]>('/ai/conversations');
    if (!res.success) throw new Error(res.error?.message || 'Failed to fetch conversations');
    return res.data;
  }

  static async createAiConversation(title?: string): Promise<AiConversation> {
    const res = await ApiClient.request<AiConversation>('/ai/conversations', {
      method: 'POST',
      body: JSON.stringify({ title: title || 'Financial Strategy Session' })
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to create conversation');
    return res.data;
  }

  static async getAiConversation(id: string): Promise<AiConversation> {
    const res = await ApiClient.request<AiConversation>(`/ai/conversations/${id}`);
    if (!res.success) throw new Error(res.error?.message || 'Failed to fetch conversation');
    return res.data;
  }

  static async deleteAiConversation(id: string): Promise<boolean> {
    const res = await ApiClient.request<{ message: string }>(`/ai/conversations/${id}`, {
      method: 'DELETE'
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to delete conversation');
    return true;
  }

  static async sendAiChat(content: string, conversationId?: string): Promise<AiChatMessageResponse> {
    const res = await ApiClient.request<AiChatMessageResponse>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ content, conversationId })
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to query AI financial assistant');
    return res.data;
  }

  // ==========================================
  // Receipt OCR Scanning
  // ==========================================
  static async scanReceipt(file: File): Promise<ReceiptScanResult> {
    const formData = new FormData();
    formData.append('receipt', file);

    const res = await ApiClient.request<ReceiptScanResult>('/receipts/scan', {
      method: 'POST',
      body: formData
    });

    if (!res.success) throw new Error(res.error?.message || 'Failed to scan receipt');
    return res.data;
  }

  // ==========================================
  // Households / Shared Budgets
  // ==========================================
  static async listHouseholds(): Promise<Household[]> {
    const res = await ApiClient.request<Household[]>('/households');
    if (!res.success) throw new Error(res.error?.message || 'Failed to fetch households');
    return res.data;
  }

  static async getHousehold(id: string): Promise<Household> {
    const res = await ApiClient.request<Household>(`/households/${id}`);
    if (!res.success) throw new Error(res.error?.message || 'Failed to fetch household');
    return res.data;
  }

  static async createHousehold(data: CreateHouseholdInput): Promise<Household> {
    const res = await ApiClient.request<Household>('/households', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to create household');
    return res.data;
  }

  static async createHouseholdInvitation(
    householdId: string,
    data: { email: string; role?: 'editor' | 'viewer' }
  ): Promise<{ invitation: HouseholdInvitation; inviteLink: string }> {
    const res = await ApiClient.request<HouseholdInvitation>(`/households/${householdId}/invitations`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to create invitation');
    return {
      invitation: res.data,
      inviteLink: (res as any).inviteLink || `/invite?token=${res.data.token}`
    };
  }

  static async acceptHouseholdInvitation(token: string): Promise<Household> {
    const res = await ApiClient.request<Household>('/households/invitations/accept', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to accept invitation');
    return res.data;
  }

  static async revokeHouseholdInvitation(householdId: string, invitationId: string): Promise<Household> {
    const res = await ApiClient.request<Household>(`/households/${householdId}/invitations/${invitationId}`, {
      method: 'DELETE'
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to revoke invitation');
    return res.data;
  }

  static async removeHouseholdMember(householdId: string, memberId: string): Promise<Household> {
    const res = await ApiClient.request<Household>(`/households/${householdId}/members/${memberId}`, {
      method: 'DELETE'
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to remove member');
    return res.data;
  }

  static async updateHouseholdMemberRole(
    householdId: string,
    memberId: string,
    role: 'editor' | 'viewer'
  ): Promise<Household> {
    const res = await ApiClient.request<Household>(`/households/${householdId}/members/${memberId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role })
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to update member role');
    return res.data;
  }

  static async deleteHousehold(householdId: string): Promise<boolean> {
    const res = await ApiClient.request<{ message: string }>(`/households/${householdId}`, {
      method: 'DELETE'
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to delete household');
    return true;
  }

  // ==========================================
  // Notifications
  // ==========================================
  static async listNotifications(): Promise<Notification[]> {
    const res = await ApiClient.request<Notification[]>('/notifications');
    if (!res.success) throw new Error(res.error?.message || 'Failed to fetch notifications');
    return res.data;
  }

  static async markNotificationRead(id: string): Promise<boolean> {
    const res = await ApiClient.request<{ message: string }>(`/notifications/${id}/read`, {
      method: 'PATCH'
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to mark notification read');
    return true;
  }

  static async markAllNotificationsRead(): Promise<number> {
    const res = await ApiClient.request<{ updatedCount: number }>('/notifications/read-all', {
      method: 'PATCH'
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to mark all notifications read');
    return (res as any).updatedCount || 0;
  }

  static async checkAlerts(): Promise<{ createdCount: number; notifications: Notification[] }> {
    const res = await ApiClient.request<{ createdCount: number; notifications: Notification[] }>(
      '/notifications/check-alerts',
      { method: 'POST' }
    );
    if (!res.success) throw new Error(res.error?.message || 'Failed to check alert triggers');
    return res.data;
  }

  static async deleteNotification(id: string): Promise<boolean> {
    const res = await ApiClient.request<{ message: string }>(`/notifications/${id}`, {
      method: 'DELETE'
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to delete notification');
    return true;
  }

  // ==========================================
  // Profile, Data Export & Account Deletion
  // ==========================================
  static async getProfile(): Promise<UserProfile> {
    const res = await ApiClient.request<UserProfile>('/profile');
    if (!res.success) throw new Error(res.error?.message || 'Failed to fetch user profile');
    return res.data;
  }

  static async updateProfile(data: UpdateProfileInput): Promise<UserProfile> {
    const res = await ApiClient.request<UserProfile>('/profile', {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to update user profile');
    return res.data;
  }

  static async exportUserData(): Promise<UserDataExport> {
    const res = await ApiClient.request<UserDataExport>('/profile/export');
    if (!res.success) throw new Error(res.error?.message || 'Failed to export user data');
    return res.data;
  }

  static async deleteAccount(confirmPhrase: string, password?: string): Promise<boolean> {
    const res = await ApiClient.request<{ message: string }>('/profile', {
      method: 'DELETE',
      body: JSON.stringify({ confirmPhrase, password })
    });
    if (!res.success) throw new Error(res.error?.message || 'Failed to delete account');
    return true;
  }
}
