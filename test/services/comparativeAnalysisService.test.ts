import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getPercentageChange,
  getAbsoluteDifference,
  calculateTrendDirection,
  formatTrendData,
  calculateMonthOverMonth,
  calculateYearOverYear,
  getComparativeInsights
} from '@/services/comparativeAnalysisService';
import { DEFAULT_TREND_THRESHOLDS } from '@/types/comparativeData';
import type { MonthlySnapshot } from '@/services/monthlySnapshotService';

// Mock the monthly snapshot service
vi.mock('@/services/monthlySnapshotService', () => ({
  getMonthlySnapshot: vi.fn(),
  getMonthlySnapshots: vi.fn(),
  getCurrentMonthData: vi.fn()
}));

describe('Comparative Analysis Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPercentageChange', () => {
    it('should calculate positive percentage change correctly', () => {
      expect(getPercentageChange(120, 100)).toBe(20);
    });

    it('should calculate negative percentage change correctly', () => {
      expect(getPercentageChange(80, 100)).toBe(-20);
    });

    it('should handle zero previous value', () => {
      expect(getPercentageChange(100, 0)).toBe(100);
      expect(getPercentageChange(0, 0)).toBe(0);
    });

    it('should handle negative previous values', () => {
      expect(getPercentageChange(-80, -100)).toBe(20);
      expect(getPercentageChange(-120, -100)).toBe(-20);
    });
  });

  describe('getAbsoluteDifference', () => {
    it('should calculate absolute difference correctly', () => {
      expect(getAbsoluteDifference(120, 100)).toBe(20);
      expect(getAbsoluteDifference(80, 100)).toBe(-20);
      expect(getAbsoluteDifference(100, 100)).toBe(0);
    });
  });

  describe('calculateTrendDirection', () => {
    it('should identify significant upward trend', () => {
      const result = calculateTrendDirection(25);
      expect(result.direction).toBe('up');
      expect(result.strength).toBe('significant');
      expect(result.confidence).toBe('high');
    });

    it('should identify moderate downward trend', () => {
      const result = calculateTrendDirection(-15);
      expect(result.direction).toBe('down');
      expect(result.strength).toBe('moderate');
      expect(result.confidence).toBe('medium');
    });

    it('should identify minimal neutral trend', () => {
      const result = calculateTrendDirection(3);
      expect(result.direction).toBe('neutral');
      expect(result.strength).toBe('minimal');
      expect(result.confidence).toBe('low');
    });

    it('should use custom thresholds', () => {
      const customThresholds = { significant: 30, moderate: 15, minimal: 8 };
      const result = calculateTrendDirection(20, customThresholds);
      expect(result.direction).toBe('up');
      expect(result.strength).toBe('moderate');
    });
  });

  describe('formatTrendData', () => {
    it('should format upward trend correctly', () => {
      const metrics = {
        current: 120,
        previous: 100,
        absoluteChange: 20,
        percentageChange: 20,
        trend: { direction: 'up' as const, strength: 'significant' as const, confidence: 'high' as const }
      };

      const result = formatTrendData(metrics);
      expect(result.displayText).toBe('+20.0%');
      expect(result.colorClass).toBe('text-green-600');
      expect(result.iconDirection).toBe('up');
    });

    it('should format downward trend correctly', () => {
      const metrics = {
        current: 80,
        previous: 100,
        absoluteChange: -20,
        percentageChange: -20,
        trend: { direction: 'down' as const, strength: 'significant' as const, confidence: 'high' as const }
      };

      const result = formatTrendData(metrics);
      expect(result.displayText).toBe('-20.0%');
      expect(result.colorClass).toBe('text-red-600');
      expect(result.iconDirection).toBe('down');
    });

    it('should format neutral trend correctly', () => {
      const metrics = {
        current: 102,
        previous: 100,
        absoluteChange: 2,
        percentageChange: 2,
        trend: { direction: 'neutral' as const, strength: 'minimal' as const, confidence: 'low' as const }
      };

      const result = formatTrendData(metrics);
      expect(result.displayText).toBe('2.0%');
      expect(result.colorClass).toBe('text-gray-600');
      expect(result.iconDirection).toBe('neutral');
    });
  });

  describe('calculateMonthOverMonth', () => {
    const mockCurrentSnapshot: MonthlySnapshot = {
      snapshot_id: '1',
      user_id: 'user1',
      year: 2025,
      month: 2,
      opening_balance: 1000,
      closing_balance: 1200,
      total_income: 800,
      total_expenses: 600,
      transaction_count: 10,
      created_at: '2025-02-01',
      updated_at: '2025-02-01'
    };

    const mockPreviousSnapshot: MonthlySnapshot = {
      snapshot_id: '2',
      user_id: 'user1',
      year: 2025,
      month: 1,
      opening_balance: 800,
      closing_balance: 1000,
      total_income: 600,
      total_expenses: 400,
      transaction_count: 8,
      created_at: '2025-01-01',
      updated_at: '2025-01-01'
    };

    it('should calculate month-over-month comparison correctly', async () => {
      const { getMonthlySnapshot } = await import('@/services/monthlySnapshotService');
      vi.mocked(getMonthlySnapshot)
        .mockResolvedValueOnce(mockCurrentSnapshot)
        .mockResolvedValueOnce(mockPreviousSnapshot);

      const result = await calculateMonthOverMonth(2025, 2);

      expect(result).not.toBeNull();
      expect(result!.income.current).toBe(800);
      expect(result!.income.previous).toBe(600);
      expect(result!.income.percentageChange).toBeCloseTo(33.33, 1);
      expect(result!.income.trend.direction).toBe('up');

      expect(result!.expenses.current).toBe(600);
      expect(result!.expenses.previous).toBe(400);
      expect(result!.expenses.percentageChange).toBe(50);
      expect(result!.expenses.trend.direction).toBe('up');

      expect(result!.period.current).toEqual({ year: 2025, month: 2 });
      expect(result!.period.previous).toEqual({ year: 2025, month: 1 });
    });

    it('should handle year boundary correctly', async () => {
      const { getMonthlySnapshot } = await import('@/services/monthlySnapshotService');
      vi.mocked(getMonthlySnapshot)
        .mockResolvedValueOnce(mockCurrentSnapshot)
        .mockResolvedValueOnce(mockPreviousSnapshot);

      const result = await calculateMonthOverMonth(2025, 1);

      expect(result).not.toBeNull();
      expect(result!.period.current).toEqual({ year: 2025, month: 1 });
      expect(result!.period.previous).toEqual({ year: 2024, month: 12 });
    });

    it('should return null when current snapshot is missing', async () => {
      const { getMonthlySnapshot } = await import('@/services/monthlySnapshotService');
      vi.mocked(getMonthlySnapshot).mockResolvedValueOnce(null);

      const result = await calculateMonthOverMonth(2025, 2);
      expect(result).toBeNull();
    });

    it('should return null when previous snapshot is missing', async () => {
      const { getMonthlySnapshot } = await import('@/services/monthlySnapshotService');
      vi.mocked(getMonthlySnapshot)
        .mockResolvedValueOnce(mockCurrentSnapshot)
        .mockResolvedValueOnce(null);

      const result = await calculateMonthOverMonth(2025, 2);
      expect(result).toBeNull();
    });
  });

  describe('calculateYearOverYear', () => {
    const mockCurrentSnapshot: MonthlySnapshot = {
      snapshot_id: '1',
      user_id: 'user1',
      year: 2025,
      month: 2,
      opening_balance: 1000,
      closing_balance: 1200,
      total_income: 800,
      total_expenses: 600,
      transaction_count: 10,
      created_at: '2025-02-01',
      updated_at: '2025-02-01'
    };

    const mockYearAgoSnapshot: MonthlySnapshot = {
      snapshot_id: '3',
      user_id: 'user1',
      year: 2024,
      month: 2,
      opening_balance: 500,
      closing_balance: 700,
      total_income: 500,
      total_expenses: 300,
      transaction_count: 6,
      created_at: '2024-02-01',
      updated_at: '2024-02-01'
    };

    it('should calculate year-over-year comparison correctly', async () => {
      const { getMonthlySnapshot } = await import('@/services/monthlySnapshotService');
      vi.mocked(getMonthlySnapshot)
        .mockResolvedValueOnce(mockCurrentSnapshot)
        .mockResolvedValueOnce(mockYearAgoSnapshot);

      const result = await calculateYearOverYear(2025, 2);

      expect(result).not.toBeNull();
      expect(result!.income.current).toBe(800);
      expect(result!.income.previous).toBe(500);
      expect(result!.income.percentageChange).toBe(60);
      expect(result!.income.trend.direction).toBe('up');

      expect(result!.period.current).toEqual({ year: 2025, month: 2 });
      expect(result!.period.yearAgo).toEqual({ year: 2024, month: 2 });
      expect(result!.seasonalPattern).toBeDefined();
    });

    it('should return null when year ago snapshot is missing', async () => {
      const { getMonthlySnapshot } = await import('@/services/monthlySnapshotService');
      vi.mocked(getMonthlySnapshot)
        .mockResolvedValueOnce(mockCurrentSnapshot)
        .mockResolvedValueOnce(null);

      const result = await calculateYearOverYear(2025, 2);
      expect(result).toBeNull();
    });
  });

  describe('getComparativeInsights', () => {
    it('should return comprehensive insights when data is available', async () => {
      const { getMonthlySnapshots, getMonthlySnapshot } = await import('@/services/monthlySnapshotService');
      
      // Mock snapshots for history count
      vi.mocked(getMonthlySnapshots).mockResolvedValueOnce([
        { snapshot_id: '1' } as MonthlySnapshot,
        { snapshot_id: '2' } as MonthlySnapshot
      ]);

      // Mock successful MoM and YoY calculations
      vi.mocked(getMonthlySnapshot)
        .mockResolvedValueOnce({ snapshot_id: '1' } as MonthlySnapshot) // Current for MoM
        .mockResolvedValueOnce({ snapshot_id: '2' } as MonthlySnapshot) // Previous for MoM
        .mockResolvedValueOnce({ snapshot_id: '1' } as MonthlySnapshot) // Current for YoY
        .mockResolvedValueOnce({ snapshot_id: '3' } as MonthlySnapshot); // Year ago for YoY

      const result = await getComparativeInsights(2025, 2);

      expect(result.hasInsufficientData).toBe(false);
      expect(result.dataAvailability.monthsOfHistory).toBe(2);
      expect(result.dataAvailability.hasPreviousMonth).toBe(true);
      expect(result.dataAvailability.hasYearAgoData).toBe(true);
      expect(result.monthOverMonth).not.toBeNull();
      expect(result.yearOverYear).not.toBeNull();
    });

    it('should handle insufficient data gracefully', async () => {
      const { getMonthlySnapshots, getMonthlySnapshot } = await import('@/services/monthlySnapshotService');
      
      vi.mocked(getMonthlySnapshots).mockResolvedValueOnce([]);
      vi.mocked(getMonthlySnapshot).mockResolvedValue(null);

      const result = await getComparativeInsights(2025, 2);

      expect(result.hasInsufficientData).toBe(true);
      expect(result.dataAvailability.monthsOfHistory).toBe(0);
      expect(result.dataAvailability.hasPreviousMonth).toBe(false);
      expect(result.dataAvailability.hasYearAgoData).toBe(false);
      expect(result.monthOverMonth).toBeNull();
      expect(result.yearOverYear).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      const { getMonthlySnapshots } = await import('@/services/monthlySnapshotService');
      
      vi.mocked(getMonthlySnapshots).mockRejectedValueOnce(new Error('Database error'));

      const result = await getComparativeInsights(2025, 2);

      expect(result.hasInsufficientData).toBe(true);
      expect(result.monthOverMonth).toBeNull();
      expect(result.yearOverYear).toBeNull();
    });
  });
}); 