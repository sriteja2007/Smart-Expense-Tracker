import React, { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { useToast } from '@/components/ui/toast';
import { FinancialApi } from '@/lib/financial-api';
import type { FinancialAccount, CsvImportPreviewResult, CsvImportRow } from '@lumaspend/shared';

interface CsvImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: FinancialAccount[];
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  open,
  onClose,
  onSuccess,
  accounts
}) => {
  const { toast } = useToast();
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [previewData, setPreviewData] = useState<CsvImportPreviewResult | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resetState = () => {
    setCsvText('');
    setFileName(null);
    setPreviewData(null);
    setErrorMsg(null);
    setIsLoading(false);
    setIsImporting(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('File size exceeds the 2MB safety limit.');
      return;
    }

    setFileName(file.name);
    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content || '');
    };
    reader.readAsText(file);
  };

  const handlePreview = async () => {
    if (!csvText.trim()) {
      setErrorMsg('Please select a CSV file or paste valid CSV content.');
      return;
    }

    if (!selectedAccountId) {
      setErrorMsg('Please select a destination account for the imported transactions.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg(null);
      const res = await FinancialApi.previewCsv(csvText, selectedAccountId);
      setPreviewData(res);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to parse CSV preview.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData) return;

    // Filter rows to import: valid rows, and optionally exclude duplicates
    const rowsToImport = previewData.rows
      .filter((r) => r.isValid)
      .filter((r) => (skipDuplicates ? !r.isDuplicate : true))
      .map((r) => ({
        dateUtc: r.dateUtc || new Date().toISOString(),
        type: r.type,
        amountMinorUnits: r.amountMinorUnits,
        sourceAccountId: selectedAccountId,
        categoryId: r.categoryId,
        description: r.description,
        merchantName: r.merchantName,
        paymentMethod: 'other',
        notes: r.notes,
        tags: ['csv-import']
      }));

    if (rowsToImport.length === 0) {
      setErrorMsg('No valid rows available to import under current filter criteria.');
      return;
    }

    try {
      setIsImporting(true);
      setErrorMsg(null);
      const res = await FinancialApi.confirmCsvImport(rowsToImport);
      toast({
        title: 'Import Complete',
        description: `Successfully imported ${res.importedCount} transactions.`,
        type: 'success'
      });
      resetState();
      onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to import transactions.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        resetState();
        onClose();
      }}
      title="Import Transactions via CSV"
      description="Upload a CSV ledger export with automatic parsing, validation, and duplicate detection."
      className="max-w-2xl"
    >
      <div className="space-y-5 pt-2">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-finance-expense/10 border border-finance-expense/30 text-xs text-rose-300 flex items-center gap-2">
            <Icons.Error className="h-4 w-4 shrink-0 text-finance-expense" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Step 1: File selection & account setup */}
        {!previewData && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1.5">
                Target Account <span className="text-finance-expense">*</span>
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-surface-elevated border border-white/10 text-xs text-text-primary focus:outline-none focus:border-brand-violet"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (Balance: ₹{(acc.balanceMinorUnits / 100).toLocaleString('en-IN')})
                  </option>
                ))}
              </select>
            </div>

            {/* Dropzone / Upload area */}
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1.5">Select CSV File</label>
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/15 rounded-2xl bg-surface-elevated/40 hover:bg-surface-elevated/70 cursor-pointer transition-colors group">
                <Icons.Upload className="h-8 w-8 text-brand-glow mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-semibold text-white">
                  {fileName ? fileName : 'Click to browse or drop CSV file'}
                </p>
                <p className="text-[11px] text-text-muted mt-0.5">Maximum 500 rows, up to 2MB (RFC 4180 format)</p>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Or Paste CSV Raw Text */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-text-muted">Or Paste CSV Content</label>
                <button
                  type="button"
                  onClick={() =>
                    setCsvText(
                      'Date,Type,Description,Amount,Category,Notes\n' +
                      '2026-10-01,expense,"Zepto Groceries",350.00,Groceries,"Fresh produce"\n' +
                      '2026-10-02,expense,"Starbucks Coffee",290.00,Dining,"Espresso"\n' +
                      '2026-10-03,income,"Freelance Invoice",15000.00,Freelance,"Design payment"'
                    )
                  }
                  className="text-[11px] text-brand-glow hover:underline"
                >
                  Load Sample CSV
                </button>
              </div>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Date,Type,Description,Amount,Category,Notes..."
                rows={4}
                className="w-full p-3 rounded-xl bg-surface-elevated border border-white/10 text-xs font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-violet resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handlePreview}
                disabled={isLoading || !csvText.trim()}
              >
                {isLoading ? (
                  <span className="flex items-center gap-1.5">
                    <Icons.Refresh className="h-3.5 w-3.5 animate-spin" />
                    Parsing CSV...
                  </span>
                ) : (
                  'Preview & Validate'
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Preview & Validation Table */}
        {previewData && (
          <div className="space-y-4">
            {/* Stat Counters */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-surface-elevated border border-white/5">
                <span className="block text-base font-extrabold text-white">{previewData.totalRows}</span>
                <span className="text-[10px] text-text-muted uppercase font-semibold">Total Rows</span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="block text-base font-extrabold text-emerald-400">{previewData.validCount}</span>
                <span className="text-[10px] text-emerald-400 uppercase font-semibold">Valid</span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="block text-base font-extrabold text-amber-400">{previewData.duplicateCount}</span>
                <span className="text-[10px] text-amber-400 uppercase font-semibold">Duplicates</span>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <span className="block text-base font-extrabold text-rose-400">{previewData.invalidCount}</span>
                <span className="text-[10px] text-rose-400 uppercase font-semibold">Invalid</span>
              </div>
            </div>

            {/* Duplicate toggle */}
            {previewData.duplicateCount > 0 && (
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-elevated border border-white/5 text-xs text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="rounded border-white/20 bg-void text-brand-violet focus:ring-0"
                />
                <span>Skip duplicate rows ({previewData.duplicateCount} items) during import</span>
              </label>
            )}

            {/* Rows Table */}
            <div className="max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-surface-elevated/40">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-elevated sticky top-0 border-b border-white/10 text-text-muted">
                  <tr>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Notes / Issues</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                  {previewData.rows.map((row: CsvImportRow, idx: number) => (
                    <tr key={idx} className={row.isValid ? 'hover:bg-white/5' : 'bg-rose-500/5'}>
                      <td className="px-3 py-2">
                        {!row.isValid ? (
                          <Badge variant="expense" className="text-[10px]">Invalid</Badge>
                        ) : row.isDuplicate ? (
                          <Badge variant="warning" className="text-[10px]">Duplicate</Badge>
                        ) : (
                          <Badge variant="income" className="text-[10px]">Valid</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 text-text-muted">{row.dateUtc ? row.dateUtc.slice(0, 10) : '—'}</td>
                      <td className="px-3 py-2 font-medium text-white max-w-[120px] truncate">{row.description}</td>
                      <td className="px-3 py-2 font-semibold">₹{(row.amountMinorUnits / 100).toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2 text-[10px]">
                        {!row.isValid ? (
                          <span className="text-rose-400">{row.errors.join('; ')}</span>
                        ) : row.isDuplicate ? (
                          <span className="text-amber-400">{row.duplicateReason}</span>
                        ) : (
                          <span className="text-text-muted">{row.notes || '—'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-white/5">
              <Button variant="ghost" size="sm" onClick={() => setPreviewData(null)} disabled={isImporting}>
                Back to File
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmImport}
                disabled={isImporting || previewData.validCount === 0}
              >
                {isImporting ? (
                  <span className="flex items-center gap-1.5">
                    <Icons.Refresh className="h-3.5 w-3.5 animate-spin" />
                    Importing...
                  </span>
                ) : (
                  `Confirm Import (${
                    skipDuplicates
                      ? previewData.validCount - previewData.duplicateCount
                      : previewData.validCount
                  } Rows)`
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};
