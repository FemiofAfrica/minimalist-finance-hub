/**
 * Safe currency formatting utilities to prevent "NGNNaN" and other display issues
 */

import { isValidNumber } from './dataValidation';

/**
 * Safely formats a currency value, handling NaN, Infinity, and other edge cases
 */
export const formatCurrencySafe = (
  amount: number | null | undefined,
  currency: string = 'NGN',
  locale: string = 'en-NG'
): string => {
  // Handle null, undefined, or invalid numbers
  if (amount === null || amount === undefined || !isValidNumber(amount)) {
    return 'N/A';
  }

  try {
    // Use Intl.NumberFormat for proper currency formatting
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    return formatter.format(amount);
  } catch (error) {
    // Fallback formatting if Intl.NumberFormat fails
    console.warn('Currency formatting failed, using fallback:', error);
    
    const sign = amount < 0 ? '-' : '';
    const absAmount = Math.abs(amount);
    
    // Basic number formatting with commas
    const formatted = absAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    // Return with currency symbol
    if (currency === 'NGN') {
      return `${sign}₦${formatted}`;
    } else if (currency === 'USD') {
      return `${sign}$${formatted}`;
    } else {
      return `${sign}${currency} ${formatted}`;
    }
  }
};

/**
 * Formats percentage values safely
 */
export const formatPercentageSafe = (
  percentage: number | null | undefined,
  decimals: number = 1
): string => {
  if (percentage === null || percentage === undefined || !isValidNumber(percentage)) {
    return '0.0%';
  }

  // Cap extreme percentages for display
  const MAX_DISPLAY = 999999;
  const MIN_DISPLAY = -999999;
  
  let displayValue = percentage;
  if (percentage > MAX_DISPLAY) {
    displayValue = MAX_DISPLAY;
  } else if (percentage < MIN_DISPLAY) {
    displayValue = MIN_DISPLAY;
  }

  return `${displayValue.toFixed(decimals)}%`;
};

/**
 * Formats large numbers with appropriate suffixes (K, M, B)
 */
export const formatNumberCompact = (
  amount: number | null | undefined,
  currency?: string
): string => {
  if (amount === null || amount === undefined || !isValidNumber(amount)) {
    return 'N/A';
  }

  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  
  let formatted: string;
  let suffix = '';

  if (absAmount >= 1e9) {
    formatted = (absAmount / 1e9).toFixed(1);
    suffix = 'B';
  } else if (absAmount >= 1e6) {
    formatted = (absAmount / 1e6).toFixed(1);
    suffix = 'M';
  } else if (absAmount >= 1e3) {
    formatted = (absAmount / 1e3).toFixed(1);
    suffix = 'K';
  } else {
    formatted = absAmount.toFixed(0);
  }

  const result = `${sign}${formatted}${suffix}`;
  
  if (currency) {
    if (currency === 'NGN') {
      return `₦${result}`;
    } else if (currency === 'USD') {
      return `$${result}`;
    } else {
      return `${currency} ${result}`;
    }
  }
  
  return result;
};

/**
 * Validates and sanitizes currency input
 */
export const sanitizeCurrencyInput = (
  value: string | number | null | undefined
): number => {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === 'number') {
    return isValidNumber(value) ? value : 0;
  }

  if (typeof value === 'string') {
    // Remove currency symbols and commas
    const cleaned = value.replace(/[₦$,\s]/g, '');
    const parsed = parseFloat(cleaned);
    return isValidNumber(parsed) ? parsed : 0;
  }

  return 0;
};

export default {
  formatCurrencySafe,
  formatPercentageSafe,
  formatNumberCompact,
  sanitizeCurrencyInput
}; 