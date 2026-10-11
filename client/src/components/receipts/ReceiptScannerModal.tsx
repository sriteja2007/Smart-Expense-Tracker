import React, { useState, useRef } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { useToast } from '@/components/ui/toast';
import { FinancialApi } from '@/lib/financial-api';
import {
  toMinorUnits,
  fromMinorUnits,
  type FinancialAccount,
  type FinancialCategory,
  type CurrencyCode,
  type ReceiptScanResult
} from '@lumaspend/shared';

interface ReceiptScannerModalProps {
  open: boolean;
  onClose: () => void;
  accounts: FinancialAccount[];
  categories: FinancialCategory[];
  currency: CurrencyCode;
  onTransactionCreated: () => void;
}

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  open,
  onClose,
  accounts,
  categories,
  currency,
  onTransactionCreated
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload & Scan state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ReceiptScanResult | null>(null);

  // Review Form state
  const [formMerchant, setFormMerchant] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formAccountId, setFormAccountId] = useState(accounts[0]?.id || '');
  const [formNotes, setFormNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const resetState = () => {
    setSelectedFile(null);
    if (previewUrl && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setScanResult(null);
    setFormMerchant('');
    setFormAmount('');
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormCategoryId('');
    if (accounts[0]) setFormAccountId(accounts[0].id);
    setFormNotes('');
    setIsScanning(false);
    setIsSaving(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Receipt image must be smaller than 5 MB',
        type: 'error'
      });
      return;
    }

    setSelectedFile(file);
    if (typeof URL.createObjectURL === 'function') {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl('mock-preview-url');
    }
    setScanResult(null);
  };

  const handleScan = async () => {
    if (!selectedFile) return;

    try {
      setIsScanning(true);
      const result = await FinancialApi.scanReceipt(selectedFile);
      setScanResult(result);

      // Pre-fill review form with extracted candidates
      if (result.candidateMerchant) {
        setFormMerchant(result.candidateMerchant);
      }
      if (result.candidateAmountMinorUnits) {
        const major = fromMinorUnits(result.candidateAmountMinorUnits, result.candidateCurrency || currency);
        setFormAmount(major.toString());
      }
      if (result.candidateDateUtc) {
        setFormDate(result.candidateDateUtc.slice(0, 10));
      }

      // Try matching suggested category
      if (result.suggestedCategoryId) {
        const matched = categories.find(
          (c) => c.name.toLowerCase() === result.suggestedCategoryId?.toLowerCase()
        );
        if (matched) setFormCategoryId(matched.id);
      } else if (categories[0]) {
        setFormCategoryId(categories[0].id);
      }

      if (result.warning) {
        toast({
          title: 'Review Extracted Receipt',
          description: result.warning,
          type: 'warning'
        });
      } else {
        toast({
          title: 'Receipt Scanned Successfully',
          description: `Extracted with ${result.confidenceScore}% confidence. Review before saving.`,
          type: 'success'
        });
      }
    } catch (err) {
      toast({
        title: 'OCR Scanning Failed',
        description: err instanceof Error ? err.message : 'Please check image and try again',
        type: 'error'
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleConfirmTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(formAmount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid expense amount',
        type: 'error'
      });
      return;
    }

    if (!formAccountId) {
      toast({
        title: 'Account required',
        description: 'Please select an account for this transaction',
        type: 'error'
      });
      return;
    }

    try {
      setIsSaving(true);
      const minorUnits = toMinorUnits(parsedAmount, currency);

      await FinancialApi.createTransaction({
        type: 'expense',
        amountMinorUnits: minorUnits,
        currency,
        sourceAccountId: formAccountId,
        categoryId: formCategoryId || undefined,
        description: formMerchant.trim() ? `${formMerchant.trim()} (Receipt)` : 'Scanned Receipt Expense',
        merchantName: formMerchant.trim() || undefined,
        dateUtc: new Date(formDate).toISOString(),
        paymentMethod: 'other',
        tags: ['receipt-ocr'],
        notes: formNotes.trim() || (scanResult?.confidenceScore ? `OCR Scanned (${scanResult.confidenceScore}% confidence)` : undefined)
      });

      toast({
        title: 'Expense Recorded',
        description: 'Transaction created successfully from receipt.',
        type: 'success'
      });

      onTransactionCreated();
      resetState();
      onClose();
    } catch (err) {
      toast({
        title: 'Failed to create transaction',
        description: err instanceof Error ? err.message : 'Please check your inputs',
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        resetState();
        onClose();
      }}
      title="Receipt OCR Scanner"
      description="Scan paper bills, invoices, or digital receipts with Tesseract OCR and verify details before saving"
    >
      <div className="space-y-4 pt-2">
        {/* Step 1: Upload & Image Preview */}
        {!scanResult ? (
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/15 hover:border-brand-violet/50 rounded-2xl p-6 text-center cursor-pointer transition-all bg-white/[0.02] hover:bg-brand-violet/[0.04]"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
                aria-label="Upload receipt image"
              />

              {previewUrl ? (
                <div className="space-y-3">
                  <img
                    src={previewUrl}
                    alt="Receipt Preview"
                    className="max-h-48 mx-auto rounded-xl object-contain border border-white/10 shadow-lg"
                  />
                  <p className="text-xs text-brand-glow font-medium">Click to select a different image</p>
                </div>
              ) : (
                <div className="space-y-2 py-4">
                  <div className="h-12 w-12 rounded-2xl bg-brand-violet/10 border border-brand-violet/20 flex items-center justify-center mx-auto text-brand-violet">
                    <Icons.Camera className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Upload Receipt Photo</p>
                    <p className="text-[11px] text-text-muted mt-0.5">JPEG, PNG, or WebP up to 5 MB</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleScan}
                disabled={!selectedFile || isScanning}
              >
                <Icons.AI className="h-3.5 w-3.5 mr-1" />
                {isScanning ? 'Transcribing Receipt...' : 'Scan with OCR'}
              </Button>
            </div>
          </div>
        ) : (
          /* Step 2: Verification & Review Form */
          <form onSubmit={handleConfirmTransaction} className="space-y-3">
            {/* Confidence Banner */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-elevated/70 border border-white/10 text-xs">
              <div className="flex items-center gap-2">
                <Icons.AI className="h-4 w-4 text-brand-glow" />
                <span className="text-text-secondary">Extracted Candidate Values</span>
              </div>
              <Badge
                variant={scanResult.confidenceScore >= 60 ? 'success' : 'warning'}
                className="text-[10px]"
              >
                OCR Confidence: {scanResult.confidenceScore}%
              </Badge>
            </div>

            {scanResult.warning && (
              <p className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl">
                ⚠️ {scanResult.warning}
              </p>
            )}

            {/* Merchant */}
            <div>
              <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                Merchant / Store Name
              </label>
              <Input
                placeholder="e.g. Blinkit, Starbucks, Shell"
                value={formMerchant}
                onChange={(e) => setFormMerchant(e.target.value)}
                required
                className="bg-surface-elevated text-xs"
              />
            </div>

            {/* Amount & Date Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                  Amount ({currency})
                </label>
                <Input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  required
                  className="bg-surface-elevated text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                  Transaction Date
                </label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                  className="bg-surface-elevated text-xs text-white"
                />
              </div>
            </div>

            {/* Account & Category Selection */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                  Paid From Account
                </label>
                <select
                  aria-label="Select Account"
                  value={formAccountId}
                  onChange={(e) => setFormAccountId(e.target.value)}
                  required
                  className="w-full bg-surface-elevated border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                  Category
                </label>
                <select
                  aria-label="Select Category"
                  value={formCategoryId}
                  onChange={(e) => setFormCategoryId(e.target.value)}
                  className="w-full bg-surface-elevated border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="">General Expense</option>
                  {categories
                    .filter((c) => c.type === 'expense')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                Notes (Optional)
              </label>
              <Input
                placeholder="Additional details..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="bg-surface-elevated text-xs"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-white/5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setScanResult(null)}
                className="text-xs text-text-muted hover:text-white"
              >
                Scan Another Receipt
              </Button>

              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSaving}
                  className="text-xs"
                >
                  <Icons.Check className="h-3.5 w-3.5 mr-1" />
                  {isSaving ? 'Saving...' : 'Confirm & Create Transaction'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </Dialog>
  );
};
