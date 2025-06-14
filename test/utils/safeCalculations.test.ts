import { describe, it, expect } from 'vitest';
import {
  safeDivide,
  safePercentageChange,
  safeAbsoluteDifference,
  safeCurrencyFormat,
  safeTrendDirection,
  safeComparativeCalculation
} from '@/utils/safeCalculations';

describe('Safe Calculations Utilities', () => {
  describe('safeDivide', () => {
    it('should perform normal division correctly', () => {
      const result = safeDivide(10, 2);
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(5);
      expect(result.error).toBeUndefined();
    });

    it('should handle division by zero', () => {
      const result = safeDivide(10, 0);
      expect(result.isValid).toBe(false);
      expect(result.value).toBe(0);
      expect(result.error).toBe('Division by zero');
    });

    it('should handle very small denominators', () => {
      const result = safeDivide(10, 1e-15);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Denominator too small for reliable calculation');
    });

    it('should handle invalid inputs', () => {
      const result1 = safeDivide(NaN, 5);
      expect(result1.isValid).toBe(false);
      expect(result1.error).toBe('Invalid input values for division');

      const result2 = safeDivide(10, Infinity);
      expect(result2.isValid).toBe(false);
      expect(result2.error).toBe('Invalid input values for division');
    });

    it('should use custom default value', () => {
      const result = safeDivide(10, 0, 999);
      expect(result.value).toBe(999);
    });
  });

  describe('safePercentageChange', () => {
    it('should calculate normal percentage change', () => {
      const result = safePercentageChange(120, 100);
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(20);
    });

    it('should handle zero previous value', () => {
      const result1 = safePercentageChange(100, 0);
      expect(result1.isValid).toBe(false);
      expect(result1.value).toBe(999999);
      expect(result1.error).toBe('Cannot calculate percentage change from zero base value');

      const result2 = safePercentageChange(0, 0);
      expect(result2.isValid).toBe(true);
      expect(result2.value).toBe(0);
    });

    it('should handle negative values correctly', () => {
      const result = safePercentageChange(80, 100);
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(-20);
    });

    it('should cap extreme percentages', () => {
      const result = safePercentageChange(1e10, 1);
      expect(result.value).toBe(999999);
    });

    it('should handle invalid inputs', () => {
      const result = safePercentageChange(NaN, 100);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid input values for percentage calculation');
    });
  });

  describe('safeAbsoluteDifference', () => {
    it('should calculate normal absolute difference', () => {
      const result = safeAbsoluteDifference(120, 100);
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(20);
    });

    it('should handle negative differences', () => {
      const result = safeAbsoluteDifference(80, 100);
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(-20);
    });

    it('should handle invalid inputs', () => {
      const result = safeAbsoluteDifference(NaN, 100);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid input values for absolute difference calculation');
    });
  });

  describe('safeCurrencyFormat', () => {
    it('should format valid amounts correctly', () => {
      const result = safeCurrencyFormat(1234.56, 'USD');
      expect(result).toMatch(/\$1,234\.56/);
    });

    it('should handle invalid amounts', () => {
      expect(safeCurrencyFormat(NaN)).toBe('N/A');
      expect(safeCurrencyFormat(Infinity)).toBe('N/A');
      expect(safeCurrencyFormat(null as any)).toBe('N/A');
    });

    it('should handle currency formatting errors gracefully', () => {
      // Test with invalid currency code
      const result = safeCurrencyFormat(1234.56, 'INVALID');
      expect(result).toContain('1,234.56');
    });

    it('should format Nigerian Naira correctly', () => {
      const result = safeCurrencyFormat(1000, 'NGN');
      expect(result).toMatch(/₦1,000\.00/);
    });
  });

  describe('safeTrendDirection', () => {
    it('should determine upward trend', () => {
      const result = safeTrendDirection(120, 100);
      expect(result).toBe('up');
    });

    it('should determine downward trend', () => {
      const result = safeTrendDirection(80, 100);
      expect(result).toBe('down');
    });

    it('should determine stable trend', () => {
      const result = safeTrendDirection(100.5, 100);
      expect(result).toBe('stable');
    });

    it('should handle invalid inputs', () => {
      const result = safeTrendDirection(NaN, 100);
      expect(result).toBe('stable');
    });

    it('should use custom threshold', () => {
      const result = safeTrendDirection(101, 100, 0.02); // 2% threshold
      expect(result).toBe('stable'); // 1% change is below 2% threshold
    });
  });

  describe('safeComparativeCalculation', () => {
    it('should perform complete comparative calculation', () => {
      const result = safeComparativeCalculation(120, 100);
      
      expect(result.current).toBe(120);
      expect(result.previous).toBe(100);
      expect(result.absoluteDifference).toBe(20);
      expect(result.percentageChange).toBe(20);
      expect(result.trend).toBe('up');
      expect(result.dataAvailable).toBe(true);
      expect(result.calculationErrors).toHaveLength(0);
    });

    it('should handle invalid inputs gracefully', () => {
      const result = safeComparativeCalculation(NaN, 100);
      
      expect(result.current).toBe(0); // sanitized
      expect(result.previous).toBe(100);
      expect(result.dataAvailable).toBe(true); // Still valid after sanitization
    });

    it('should handle division by zero scenario', () => {
      const result = safeComparativeCalculation(100, 0);
      
      expect(result.current).toBe(100);
      expect(result.previous).toBe(0);
      expect(result.absoluteDifference).toBe(100);
      expect(result.dataAvailable).toBe(false); // Invalid percentage calculation
      expect(result.calculationErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases - NGNNaN Prevention', () => {
    it('should prevent NaN in currency formatting', () => {
      expect(safeCurrencyFormat(NaN, 'NGN')).toBe('N/A');
      expect(safeCurrencyFormat(Infinity, 'NGN')).toBe('N/A');
      expect(safeCurrencyFormat(-Infinity, 'NGN')).toBe('N/A');
    });

    it('should prevent NaN in percentage calculations', () => {
      const result = safePercentageChange(NaN, 1000);
      expect(result.isValid).toBe(false);
      expect(result.value).toBe(0); // Default value
    });

    it('should handle extreme values safely', () => {
      const result = safeComparativeCalculation(1e15, 1);
      expect(result.percentageChange).toBe(999999); // Capped
      expect(result.dataAvailable).toBe(true);
    });

    it('should sanitize all inputs in comparative calculation', () => {
      const result = safeComparativeCalculation(undefined as any, null as any);
      expect(result.current).toBe(0);
      expect(result.previous).toBe(0);
      expect(result.absoluteDifference).toBe(0);
      expect(result.percentageChange).toBe(0);
      expect(result.trend).toBe('stable');
    });
  });
}); 