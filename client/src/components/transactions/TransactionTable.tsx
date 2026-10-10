import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Icons } from '@/components/icons';
import { EmptyState } from '@/components/states/EmptyState';
import { useToast } from '@/components/ui/toast';
import { FinancialApi } from '@/lib/financial-api';
import {
  formatCurrency,
  fromMinorUnits,
  type Transaction,
  type FinancialAccount,
  type Category,
  type CurrencyCode
} from '@lumaspend/shared';

interface TransactionTableProps {
  transactions: Transaction[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  accounts: FinancialAccount[];
  categories: Category[];
  currency: CurrencyCode;
  onPageChange: (page: number) => void;
  onSearchChange: (search: string) => void;
  onTypeFilterChange: (type: string) => void;
  onCategoryFilterChange: (catId: string) => void;
  onAccountFilterChange: (accId: string) => void;
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (tx: Transaction) => void;
  onOpenAddModal: () => void;
  onOpenImportModal: () => void;
  onRefresh: () => void;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  totalCount,
  currentPage,
  totalPages,
  isLoading,
  accounts,
  categories,
  currency,
  onPageChange,
  onSearchChange,
  onTypeFilterChange,
  onCategoryFilterChange,
  onAccountFilterChange,
  onSortChange,
  onEditTransaction,
  onDeleteTransaction,
  onOpenAddModal,
  onOpenImportModal
}) => {
  const { toast } = useToast();
  const [searchInput, setSearchInput] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [sortField, setSortField] = useState('dateUtc');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isExporting, setIsExporting] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange(searchInput.trim());
  };

  const handleSortToggle = (field: string) => {
    let nextOrder: 'asc' | 'desc' = 'desc';
    if (sortField === field) {
      nextOrder = sortOrder === 'desc' ? 'asc' : 'desc';
    }
    setSortField(field);
    setSortOrder(nextOrder);
    onSortChange(field, nextOrder);
  };

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const csvData = await FinancialApi.exportCsv();
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `lumaspend-ledger-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({
        title: 'Ledger Exported',
        description: 'CSV file downloaded successfully.',
        type: 'success'
      });
    } catch (err) {
      toast({
        title: 'Export Failed',
        description: err instanceof Error ? err.message : 'Failed to export CSV',
        type: 'error'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getAccountName = (accId?: string) => {
    if (!accId) return 'Wallet';
    const acc = accounts.find((a) => a.id === accId);
    return acc ? acc.name : 'Unknown Account';
  };

  const getCategoryName = (catId?: string) => {
    if (!catId) return 'General';
    const cat = categories.find((c) => c.id === catId);
    return cat ? cat.name : 'Uncategorized';
  };

  return (
    <div className="space-y-5">
      {/* Header toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Transaction Ledger</span>
            <Badge variant="violet" className="text-[10px]">
              {totalCount} Total Records
            </Badge>
          </h2>
          <p className="text-xs text-text-secondary">
            Unified multi-wallet financial ledger with audit trails and instant filtering
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="glass"
            size="sm"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="text-xs text-text-secondary hover:text-white"
          >
            {isExporting ? (
              <Icons.Refresh className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <Icons.Download className="h-3.5 w-3.5 mr-1.5" />
            )}
            <span>Export CSV</span>
          </Button>

          <Button
            variant="glass"
            size="sm"
            onClick={onOpenImportModal}
            className="text-xs text-text-secondary hover:text-white"
          >
            <Icons.Upload className="h-3.5 w-3.5 mr-1.5" />
            <span>Import CSV</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={onOpenAddModal}
            className="text-xs font-semibold shadow-glow-violet"
          >
            <Icons.Plus className="h-3.5 w-3.5 mr-1.5" />
            <span>+ Record Transaction</span>
            <kbd className="hidden sm:inline-block ml-2 px-1.5 py-0.5 text-[9px] bg-white/20 rounded font-mono">N</kbd>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-surface-100/50 border border-white/5 backdrop-blur-md space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="relative sm:col-span-2 lg:col-span-1">
            <Input
              placeholder="Search description, merchant, notes..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                if (e.target.value === '') onSearchChange('');
              }}
              className="w-full h-9 text-xs pl-8 pr-8"
            />
            <Icons.Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  onSearchChange('');
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-white"
              >
                ×
              </button>
            )}
          </form>

          {/* Type filter */}
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              onTypeFilterChange(e.target.value);
            }}
            className="h-9 px-3 rounded-xl bg-surface-elevated border border-white/10 text-xs text-text-primary focus:outline-none focus:border-brand-violet"
          >
            <option value="all">All Flow Types</option>
            <option value="expense">Expenses Only</option>
            <option value="income">Income Only</option>
            <option value="transfer">Account Transfers</option>
          </select>

          {/* Account filter */}
          <select
            value={selectedAccount}
            onChange={(e) => {
              setSelectedAccount(e.target.value);
              onAccountFilterChange(e.target.value);
            }}
            className="h-9 px-3 rounded-xl bg-surface-elevated border border-white/10 text-xs text-text-primary focus:outline-none focus:border-brand-violet"
          >
            <option value="">All Accounts / Wallets</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>

          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              onCategoryFilterChange(e.target.value);
            }}
            className="h-9 px-3 rounded-xl bg-surface-elevated border border-white/10 text-xs text-text-primary focus:outline-none focus:border-brand-violet"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name} ({cat.type})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main ledger list / table */}
      {isLoading ? (
        <div className="p-12 text-center rounded-2xl border border-white/5 bg-surface-elevated/20">
          <Icons.Refresh className="h-8 w-8 text-brand-glow animate-spin mx-auto mb-2" />
          <p className="text-xs text-text-muted">Loading transaction records...</p>
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState
          title="No transactions found"
          description={
            searchInput || selectedType !== 'all' || selectedCategory || selectedAccount
              ? 'No transactions matched your active filters. Try resetting search filters.'
              : 'Your ledger is currently empty. Record your first transaction or import a CSV file.'
          }
          actionLabel="+ Record Transaction"
          onAction={onOpenAddModal}
        />
      ) : (
        <div className="space-y-4">
          {/* Responsive Table View */}
          <div className="rounded-2xl border border-white/5 bg-surface-100/50 backdrop-blur-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-elevated/80 border-b border-white/5 text-text-muted">
                  <tr>
                    <th
                      className="px-4 py-3 font-semibold cursor-pointer select-none hover:text-white transition-colors"
                      onClick={() => handleSortToggle('dateUtc')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Date</span>
                        {sortField === 'dateUtc' && (
                          <span className="text-brand-glow">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 font-semibold">Transaction / Payee</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Account / Flow</th>
                    <th className="px-4 py-3 font-semibold">Notes</th>
                    <th
                      className="px-4 py-3 font-semibold text-right cursor-pointer select-none hover:text-white transition-colors"
                      onClick={() => handleSortToggle('amountMinorUnits')}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Amount</span>
                        {sortField === 'amountMinorUnits' && (
                          <span className="text-brand-glow">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 font-semibold text-center w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {transactions.map((tx) => {
                    const decimalAmount = fromMinorUnits(tx.amountMinorUnits, tx.currency);
                    return (
                      <tr key={tx.id} className="hover:bg-surface-elevated/40 transition-colors group">
                        {/* Date */}
                        <td className="px-4 py-3.5 text-text-muted whitespace-nowrap">
                          {tx.dateUtc ? tx.dateUtc.slice(0, 10) : '—'}
                        </td>

                        {/* Title & Merchant */}
                        <td className="px-4 py-3.5 font-semibold text-white">
                          <div className="flex items-center gap-2">
                            {tx.type === 'income' ? (
                              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-finance-income">
                                <Icons.Income className="h-3.5 w-3.5" />
                              </div>
                            ) : tx.type === 'transfer' ? (
                              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-brand-blue">
                                <Icons.Transfer className="h-3.5 w-3.5" />
                              </div>
                            ) : (
                              <div className="p-1.5 rounded-lg bg-rose-500/10 text-finance-expense">
                                <Icons.Expense className="h-3.5 w-3.5" />
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-white leading-tight">{tx.description}</p>
                              {tx.merchantName && (
                                <p className="text-[10px] text-text-muted">{tx.merchantName}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3.5 text-text-secondary whitespace-nowrap">
                          {tx.type === 'transfer' ? (
                            <Badge variant="violet" className="text-[10px]">Internal Transfer</Badge>
                          ) : (
                            <span>{getCategoryName(tx.categoryId)}</span>
                          )}
                        </td>

                        {/* Account */}
                        <td className="px-4 py-3.5 text-text-secondary whitespace-nowrap">
                          {tx.type === 'transfer' ? (
                            <div className="text-[11px]">
                              <span>{getAccountName(tx.sourceAccountId)}</span>
                              <span className="mx-1 text-text-muted">➔</span>
                              <span>{getAccountName(tx.destinationAccountId)}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] px-2 py-0.5 rounded bg-surface-elevated border border-white/5">
                              {getAccountName(tx.sourceAccountId)}
                            </span>
                          )}
                        </td>

                        {/* Notes */}
                        <td className="px-4 py-3.5 text-text-muted text-[11px] max-w-[140px] truncate">
                          {tx.notes ? tx.notes : '—'}
                        </td>

                        {/* Amount */}
                        <td className={`px-4 py-3.5 text-right font-bold whitespace-nowrap ${
                          tx.type === 'income'
                            ? 'text-finance-income font-mono'
                            : tx.type === 'transfer'
                            ? 'text-brand-glow font-mono'
                            : 'text-white font-mono'
                        }`}>
                          {tx.type === 'income' ? `+${formatCurrency(decimalAmount, currency)}` : formatCurrency(decimalAmount, currency)}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => onEditTransaction(tx)}
                              className="p-1 rounded-lg hover:bg-white/10 text-text-muted hover:text-white transition-colors"
                              title="Edit transaction"
                            >
                              <Icons.Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteTransaction(tx)}
                              className="p-1 rounded-lg hover:bg-rose-500/20 text-text-muted hover:text-finance-expense transition-colors"
                              title="Delete transaction"
                            >
                              <Icons.Trash className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between pt-2 px-1 text-xs text-text-muted">
            <div>
              Page <span className="font-semibold text-white">{currentPage}</span> of{' '}
              <span className="font-semibold text-white">{totalPages || 1}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="glass"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="text-xs"
              >
                Previous
              </Button>
              <Button
                variant="glass"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
