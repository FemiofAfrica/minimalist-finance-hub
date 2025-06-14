import { describe, it, expect } from 'vitest';
import {
  isValidNumber,
  sanitizeNumber,
  validateFinancialData,
  validateComparativeData,
  hasSufficientDataForComparison,
  calculateDataQualityScore
} from '@/utils/dataValidation';

describe('Data Validation Utilities', () => {
  describe('isValidNumber', () => {
    it('should return true for valid numbers', () => {
      expect(isValidNumber(0)).toBe(true);
      expect(isValidNumber(42)).toBe(true);
      expect(isValidNumber(-42)).toBe(true);
      expect(isValidNumber(3.14159)).toBe(true);
      expect(isValidNumber(1e10)).toBe(true);
    });

    it('should return false for invalid values', () => {
      expect(isValidNumber(NaN)).toBe(false);
      expect(isValidNumber(Infinity)).toBe(false);
      expect(isValidNumber(-Infinity)).toBe(false);
      expect(isValidNumber(null)).toBe(false);
      expect(isValidNumber(undefined)).toBe(false);
      expect(isValidNumber('42')).toBe(false);
      expect(isValidNumber({})).toBe(false);
      expect(isValidNumber([])).toBe(false);
    });
  });

  describe('sanitizeNumber', () => {
    it('should return valid numbers unchanged', () => {
      expect(sanitizeNumber(42)).toBe(42);
      expect(sanitizeNumber(-3.14)).toBe(-3.14);
      expect(sanitizeNumber(0)).toBe(0);
    });

    it('should return default value for invalid inputs', () => {
      expect(sanitizeNumber(NaN)).toBe(0);
      expect(sanitizeNumber(Infinity)).toBe(0);
      expect(sanitizeNumber(null)).toBe(0);
      expect(sanitizeNumber(undefined)).toBe(0);
      expect(sanitizeNumber('invalid')).toBe(0);
    });

    it('should use custom default value', () => {
      expect(sanitizeNumber(NaN, 100)).toBe(100);
      expect(sanitizeNumber(null, -1)).toBe(-1);
    });
  });

  describe('validateFinancialData', () => {
    it('should validate correct financial data', () => {
      const data = {
        current: 1000,
        previous: 800,
        absoluteDifference: 200,
        percentageChange: 25
      };

      const result = validateFinancialData(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect null/undefined data', () => {
      const result1 = validateFinancialData(null);
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Financial data is null or undefined');

      const result2 = validateFinancialData(undefined);
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Financial data is null or undefined');
    });

    it('should detect invalid numeric fields', () => {
      const data = {
        current: NaN,
        previous: 800,
        absoluteDifference: Infinity,
        percentageChange: 'invalid'
      };

      const result = validateFinancialData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle missing fields gracefully', () => {
      const data = {
        current: 1000
        // missing other fields
      };

      const result = validateFinancialData(data);
      expect(result.isValid).toBe(true); // Missing fields are okay
    });
  });

  describe('validateComparativeData', () => {
    it('should validate correct comparative data structure', () => {
      const data = {
        monthOverMonth: {
          income: { current: 5000, previous: 4500, absoluteDifference: 500, percentageChange: 11.11 },
          expenses: { current: 3000, previous: 3200, absoluteDifference: -200, percentageChange: -6.25 },
          balance: { current: 2000, previous: 1300, absoluteDifference: 700, percentageChange: 53.85 }
        }
      };

      const result = validateComparativeData(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect null comparative data', () => {
      const result = validateComparativeData(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Comparative data is null or undefined');
    });

    it('should validate nested financial data', () => {
      const data = {
        monthOverMonth: {
          income: { current: NaN, previous: 4500 },
          expenses: { current: 3000, previous: Infinity }
        }
      };

      const result = validateComparativeData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('hasSufficientDataForComparison', () => {
    it('should return true for sufficient data', () => {
      const current = [{ amount: 100 }, { amount: 200 }];
      const previous = [{ amount: 150 }];
      
      expect(hasSufficientDataForComparison(current, previous)).toBe(true);
    });

    it('should return false for insufficient data', () => {
      const current = [];
      const previous = [{ amount: 150 }];
      
      expect(hasSufficientDataForComparison(current, previous)).toBe(false);
    });

    it('should handle non-array inputs', () => {
      expect(hasSufficientDataForComparison(null as any, [])).toBe(false);
      expect(hasSufficientDataForComparison([], undefined as any)).toBe(false);
    });

    it('should respect minimum transaction threshold', () => {
      const current = [{ amount: 100 }];
      const previous = [{ amount: 150 }];
      
      expect(hasSufficientDataForComparison(current, previous, 2)).toBe(false);
      expect(hasSufficientDataForComparison(current, previous, 1)).toBe(true);
    });
  });

  describe('calculateDataQualityScore', () => {
    it('should return 1.0 for perfect data', () => {
      const data = {
        monthOverMonth: {
          income: { 
            current: 5000, 
            previous: 4500, 
            dataAvailable: true 
          },
          expenses: { 
            current: 3000, 
            previous: 3200, 
            dataAvailable: true 
          },
          balance: { 
            current: 2000, 
            previous: 1300, 
            dataAvailable: true 
          }
        }
      };

      const score = calculateDataQualityScore(data);
      expect(score).toBe(1.0);
    });

    it('should reduce score for missing data', () => {
      const data = {
        monthOverMonth: {
          income: { 
            current: 5000, 
            previous: 4500, 
            dataAvailable: false 
          },
          expenses: { 
            current: 3000, 
            previous: 3200, 
            dataAvailable: true 
          },
          balance: { 
            current: 2000, 
            previous: 1300, 
            dataAvailable: true 
          }
        }
      };

      const score = calculateDataQualityScore(data);
      expect(score).toBeLessThan(1.0);
    });

    it('should handle null data gracefully', () => {
      const score = calculateDataQualityScore(null);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('Edge Cases - NGNNaN Issue', () => {
    it('should detect NaN in financial calculations', () => {
      const data = {
        current: NaN,
        previous: 1000,
        absoluteDifference: NaN,
        percentageChange: NaN
      };

      const result = validateFinancialData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('current'))).toBe(true);
    });

    it('should handle division by zero scenarios', () => {
      // This would typically result in NaN or Infinity
      const data = {
        current: 1000,
        previous: 0,
        absoluteDifference: 1000,
        percentageChange: Infinity
      };

      const result = validateFinancialData(data);
      expect(result.isValid).toBe(false);
    });

    it('should sanitize currency values that could cause NGNNaN', () => {
      expect(sanitizeNumber(NaN)).toBe(0);
      expect(sanitizeNumber(Infinity)).toBe(0);
      expect(sanitizeNumber(-Infinity)).toBe(0);
    });
  });
}); 