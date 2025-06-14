/**
 * Safe mathematical operations for financial calculations
 * Prevents division by zero, NaN results, and other edge cases
 */

import { isValidNumber, sanitizeNumber } from './dataValidation';

export interface SafeCalculationResult {
  value: number;
  isValid: boolean;
  error?: string;
}

/**
 * Safe division that handles division by zero
 */
export const safeDivide = (
  numerator: number, 
  denominator: number, 
  defaultValue: number = 0
): SafeCalculationResult => {
  // Validate inputs
  if (!isValidNumber(numerator) || !isValidNumber(denominator)) {
    return {
      value: defaultValue,
      isValid: false,
      error: 'Invalid input values for division'
    };
  }

  // Handle division by zero
  if (denominator === 0) {
    return {
      value: defaultValue,
      isValid: false,
      error: 'Division by zero'
    };
  }

  // Handle very small denominators that could cause precision issues
  if (Math.abs(denominator) < 1e-10) {
    return {
      value: defaultValue,
      isValid: false,
      error: 'Denominator too small for reliable calculation'
    };
  }

  const result = numerator / denominator;

  // Check for invalid results
  if (!isValidNumber(result)) {
    return {
      value: defaultValue,
      isValid: false,
      error: 'Division resulted in invalid number'
    };
  }

  return {
    value: result,
    isValid: true
  };
};

/**
 * Safe percentage calculation
 */
export const safePercentageChange = (
  current: number,
  previous: number,
  defaultValue: number = 0
): SafeCalculationResult => {
  // Validate inputs
  if (!isValidNumber(current) || !isValidNumber(previous)) {
    return {
      value: defaultValue,
      isValid: false,
      error: 'Invalid input values for percentage calculation'
    };
  }

  // Handle case where previous value is zero
  if (previous === 0) {
    if (current === 0) {
      return {
        value: 0,
        isValid: true
      };
    } else {
      // When previous is 0 and current is not, we can't calculate meaningful percentage
      // Return a large value to indicate significant change
      return {
        value: current > 0 ? 999999 : -999999,
        isValid: false,
        error: 'Cannot calculate percentage change from zero base value'
      };
    }
  }

  const division = safeDivide(current - previous, Math.abs(previous), defaultValue);
  
  if (!division.isValid) {
    return {
      value: defaultValue,
      isValid: false,
      error: `Percentage calculation failed: ${division.error}`
    };
  }

  const percentage = division.value * 100;

  // Cap extreme percentages for display purposes
  const MAX_PERCENTAGE = 999999;
  const MIN_PERCENTAGE = -999999;

  let cappedPercentage = percentage;
  if (percentage > MAX_PERCENTAGE) {
    cappedPercentage = MAX_PERCENTAGE;
  } else if (percentage < MIN_PERCENTAGE) {
    cappedPercentage = MIN_PERCENTAGE;
  }

  return {
    value: cappedPercentage,
    isValid: true
  };
};

/**
 * Safe absolute difference calculation
 */
export const safeAbsoluteDifference = (
  current: number,
  previous: number,
  defaultValue: number = 0
): SafeCalculationResult => {
  // Validate inputs
  if (!isValidNumber(current) || !isValidNumber(previous)) {
    return {
      value: defaultValue,
      isValid: false,
      error: 'Invalid input values for absolute difference calculation'
    };
  }

  const difference = current - previous;

  if (!isValidNumber(difference)) {
    return {
      value: defaultValue,
      isValid: false,
      error: 'Subtraction resulted in invalid number'
    };
  }

  return {
    value: difference,
    isValid: true
  };
};

/**
 * Safe currency formatting that handles NaN and invalid values
 */
export const safeCurrencyFormat = (
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string => {
  // Handle invalid amounts
  if (!isValidNumber(amount)) {
    return 'N/A';
  }

  try {
    // Use Intl.NumberFormat for safe currency formatting
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    return formatter.format(amount);
  } catch (error) {
    // Fallback to basic formatting if Intl fails
    const sign = amount < 0 ? '-' : '';
    const absAmount = Math.abs(amount);
    
    // Basic number formatting with commas
    const formatted = absAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    return `${sign}${currency} ${formatted}`;
  }
};

/**
 * Safe trend calculation
 */
export const safeTrendDirection = (
  current: number,
  previous: number,
  threshold: number = 0.01
): 'up' | 'down' | 'stable' => {
  // Validate inputs
  if (!isValidNumber(current) || !isValidNumber(previous)) {
    return 'stable';
  }

  const difference = current - previous;
  const percentageChange = safePercentageChange(current, previous);

  if (!percentageChange.isValid) {
    // If we can't calculate percentage, use absolute difference
    if (Math.abs(difference) < threshold) {
      return 'stable';
    }
    return difference > 0 ? 'up' : 'down';
  }

  const absPercentage = Math.abs(percentageChange.value);
  
  // Use percentage threshold for trend determination
  if (absPercentage < threshold * 100) {
    return 'stable';
  }

  return percentageChange.value > 0 ? 'up' : 'down';
};

/**
 * Safe calculation of comparative metrics
 */
export const safeComparativeCalculation = (
  current: number,
  previous: number
) => {
  const sanitizedCurrent = sanitizeNumber(current, 0);
  const sanitizedPrevious = sanitizeNumber(previous, 0);

  const absoluteDiff = safeAbsoluteDifference(sanitizedCurrent, sanitizedPrevious);
  const percentageChange = safePercentageChange(sanitizedCurrent, sanitizedPrevious);
  const trend = safeTrendDirection(sanitizedCurrent, sanitizedPrevious);

  return {
    current: sanitizedCurrent,
    previous: sanitizedPrevious,
    absoluteDifference: absoluteDiff.value,
    percentageChange: percentageChange.value,
    trend,
    dataAvailable: absoluteDiff.isValid && percentageChange.isValid,
    calculationErrors: [
      ...(absoluteDiff.error ? [absoluteDiff.error] : []),
      ...(percentageChange.error ? [percentageChange.error] : [])
    ]
  };
};

/**
 * Validates and sanitizes financial calculation inputs
 */
export const validateCalculationInputs = (values: number[]): {
  sanitized: number[];
  hasErrors: boolean;
  errors: string[];
} => {
  const result = {
    sanitized: [] as number[],
    hasErrors: false,
    errors: [] as string[]
  };

  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    
    if (!isValidNumber(value)) {
      result.hasErrors = true;
      result.errors.push(`Invalid value at index ${i}: ${value}`);
      result.sanitized.push(0);
    } else {
      result.sanitized.push(value);
    }
  }

  return result;
};

export default {
  safeDivide,
  safePercentageChange,
  safeAbsoluteDifference,
  safeCurrencyFormat,
  safeTrendDirection,
  safeComparativeCalculation,
  validateCalculationInputs
}; 