import PDFDocument from 'pdfkit';
import type { Response } from 'express';
import { fromMinorUnits } from '@lumaspend/shared';
import type {
  FinancialAccount,
  Budget,
  Transaction,
  CategoryBreakdownItem,
  AnalyticsSummaryData,
  CurrencyCode
} from '@lumaspend/shared';

export interface GeneratePdfReportOptions {
  user: {
    displayName: string;
    email: string;
  };
  period: {
    month?: number;
    year?: number;
    startDateUtc?: string;
    endDateUtc?: string;
  };
  summary: AnalyticsSummaryData;
  categoryBreakdown: CategoryBreakdownItem[];
  budgets: Budget[];
  transactions: Transaction[];
  accounts: FinancialAccount[];
}

export class PdfReportService {
  /**
   * Sanitizes string for standard PDF Helvetica font (WinAnsiEncoding)
   * Strips characters that cannot be encoded in WinAnsi.
   */
  private static sanitizeText(text: string | undefined | null): string {
    if (!text) return '';
    return text.replace(/[^\x20-\x7E]/g, ' ').trim();
  }

  private static formatCurrencyPdf(minorUnits: number, currency: CurrencyCode = 'INR'): string {
    const val = fromMinorUnits(minorUnits, currency);
    const prefix = currency === 'INR' ? 'INR ' : `${currency} `;
    return `${prefix}${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  static generateFinancialReportStream(
    options: GeneratePdfReportOptions,
    res: Response
  ): void {
    const { user, period, summary, categoryBreakdown, budgets, transactions, accounts } = options;

    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      bufferPages: true,
      info: {
        Title: 'LumaSpend Financial Report',
        Author: 'LumaSpend Financial Intelligence',
        Subject: 'Executive Financial Summary & Statement'
      }
    });

    doc.pipe(res);

    const periodLabel = period.month && period.year
      ? new Date(Date.UTC(period.year, period.month - 1, 1)).toLocaleString('en-US', {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC'
        })
      : `${period.startDateUtc?.slice(0, 10) || ''} to ${period.endDateUtc?.slice(0, 10) || ''}`;

    // ==========================================
    // 1. Header & Brand Banner
    // ==========================================
    doc.rect(40, 40, 515, 60).fill('#4F46E5');

    doc
      .fillColor('#FFFFFF')
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('LumaSpend', 55, 52);

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#E0E7FF')
      .text('FINANCIAL INTELLIGENCE STATEMENT', 55, 78);

    doc
      .fontSize(9)
      .fillColor('#FFFFFF')
      .text(`Period: ${this.sanitizeText(periodLabel)}`, 350, 55, { align: 'right', width: 190 })
      .text(`Generated: ${new Date().toISOString().slice(0, 10)}`, 350, 70, { align: 'right', width: 190 });

    doc.moveDown(4);

    // ==========================================
    // 2. User & Account Meta
    // ==========================================
    const metaY = 115;
    doc
      .fillColor('#1E293B')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('ACCOUNT HOLDER:', 40, metaY)
      .font('Helvetica')
      .fillColor('#475569')
      .text(`${this.sanitizeText(user.displayName)} (${this.sanitizeText(user.email)})`, 160, metaY);

    doc
      .fillColor('#1E293B')
      .font('Helvetica-Bold')
      .text('ACTIVE WALLETS:', 40, metaY + 16)
      .font('Helvetica')
      .fillColor('#475569')
      .text(
        `${accounts.length} Accounts - Total Balance: ${this.formatCurrencyPdf(summary.totalBalanceMinorUnits)}`,
        160,
        metaY + 16
      );

    // Divider line
    doc.strokeColor('#CBD5E1').lineWidth(0.8).moveTo(40, metaY + 36).lineTo(555, metaY + 36).stroke();

    // ==========================================
    // 3. Executive KPI Summary Cards
    // ==========================================
    const kpiY = metaY + 48;
    const cardWidth = 120;
    const cardHeight = 52;
    const cards = [
      {
        title: 'TOTAL INCOME',
        val: this.formatCurrencyPdf(summary.monthlyIncomeMinorUnits),
        color: '#10B981',
        bg: '#F0FDF4'
      },
      {
        title: 'TOTAL EXPENSE',
        val: this.formatCurrencyPdf(summary.monthlyExpenseMinorUnits),
        color: '#EF4444',
        bg: '#FEF2F2'
      },
      {
        title: 'NET SAVINGS',
        val: this.formatCurrencyPdf(summary.netSavingsMinorUnits),
        color: summary.netSavingsMinorUnits >= 0 ? '#10B981' : '#EF4444',
        bg: summary.netSavingsMinorUnits >= 0 ? '#F0FDF4' : '#FEF2F2'
      },
      {
        title: 'SAVINGS RATE',
        val: `${summary.savingsRatePct}%`,
        color: '#6366F1',
        bg: '#EEF2FF'
      }
    ];

    cards.forEach((card, idx) => {
      const cx = 40 + idx * (cardWidth + 11);
      doc.rect(cx, kpiY, cardWidth, cardHeight).fill(card.bg);
      doc.rect(cx, kpiY, cardWidth, cardHeight).strokeColor('#E2E8F0').lineWidth(0.5).stroke();

      doc
        .fontSize(7.5)
        .font('Helvetica-Bold')
        .fillColor('#64748B')
        .text(card.title, cx + 8, kpiY + 8, { width: cardWidth - 16 });

      doc
        .fontSize(10.5)
        .font('Helvetica-Bold')
        .fillColor(card.color)
        .text(card.val, cx + 8, kpiY + 24, { width: cardWidth - 16 });
    });

    // ==========================================
    // 4. Budgets vs. Actuals Table
    // ==========================================
    let currentY = kpiY + cardHeight + 20;

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#0F172A')
      .text('BUDGET PERFORMANCE', 40, currentY);

    currentY += 16;

    // Table Header
    doc.rect(40, currentY, 515, 20).fill('#F1F5F9');
    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .fillColor('#334155')
      .text('Category / Scope', 48, currentY + 6)
      .text('Budget Limit', 200, currentY + 6, { width: 90, align: 'right' })
      .text('Actual Spent', 300, currentY + 6, { width: 80, align: 'right' })
      .text('Remaining', 390, currentY + 6, { width: 80, align: 'right' })
      .text('Consumed', 480, currentY + 6, { width: 65, align: 'right' });

    currentY += 20;

    if (budgets.length === 0) {
      doc
        .fontSize(8.5)
        .font('Helvetica')
        .fillColor('#64748B')
        .text('No active budgets configured for this period.', 48, currentY + 6);
      currentY += 20;
    } else {
      budgets.forEach((b, idx) => {
        const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        doc.rect(40, currentY, 515, 18).fill(rowBg);

        const catName = b.categoryId ? (b.categoryId.replace(/^sys-cat-\d+-?/, '') || 'Category') : 'Overall Monthly Cap';
        const limit = this.formatCurrencyPdf(b.limitAmountMinorUnits, b.currency);
        const spent = this.formatCurrencyPdf(b.spentAmountMinorUnits || 0, b.currency);
        const rem = this.formatCurrencyPdf(b.remainingAmountMinorUnits || 0, b.currency);
        const pct = `${b.consumedPercent || 0}%`;

        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#1E293B')
          .text(this.sanitizeText(catName), 48, currentY + 5, { width: 150 })
          .text(limit, 200, currentY + 5, { width: 90, align: 'right' })
          .text(spent, 300, currentY + 5, { width: 80, align: 'right' })
          .text(rem, 390, currentY + 5, { width: 80, align: 'right' })
          .fillColor((b.consumedPercent || 0) > 100 ? '#EF4444' : '#10B981')
          .text(pct, 480, currentY + 5, { width: 65, align: 'right' });

        currentY += 18;
      });
    }

    // ==========================================
    // 5. Category Breakdown Table
    // ==========================================
    currentY += 15;

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#0F172A')
      .text('EXPENSE CATEGORY DISTRIBUTION', 40, currentY);

    currentY += 16;

    doc.rect(40, currentY, 515, 20).fill('#F1F5F9');
    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .fillColor('#334155')
      .text('Category', 48, currentY + 6)
      .text('Txn Count', 250, currentY + 6, { width: 60, align: 'center' })
      .text('Total Spent', 330, currentY + 6, { width: 90, align: 'right' })
      .text('Share of Expenses', 440, currentY + 6, { width: 105, align: 'right' });

    currentY += 20;

    if (categoryBreakdown.length === 0) {
      doc
        .fontSize(8.5)
        .font('Helvetica')
        .fillColor('#64748B')
        .text('No expense records logged for this period.', 48, currentY + 6);
      currentY += 20;
    } else {
      categoryBreakdown.forEach((cb, idx) => {
        const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        doc.rect(40, currentY, 515, 18).fill(rowBg);

        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#1E293B')
          .text(this.sanitizeText(cb.categoryName), 48, currentY + 5, { width: 190 })
          .text(`${cb.transactionCount}`, 250, currentY + 5, { width: 60, align: 'center' })
          .text(this.formatCurrencyPdf(cb.amountMinorUnits), 330, currentY + 5, { width: 90, align: 'right' })
          .text(`${cb.percentage}%`, 440, currentY + 5, { width: 105, align: 'right' });

        currentY += 18;
      });
    }

    // ==========================================
    // 6. Recent Transaction Ledger
    // ==========================================
    currentY += 15;

    // Check if new page is needed before transactions table
    if (currentY > 640) {
      doc.addPage();
      currentY = 40;
    }

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#0F172A')
      .text('TRANSACTION LEDGER DETAIL', 40, currentY);

    currentY += 16;

    doc.rect(40, currentY, 515, 20).fill('#F1F5F9');
    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .fillColor('#334155')
      .text('Date', 48, currentY + 6)
      .text('Type', 115, currentY + 6)
      .text('Description / Merchant', 170, currentY + 6)
      .text('Status', 380, currentY + 6)
      .text('Amount', 450, currentY + 6, { width: 95, align: 'right' });

    currentY += 20;

    const sampleTxns = transactions.slice(0, 30); // Show up to 30 transactions
    if (sampleTxns.length === 0) {
      doc
        .fontSize(8.5)
        .font('Helvetica')
        .fillColor('#64748B')
        .text('No transactions recorded for this period.', 48, currentY + 6);
      currentY += 20;
    } else {
      sampleTxns.forEach((t, idx) => {
        if (currentY > 760) {
          doc.addPage();
          currentY = 40;
          doc.rect(40, currentY, 515, 20).fill('#F1F5F9');
          doc
            .fontSize(8)
            .font('Helvetica-Bold')
            .fillColor('#334155')
            .text('Date', 48, currentY + 6)
            .text('Type', 115, currentY + 6)
            .text('Description / Merchant', 170, currentY + 6)
            .text('Status', 380, currentY + 6)
            .text('Amount', 450, currentY + 6, { width: 95, align: 'right' });
          currentY += 20;
        }

        const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        doc.rect(40, currentY, 515, 17).fill(rowBg);

        const typeColor = t.type === 'income' ? '#10B981' : t.type === 'expense' ? '#EF4444' : '#6366F1';
        const formattedAmount = `${t.type === 'expense' ? '-' : t.type === 'income' ? '+' : ''}${this.formatCurrencyPdf(t.amountMinorUnits, t.currency)}`;
        const dateStr = t.dateUtc ? t.dateUtc.slice(0, 10) : '';
        const descStr = t.merchantName ? `${t.description} (${t.merchantName})` : t.description;

        doc
          .fontSize(7.5)
          .font('Helvetica')
          .fillColor('#1E293B')
          .text(dateStr, 48, currentY + 4, { width: 65 })
          .fillColor(typeColor)
          .text(t.type.toUpperCase(), 115, currentY + 4, { width: 50 })
          .fillColor('#1E293B')
          .text(this.sanitizeText(descStr), 170, currentY + 4, { width: 200, lineBreak: false })
          .text(t.status, 380, currentY + 4, { width: 60 })
          .fillColor(typeColor)
          .text(formattedAmount, 450, currentY + 4, { width: 95, align: 'right' });

        currentY += 17;
      });
    }

    // ==========================================
    // 7. Footer & Page Numbers
    // ==========================================
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      doc
        .fontSize(7.5)
        .font('Helvetica')
        .fillColor('#94A3B8')
        .text(
          `LumaSpend Financial Engine • Confidential Statement • Page ${i + 1} of ${totalPages}`,
          40,
          800,
          { align: 'center', width: 515 }
        );
    }

    doc.end();
  }
}
