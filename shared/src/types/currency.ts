export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'AED' | 'CAD' | 'AUD' | 'SGD';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  decimalDigits: number;
  symbolPosition: 'before' | 'after';
  spaceAfterSymbol: boolean;
  locale: string;
}

export const DEFAULT_CURRENCY: CurrencyCode = 'INR';

export const SUPPORTED_CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    decimalDigits: 2,
    symbolPosition: 'before',
    spaceAfterSymbol: false,
    locale: 'en-IN'
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    decimalDigits: 2,
    symbolPosition: 'before',
    spaceAfterSymbol: false,
    locale: 'en-US'
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    decimalDigits: 2,
    symbolPosition: 'before',
    spaceAfterSymbol: false,
    locale: 'de-DE'
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    decimalDigits: 2,
    symbolPosition: 'before',
    spaceAfterSymbol: false,
    locale: 'en-GB'
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    name: 'Japanese Yen',
    decimalDigits: 0,
    symbolPosition: 'before',
    spaceAfterSymbol: false,
    locale: 'ja-JP'
  },
  AED: {
    code: 'AED',
    symbol: 'AED',
    name: 'UAE Dirham',
    decimalDigits: 2,
    symbolPosition: 'before',
    spaceAfterSymbol: true,
    locale: 'en-AE'
  },
  CAD: {
    code: 'CAD',
    symbol: 'CA$',
    name: 'Canadian Dollar',
    decimalDigits: 2,
    symbolPosition: 'before',
    spaceAfterSymbol: false,
    locale: 'en-CA'
  },
  AUD: {
    code: 'AUD',
    symbol: 'AU$',
    name: 'Australian Dollar',
    decimalDigits: 2,
    symbolPosition: 'before',
    spaceAfterSymbol: false,
    locale: 'en-AU'
  },
  SGD: {
    code: 'SGD',
    symbol: 'SG$',
    name: 'Singapore Dollar',
    decimalDigits: 2,
    symbolPosition: 'before',
    spaceAfterSymbol: false,
    locale: 'en-SG'
  }
};

/**
 * Format a number amount into a localized currency string.
 * Defaults to INR (₹) formatting.
 */
export function formatCurrency(
  amount: number,
  currency: CurrencyCode = DEFAULT_CURRENCY
): string {
  const config = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.INR;
  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.code,
      minimumFractionDigits: config.decimalDigits,
      maximumFractionDigits: config.decimalDigits
    }).format(amount);
  } catch {
    return `${config.symbol}${amount.toFixed(config.decimalDigits)}`;
  }
}
