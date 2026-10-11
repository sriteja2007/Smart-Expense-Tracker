import { createWorker } from 'tesseract.js';
import type { CurrencyCode, ReceiptScanResult } from '@lumaspend/shared';
import fs from 'fs/promises';

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

export class ReceiptOcrService {
  private static readonly MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
  private static readonly ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ]);

  /**
   * Validates file size, MIME type and magic byte signatures to prevent extension spoofing.
   */
  public static validateImageBuffer(buffer: Buffer, mimeType: string): FileValidationResult {
    if (!buffer || buffer.length === 0) {
      return { isValid: false, error: 'Empty file provided' };
    }

    if (buffer.length > this.MAX_FILE_SIZE_BYTES) {
      return {
        isValid: false,
        error: `File size exceeds maximum allowed limit of ${this.MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`
      };
    }

    const normalizedMime = mimeType.toLowerCase();
    if (!this.ALLOWED_MIME_TYPES.has(normalizedMime)) {
      return {
        isValid: false,
        error: `Unsupported file format: ${mimeType}. Please upload a JPEG, PNG, or WebP image.`
      };
    }

    // Inspect Magic Bytes
    // JPEG: FF D8 FF
    // PNG: 89 50 4E 47
    // WebP: 52 49 46 46 (RIFF) ... 57 45 42 50 (WEBP)
    const isJpeg = buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng =
      buffer.length > 4 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47;
    const isWebp =
      buffer.length > 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50;

    if (!isJpeg && !isPng && !isWebp) {
      return {
        isValid: false,
        error: 'File contents do not match a valid JPEG, PNG, or WebP image signature'
      };
    }

    return { isValid: true };
  }

  /**
   * Performs OCR extraction using Tesseract.js worker with automated cleanup.
   */
  public static async scanReceipt(
    imageBuffer: Buffer,
    defaultCurrency: CurrencyCode = 'INR',
    tempFilePath?: string
  ): Promise<ReceiptScanResult> {
    let worker: any = null;

    try {
      // 1. Initialize worker
      worker = await createWorker('eng');

      // 2. Perform OCR recognition with decode error protection
      let data: any;
      try {
        const result = await worker.recognize(imageBuffer);
        data = result.data;
      } catch (ocrErr) {
        return {
          candidateCurrency: defaultCurrency,
          confidenceScore: 0,
          isReadable: false,
          warning: 'Receipt image could not be decoded. The image file may be damaged or unreadable.'
        };
      }

      const rawText = data?.text || '';
      const confidence = Math.round(data?.confidence || 0);

      // 3. Process candidate fields
      const lines = rawText
        .split('\n')
        .map((l: string) => l.trim())
        .filter((l: string) => l.length > 0);

      if (lines.length === 0 || confidence < 20) {
        return {
          candidateCurrency: defaultCurrency,
          confidenceScore: confidence,
          isReadable: false,
          warning: 'Receipt image could not be transcribed clearly. Please enter transaction details manually or upload a clearer receipt photo.'
        };
      }

      const merchant = this.extractMerchant(lines);
      const { amountMinorUnits, currency } = this.extractTotalAmount(lines, defaultCurrency);
      const dateUtc = this.extractDate(lines);
      const suggestedCategory = this.suggestCategory(merchant, rawText);

      const isReadable = confidence >= 40 && (!!merchant || amountMinorUnits !== undefined);

      let warning: string | undefined;
      if (confidence < 60) {
        warning = 'Low OCR confidence detected. Please carefully verify the extracted merchant and amount before confirming.';
      } else if (!amountMinorUnits) {
        warning = 'Total amount could not be definitively extracted from receipt lines. Please input the correct amount.';
      }

      return {
        candidateMerchant: merchant,
        candidateDateUtc: dateUtc,
        candidateAmountMinorUnits: amountMinorUnits,
        candidateCurrency: currency,
        suggestedCategoryId: suggestedCategory,
        confidenceScore: confidence,
        isReadable,
        rawTextPreview: lines.slice(0, 5).join(' | '),
        warning
      };
    } finally {
      // Cleanup worker
      if (worker) {
        try {
          await worker.terminate();
        } catch {
          // ignore termination errors
        }
      }

      // Cleanup any temporary file on disk if created
      if (tempFilePath) {
        try {
          await fs.unlink(tempFilePath);
        } catch {
          // ignore file cleanup errors
        }
      }
    }
  }

  /**
   * Candidate Merchant Extraction Heuristics
   */
  private static extractMerchant(lines: string[]): string | undefined {
    const ignoreKeywords = [
      'tax invoice',
      'invoice',
      'receipt',
      'cash receipt',
      'bill',
      'retail invoice',
      'welcome',
      'customer copy',
      'merchant copy',
      'gstin',
      'fssai',
      'tel:',
      'phone:',
      'date:',
      'time:'
    ];

    for (let i = 0; i < Math.min(6, lines.length); i++) {
      const line = lines[i];
      if (!line) continue;
      const lower = line.toLowerCase();
      if (line.length < 3) continue;
      if (ignoreKeywords.some((k) => lower.includes(k))) continue;
      if (/^\d+$/.test(line)) continue; // Pure numbers

      // Clean line from punctuation
      const cleaned = line.replace(/[^\w\s&'-]/g, '').trim();
      if (cleaned.length >= 3 && cleaned.length <= 50) {
        return cleaned;
      }
    }
    return undefined;
  }

  /**
   * Candidate Amount and Currency Extraction Heuristics
   */
  private static extractTotalAmount(
    lines: string[],
    fallbackCurrency: CurrencyCode
  ): { amountMinorUnits?: number; currency: CurrencyCode } {
    let detectedCurrency: CurrencyCode = fallbackCurrency;

    // Detect currency from text
    const fullText = lines.join(' ');
    if (fullText.includes('$')) detectedCurrency = 'USD';
    else if (fullText.includes('€')) detectedCurrency = 'EUR';
    else if (fullText.includes('£')) detectedCurrency = 'GBP';
    else if (fullText.includes('₹') || fullText.includes('INR') || fullText.includes('Rs')) detectedCurrency = 'INR';

    // Patterns matching totals
    const totalKeywords = [
      /total\s*[:=]?\s*[^\d]*(\d+[\d,]*\.\d{2})/i,
      /grand\s*total\s*[:=]?\s*[^\d]*(\d+[\d,]*\.\d{2})/i,
      /net\s*amount\s*[:=]?\s*[^\d]*(\d+[\d,]*\.\d{2})/i,
      /amount\s*paid\s*[:=]?\s*[^\d]*(\d+[\d,]*\.\d{2})/i,
      /balance\s*due\s*[:=]?\s*[^\d]*(\d+[\d,]*\.\d{2})/i,
      /bill\s*amount\s*[:=]?\s*[^\d]*(\d+[\d,]*\.\d{2})/i,
      /total\s*[:=]?\s*[^\d]*(\d+[\d,]*)/i
    ];

    // Scan lines from bottom to top for total keywords
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (!line) continue;
      for (const pattern of totalKeywords) {
        const match = line.match(pattern);
        if (match && match[1]) {
          const numStr = match[1].replace(/,/g, '');
          const val = parseFloat(numStr);
          if (!isNaN(val) && val > 0) {
            const minorUnits = Math.round(val * 100);
            return { amountMinorUnits: minorUnits, currency: detectedCurrency };
          }
        }
      }
    }

    // Fallback: look for lines containing "total" and any numbers
    for (let i = lines.length - 1; i >= 0; i--) {
      const rawLine = lines[i];
      if (!rawLine) continue;
      const line = rawLine.toLowerCase();
      if (line.includes('total') || line.includes('paid')) {
        const numbers = line.match(/(\d+[\d,]*\.\d{2})/g);
        if (numbers && numbers.length > 0) {
          const numItem = numbers[numbers.length - 1];
          if (numItem) {
            const lastNum = parseFloat(numItem.replace(/,/g, ''));
            if (!isNaN(lastNum) && lastNum > 0) {
              return { amountMinorUnits: Math.round(lastNum * 100), currency: detectedCurrency };
            }
          }
        }
      }
    }

    return { currency: detectedCurrency };
  }

  /**
   * Candidate Date Extraction Heuristics
   */
  private static extractDate(lines: string[]): string | undefined {
    // DD/MM/YYYY or DD-MM-YYYY or YYYY-MM-DD
    const datePatterns = [
      /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b/,
      /\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/,
      /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})\b/,
      /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})\b/i
    ];

    for (const line of lines) {
      for (const pattern of datePatterns) {
        const match = line.match(pattern);
        if (match) {
          try {
            const parsed = new Date(match[0]);
            if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2020 && parsed.getFullYear() <= 2030) {
              return parsed.toISOString();
            }
          } catch {
            // continue searching
          }
        }
      }
    }
    return undefined;
  }

  /**
   * Category Suggestion Heuristics
   */
  private static suggestCategory(merchant?: string, fullText?: string): string | undefined {
    const text = `${merchant || ''} ${fullText || ''}`.toLowerCase();

    if (
      text.includes('grocery') ||
      text.includes('blinkit') ||
      text.includes('zepto') ||
      text.includes('mart') ||
      text.includes('supermarket') ||
      text.includes('vegetable') ||
      text.includes('fruit') ||
      text.includes('milk')
    ) {
      return 'Groceries';
    }

    if (
      text.includes('restaurant') ||
      text.includes('cafe') ||
      text.includes('coffee') ||
      text.includes('swiggy') ||
      text.includes('zomato') ||
      text.includes('food') ||
      text.includes('bakery') ||
      text.includes('kitchen') ||
      text.includes('pizza') ||
      text.includes('burger')
    ) {
      return 'Dining & Food';
    }

    if (
      text.includes('fuel') ||
      text.includes('petrol') ||
      text.includes('diesel') ||
      text.includes('shell') ||
      text.includes('uber') ||
      text.includes('ola') ||
      text.includes('metro') ||
      text.includes('parking')
    ) {
      return 'Transportation';
    }

    if (
      text.includes('pharmacy') ||
      text.includes('medical') ||
      text.includes('hospital') ||
      text.includes('clinic') ||
      text.includes('apollo')
    ) {
      return 'Healthcare';
    }

    if (
      text.includes('amazon') ||
      text.includes('flipkart') ||
      text.includes('clothing') ||
      text.includes('apparel') ||
      text.includes('electronics')
    ) {
      return 'Shopping';
    }

    return undefined;
  }
}
