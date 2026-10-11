import React, { useState, useEffect, useCallback } from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { FinancialApi } from '@/lib/financial-api';
import {
  formatCurrency,
  fromMinorUnits,
  type CurrencyCode
} from '@lumaspend/shared';

interface ReportExporterProps {
  currency: CurrencyCode;
}

export const ReportExporter: React.FC<ReportExporterProps> = ({ currency }) => {
  const { toast } = useToast();
  const now = new Date();

  const [selectedMonth, setSelectedMonth] = useState(now.getUTCMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getUTCFullYear());
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const loadReportPreview = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await FinancialApi.getMonthlyReport(selectedMonth, selectedYear);
      setReportData(data);
    } catch (err) {
      toast({
        title: 'Error loading report preview',
        description: err instanceof Error ? err.message : 'Please try again',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, selectedYear, toast]);

  useEffect(() => {
    loadReportPreview();
  }, [loadReportPreview]);

  const handleDownloadPdf = async () => {
    try {
      setIsExportingPdf(true);
      const blob = await FinancialApi.downloadPdfReport(selectedMonth, selectedYear);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lumaspend-report-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'PDF Report Generated',
        description: 'Executive financial statement downloaded successfully',
        type: 'success'
      });
    } catch (err) {
      toast({
        title: 'PDF Generation Failed',
        description: err instanceof Error ? err.message : 'Please try again',
        type: 'error'
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDownloadCsv = async () => {
    try {
      setIsExportingCsv(true);
      const startOfMonth = new Date(Date.UTC(selectedYear, selectedMonth - 1, 1)).toISOString();
      const endOfMonth = new Date(Date.UTC(selectedYear, selectedMonth, 0, 23, 59, 59, 999)).toISOString();

      const csvContent = await FinancialApi.exportCsv({
        startDateUtc: startOfMonth,
        endDateUtc: endOfMonth
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lumaspend-transactions-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'CSV Exported',
        description: 'RFC 4180 compliant CSV ledger downloaded',
        type: 'success'
      });
    } catch (err) {
      toast({
        title: 'CSV Export Failed',
        description: err instanceof Error ? err.message : 'Please try again',
        type: 'error'
      });
    } finally {
      setIsExportingCsv(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Executive Reports & Data Export</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Generate audit-ready PDF financial statements and export CSV transaction records
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-1.5 bg-surface-elevated/80 border border-white/10 rounded-xl px-2.5 py-1.5">
          <select
            aria-label="Select report month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
            className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer"
          >
            {monthNames.map((name, idx) => (
              <option key={name} value={idx + 1} className="bg-surface-elevated text-white">
                {name}
              </option>
            ))}
          </select>
          <span className="text-text-muted text-xs">/</span>
          <select
            aria-label="Select report year"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y} className="bg-surface-elevated text-white">
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Export Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PDF Statement Card */}
        <GlassPanel intensity="medium" className="p-6 space-y-4 border border-brand-violet/20">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-brand-violet/10 border border-brand-violet/20 text-brand-violet">
              <Icons.FileText className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Executive PDF Statement</h3>
              <p className="text-xs text-text-muted">A4 document with executive KPIs, budget tracking & ledger detail</p>
            </div>
          </div>

          <div className="text-xs text-text-secondary space-y-1.5 bg-surface-elevated/40 p-3.5 rounded-xl border border-white/5">
            <div className="flex items-center gap-2">
              <Icons.Check className="h-3.5 w-3.5 text-emerald-400" />
              <span>Full Reconciliation with Inflow and Outflow Analytics</span>
            </div>
            <div className="flex items-center gap-2">
              <Icons.Check className="h-3.5 w-3.5 text-emerald-400" />
              <span>Category Breakdown & Budget Performance Table</span>
            </div>
            <div className="flex items-center gap-2">
              <Icons.Check className="h-3.5 w-3.5 text-emerald-400" />
              <span>Confidential Statement with Page Indexing & Timestamps</span>
            </div>
          </div>

          <Button
            variant="primary"
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="w-full text-xs font-semibold"
          >
            <Icons.Download className="h-3.5 w-3.5 mr-1.5" />
            {isExportingPdf ? 'Compiling PDF Statement...' : 'Download Executive PDF Statement'}
          </Button>
        </GlassPanel>

        {/* CSV Ledger Card */}
        <GlassPanel intensity="medium" className="p-6 space-y-4 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Icons.Layers className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">RFC 4180 CSV Export</h3>
              <p className="text-xs text-text-muted">Structured spreadsheet data ready for Excel, Sheets or accounting</p>
            </div>
          </div>

          <div className="text-xs text-text-secondary space-y-1.5 bg-surface-elevated/40 p-3.5 rounded-xl border border-white/5">
            <div className="flex items-center gap-2">
              <Icons.Check className="h-3.5 w-3.5 text-emerald-400" />
              <span>Escaped quotation & comma handling compliant with RFC 4180</span>
            </div>
            <div className="flex items-center gap-2">
              <Icons.Check className="h-3.5 w-3.5 text-emerald-400" />
              <span>Includes ISO 8601 UTC dates, merchant and notes</span>
            </div>
            <div className="flex items-center gap-2">
              <Icons.Check className="h-3.5 w-3.5 text-emerald-400" />
              <span>Exact minor-unit to major-unit conversion</span>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={handleDownloadCsv}
            disabled={isExportingCsv}
            className="w-full text-xs font-semibold border-white/10"
          >
            <Icons.Download className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
            {isExportingCsv ? 'Extracting CSV...' : 'Export Transactions to CSV'}
          </Button>
        </GlassPanel>
      </div>

      {/* Monthly Summary Preview */}
      {isLoading ? (
        <GlassPanel intensity="subtle" className="p-6 h-36 animate-pulse bg-white/5" />
      ) : reportData ? (
        <GlassPanel intensity="subtle" className="p-6 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <h4 className="text-sm font-bold text-white">
              Statement Summary Preview — {monthNames[selectedMonth - 1]} {selectedYear}
            </h4>
            <Badge variant="neutral" className="text-xs font-mono">
              {reportData.transactionCount} transactions recorded
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="bg-surface-elevated/60 p-3.5 rounded-xl border border-white/5">
              <span className="text-[10px] font-semibold text-text-muted uppercase block">Total Income</span>
              <span className="text-sm sm:text-base font-bold text-finance-income font-mono">
                {formatCurrency(fromMinorUnits(reportData.totalIncomeMinorUnits || 0, currency), currency)}
              </span>
            </div>

            <div className="bg-surface-elevated/60 p-3.5 rounded-xl border border-white/5">
              <span className="text-[10px] font-semibold text-text-muted uppercase block">Total Expense</span>
              <span className="text-sm sm:text-base font-bold text-finance-expense font-mono">
                {formatCurrency(fromMinorUnits(reportData.totalExpenseMinorUnits || 0, currency), currency)}
              </span>
            </div>

            <div className="bg-surface-elevated/60 p-3.5 rounded-xl border border-white/5">
              <span className="text-[10px] font-semibold text-text-muted uppercase block">Net Savings</span>
              <span className="text-sm sm:text-base font-bold text-brand-glow font-mono">
                {formatCurrency(fromMinorUnits(reportData.netSavingsMinorUnits || 0, currency), currency)}
              </span>
            </div>

            <div className="bg-surface-elevated/60 p-3.5 rounded-xl border border-white/5">
              <span className="text-[10px] font-semibold text-text-muted uppercase block">Savings Rate</span>
              <span className="text-sm sm:text-base font-bold text-emerald-400 font-mono">
                {reportData.savingsRatePct || 0}%
              </span>
            </div>
          </div>
        </GlassPanel>
      ) : null}
    </div>
  );
};
