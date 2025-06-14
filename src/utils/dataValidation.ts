/**
 * Data validation utilities for financial data and comparative insights
 * Handles edge cases, null values, and data quality issues
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FinancialValue {
  amount: number;
  currency?: string;
  isValid: boolean;
}

/**
 * Validates if a value is a valid number (not NaN, null, undefined, or Infinity)
 */
export const isValidNumber = (value: any): value is number => {
  return typeof value === 'number' && 
         !isNaN(value) && 
         isFinite(value) && 
         value !== null && 
         value !== undefined;
};

/**
 * Validates if a value is a valid positive number
 */
export const isValidPositiveNumber = (value: any): value is number => {
  return isValidNumber(value) && value >= 0;
};

/**
 * Validates if a value is a valid financial amount
 */
export const isValidFinancialAmount = (value: any): value is number => {
  return isValidNumber(value) && Math.abs(value) < Number.MAX_SAFE_INTEGER;
};

/**
 * Sanitizes a numeric value, returning a safe default if invalid
 */
export const sanitizeNumber = (value: any, defaultValue: number = 0): number => {
  if (isValidNumber(value)) {
    return value;
  }
  return defaultValue;
};

/**
 * Sanitizes a financial amount with bounds checking
 */
export const sanitizeFinancialAmount = (value: any, defaultValue: number = 0): number => {
  const sanitized = sanitizeNumber(value, defaultValue);
  
  // Clamp to reasonable financial bounds
  const MAX_AMOUNT = 1e12; // 1 trillion
  const MIN_AMOUNT = -1e12;
  
  if (sanitized > MAX_AMOUNT) return MAX_AMOUNT;
  if (sanitized < MIN_AMOUNT) return MIN_AMOUNT;
  
  return sanitized;
};

/**
 * Validates financial data structure
 */
export const validateFinancialData = (data: any): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (!data) {
    result.isValid = false;
    result.errors.push('Financial data is null or undefined');
    return result;
  }

  // Check for required numeric fields
  const numericFields = ['current', 'previous', 'absoluteDifference', 'percentageChange'];
  
  for (const field of numericFields) {
    if (data[field] !== undefined && !isValidNumber(data[field])) {
      result.errors.push(`Invalid ${field}: ${data[field]}`);
      result.isValid = false;
    }
  }

  // Check for extreme values
  if (isValidNumber(data.percentageChange) && Math.abs(data.percentageChange) > 10000) {
    result.warnings.push(`Extreme percentage change detected: ${data.percentageChange}%`);
  }

  if (isValidNumber(data.absoluteDifference) && Math.abs(data.absoluteDifference) > 1e10) {
    result.warnings.push(`Very large absolute difference: ${data.absoluteDifference}`);
  }

  return result;
};

/**
 * Validates comparative insights data structure
 */
export const validateComparativeData = (data: any): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (!data) {
    result.isValid = false;
    result.errors.push('Comparative data is null or undefined');
    return result;
  }

  // Validate month-over-month data
  if (data.monthOverMonth) {
    const categories = ['income', 'expenses', 'balance'];
    
    for (const category of categories) {
      if (data.monthOverMonth[category]) {
        const validation = validateFinancialData(data.monthOverMonth[category]);
        result.errors.push(...validation.errors.map(e => `Month-over-month ${category}: ${e}`));
        result.warnings.push(...validation.warnings.map(w => `Month-over-month ${category}: ${w}`));
        
        if (!validation.isValid) {
          result.isValid = false;
        }
      }
    }
  }

  // Validate year-over-year data
  if (data.yearOverYear) {
    const categories = ['income', 'expenses', 'balance'];
    
    for (const category of categories) {
      if (data.yearOverYear[category]) {
        const validation = validateFinancialData(data.yearOverYear[category]);
        result.errors.push(...validation.errors.map(e => `Year-over-year ${category}: ${e}`));
        result.warnings.push(...validation.warnings.map(w => `Year-over-year ${category}: ${w}`));
        
        if (!validation.isValid) {
          result.isValid = false;
        }
      }
    }
  }

  return result;
};

/**
 * Validates date range for financial calculations
 */
export const validateDateRange = (startDate: Date, endDate: Date): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (!startDate || !endDate) {
    result.isValid = false;
    result.errors.push('Start date and end date are required');
    return result;
  }

  if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
    result.isValid = false;
    result.errors.push('Invalid date objects provided');
    return result;
  }

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    result.isValid = false;
    result.errors.push('Invalid date values');
    return result;
  }

  if (startDate >= endDate) {
    result.isValid = false;
    result.errors.push('Start date must be before end date');
    return result;
  }

  return result;
};

/**
 * Validates currency code
 */
export const validateCurrencyCode = (currency: string): boolean => {
  if (!currency || typeof currency !== 'string') {
    return false;
  }

  // Basic currency code validation (3 letter codes)
  const currencyRegex = /^[A-Z]{3}$/;
  return currencyRegex.test(currency);
};

/**
 * Checks if there's sufficient data for comparative analysis
 */
export const hasSufficientDataForComparison = (
  currentPeriodData: any[],
  previousPeriodData: any[],
  minTransactions: number = 1
): boolean => {
  return (
    Array.isArray(currentPeriodData) &&
    Array.isArray(previousPeriodData) &&
    currentPeriodData.length >= minTransactions &&
    previousPeriodData.length >= minTransactions
  );
};

/**
 * Calculates data quality score (0-1)
 */
export const calculateDataQualityScore = (data: any): number => {
  let score = 1.0;
  const validation = validateComparativeData(data);

  // Reduce score for errors
  score -= validation.errors.length * 0.2;

  // Reduce score for warnings
  score -= validation.warnings.length * 0.1;

  // Check data availability
  if (data?.monthOverMonth) {
    const categories = ['income', 'expenses', 'balance'];
    const availableCategories = categories.filter(cat => 
      data.monthOverMonth[cat]?.dataAvailable
    );
    
    if (availableCategories.length < categories.length) {
      score -= (categories.length - availableCategories.length) * 0.1;
    }
  }

  return Math.max(0, Math.min(1, score));
};

export default {
  isValidNumber,
  isValidPositiveNumber,
  isValidFinancialAmount,
  sanitizeNumber,
  sanitizeFinancialAmount,
  validateFinancialData,
  validateComparativeData,
  validateDateRange,
  validateCurrencyCode,
  hasSufficientDataForComparison,
  calculateDataQualityScore
}; 