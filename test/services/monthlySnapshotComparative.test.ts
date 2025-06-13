import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MonthlySnapshot, CurrentMonthData } from '@/services/monthlySnapshotService';
import type { ComparativeInsights } from '@/types/comparativeData';

// Mock Supabase client first
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } }
      })
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null })
          })
        })
      })
    })
  }
}));

// Mock the dependencies
vi.mock('@/services/monthlySnapshotService', async () => {
  const actual = await vi.importActual('@/services/monthlySnapshotService');
  return {
    ...actual,
    getMonthlySnapshot: vi.fn(),
    getMonthlySnapshots: vi.fn(),
    getHistoricalMonthlySnapshots: vi.fn(),
    getCurrentMonthData: vi.fn()
  };
});

vi.mock('@/services/comparativeAnalysisService', () => ({
  getComparativeInsights: vi.fn()
}));

// Import after mocking
import {
  getMonthlySnapshotWithComparative,
  getMonthlySnapshotsWithComparative,
  getHistoricalMonthlySnapshotsWithComparative,
  getCurrentMonthDataWithComparative,
  clearComparativeCache,
  getComparativeCacheStats
} from '@/services/monthlySnapshotService';
import * as monthlySnapshotService from '@/services/monthlySnapshotService';
import * as comparativeAnalysisService from '@/services/comparativeAnalysisService';

describe('Monthly Snapshot Service with Comparative Insights', () => {
  const mockSnapshot: MonthlySnapshot = {
    snapshot_id: 'test-id',
    user_id: 'user-123',
    year: 2024,
    month: 1,
    opening_balance: 1000,
    closing_balance: 1500,
    total_income: 2000,
    total_expenses: 1500,
    transaction_count: 10,
    created_at: '2024-01-31T00:00:00Z',
    updated_at: '2024-01-31T00:00:00Z'
  };

  const mockCurrentData: CurrentMonthData = {
    balance: 1500,
    income: 2000,
    expense: 1500,
    transactionCount: 10,
    balanceChange: 50,
    incomeChange: 25,
    expenseChange: 10,
    transactionCountChange: 20
  };

  const mockComparativeInsights: ComparativeInsights = {
    monthOverMonth: {
      income: {
        current: 2000,
        previous: 1800,
        change: {
          absolute: 200,
          percentage: 11.11,
          direction: 'up'
        }
      },
      expenses: {
        current: 1500,
        previous: 1400,
        change: {
          absolute: 100,
          percentage: 7.14,
          direction: 'up'
        }
      },
      balance: {
        current: 1500,
        previous: 1000,
        change: {
          absolute: 500,
          percentage: 50,
          direction: 'up'
        }
      }
    },
    yearOverYear: {
      income: {
        current: 2000,
        previous: 1500,
        change: {
          absolute: 500,
          percentage: 33.33,
          direction: 'up'
        }
      },
      expenses: {
        current: 1500,
        previous: 1200,
        change: {
          absolute: 300,
          percentage: 25,
          direction: 'up'
        }
      },
      balance: {
        current: 1500,
        previous: 800,
        change: {
          absolute: 700,
          percentage: 87.5,
          direction: 'up'
        }
      }
    },
    dataAvailability: {
      hasPreviousMonth: true,
      hasPreviousYear: true,
      monthsOfData: 12
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    clearComparativeCache();
  });

  afterEach(() => {
    clearComparativeCache();
  });

  describe('getMonthlySnapshotWithComparative', () => {
    it('should return snapshot with comparative insights when both are available', async () => {
      vi.mocked(monthlySnapshotService.getMonthlySnapshot).mockResolvedValue(mockSnapshot);
      vi.mocked(comparativeAnalysisService.getComparativeInsights).mockResolvedValue(mockComparativeInsights);

      const result = await getMonthlySnapshotWithComparative(2024, 1);

      expect(result).toEqual({
        ...mockSnapshot,
        comparative: mockComparativeInsights
      });
      expect(monthlySnapshotService.getMonthlySnapshot).toHaveBeenCalledWith(2024, 1);
      expect(comparativeAnalysisService.getComparativeInsights).toHaveBeenCalledWith(2024, 1);
    });

    it('should return null when snapshot is not found', async () => {
      vi.mocked(monthlySnapshotService.getMonthlySnapshot).mockResolvedValue(null);

      const result = await getMonthlySnapshotWithComparative(2024, 1);

      expect(result).toBeNull();
      expect(comparativeAnalysisService.getComparativeInsights).not.toHaveBeenCalled();
    });

    it('should return snapshot without comparative data when insights calculation fails', async () => {
      vi.mocked(monthlySnapshotService.getMonthlySnapshot).mockResolvedValue(mockSnapshot);
      vi.mocked(comparativeAnalysisService.getComparativeInsights).mockRejectedValue(new Error('Calculation failed'));

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await getMonthlySnapshotWithComparative(2024, 1);

      expect(result).toEqual(mockSnapshot);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to get comparative insights for snapshot:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('getMonthlySnapshotsWithComparative', () => {
    const mockSnapshots = [
      { ...mockSnapshot, month: 1 },
      { ...mockSnapshot, month: 2 },
      { ...mockSnapshot, month: 3 }
    ];

    it('should return all snapshots with comparative insights', async () => {
      vi.mocked(monthlySnapshotService.getMonthlySnapshots).mockResolvedValue(mockSnapshots);
      vi.mocked(comparativeAnalysisService.getComparativeInsights).mockResolvedValue(mockComparativeInsights);

      const result = await getMonthlySnapshotsWithComparative(3);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        ...mockSnapshots[0],
        comparative: mockComparativeInsights
      });
      expect(comparativeAnalysisService.getComparativeInsights).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed success/failure scenarios gracefully', async () => {
      vi.mocked(monthlySnapshotService.getMonthlySnapshots).mockResolvedValue(mockSnapshots);
      vi.mocked(comparativeAnalysisService.getComparativeInsights)
        .mockResolvedValueOnce(mockComparativeInsights)
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce(mockComparativeInsights);

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await getMonthlySnapshotsWithComparative(3);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        ...mockSnapshots[0],
        comparative: mockComparativeInsights
      });
      expect(result[1]).toEqual(mockSnapshots[1]); // No comparative data
      expect(result[2]).toEqual({
        ...mockSnapshots[2],
        comparative: mockComparativeInsights
      });

      consoleSpy.mockRestore();
    });

    it('should pass limit parameter correctly', async () => {
      vi.mocked(monthlySnapshotService.getMonthlySnapshots).mockResolvedValue([]);

      await getMonthlySnapshotsWithComparative(6);

      expect(monthlySnapshotService.getMonthlySnapshots).toHaveBeenCalledWith(6);
    });
  });

  describe('getHistoricalMonthlySnapshotsWithComparative', () => {
    const mockHistoricalSnapshots = [
      { ...mockSnapshot, month: 11, year: 2023 },
      { ...mockSnapshot, month: 12, year: 2023 }
    ];

    it('should return historical snapshots with comparative insights', async () => {
      vi.mocked(monthlySnapshotService.getHistoricalMonthlySnapshots).mockResolvedValue(mockHistoricalSnapshots);
      vi.mocked(comparativeAnalysisService.getComparativeInsights).mockResolvedValue(mockComparativeInsights);

      const result = await getHistoricalMonthlySnapshotsWithComparative(12);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        ...mockHistoricalSnapshots[0],
        comparative: mockComparativeInsights
      });
      expect(monthlySnapshotService.getHistoricalMonthlySnapshots).toHaveBeenCalledWith(12);
    });

    it('should handle empty historical data', async () => {
      vi.mocked(monthlySnapshotService.getHistoricalMonthlySnapshots).mockResolvedValue([]);

      const result = await getHistoricalMonthlySnapshotsWithComparative(12);

      expect(result).toEqual([]);
      expect(comparativeAnalysisService.getComparativeInsights).not.toHaveBeenCalled();
    });
  });

  describe('getCurrentMonthDataWithComparative', () => {
    it('should return current month data with comparative insights', async () => {
      vi.mocked(monthlySnapshotService.getCurrentMonthData).mockResolvedValue(mockCurrentData);
      vi.mocked(comparativeAnalysisService.getComparativeInsights).mockResolvedValue(mockComparativeInsights);

      const result = await getCurrentMonthDataWithComparative();

      expect(result).toEqual({
        ...mockCurrentData,
        comparative: mockComparativeInsights
      });
      expect(monthlySnapshotService.getCurrentMonthData).toHaveBeenCalled();
      expect(comparativeAnalysisService.getComparativeInsights).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should return current data without comparative insights when calculation fails', async () => {
      vi.mocked(monthlySnapshotService.getCurrentMonthData).mockResolvedValue(mockCurrentData);
      vi.mocked(comparativeAnalysisService.getComparativeInsights).mockRejectedValue(new Error('Failed'));

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await getCurrentMonthDataWithComparative();

      expect(result).toEqual(mockCurrentData);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to get comparative insights for current month:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('Cache Management', () => {
    it('should start with empty cache', () => {
      const stats = getComparativeCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);
    });

    it('should clear cache successfully', () => {
      clearComparativeCache();
      const stats = getComparativeCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      vi.mocked(monthlySnapshotService.getMonthlySnapshot).mockRejectedValue(new Error('Database error'));

      await expect(getMonthlySnapshotWithComparative(2024, 1)).rejects.toThrow('Database error');
    });

    it('should handle comparative analysis service errors gracefully', async () => {
      vi.mocked(monthlySnapshotService.getMonthlySnapshots).mockResolvedValue([mockSnapshot]);
      vi.mocked(comparativeAnalysisService.getComparativeInsights).mockRejectedValue(new Error('Analysis failed'));

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await getMonthlySnapshotsWithComparative(1);

      expect(result).toEqual([mockSnapshot]);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Integration Scenarios', () => {
    it('should maintain data consistency across multiple calls', async () => {
      vi.mocked(monthlySnapshotService.getMonthlySnapshot).mockResolvedValue(mockSnapshot);
      vi.mocked(comparativeAnalysisService.getComparativeInsights).mockResolvedValue(mockComparativeInsights);

      const result1 = await getMonthlySnapshotWithComparative(2024, 1);
      const result2 = await getMonthlySnapshotWithComparative(2024, 1);

      expect(result1).toEqual(result2);
      expect(result1?.comparative).toEqual(mockComparativeInsights);
    });

    it('should handle concurrent requests properly', async () => {
      vi.mocked(monthlySnapshotService.getMonthlySnapshots).mockResolvedValue([mockSnapshot]);
      vi.mocked(comparativeAnalysisService.getComparativeInsights).mockResolvedValue(mockComparativeInsights);

      const promises = [
        getMonthlySnapshotsWithComparative(1),
        getMonthlySnapshotsWithComparative(1),
        getMonthlySnapshotsWithComparative(1)
      ];

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          ...mockSnapshot,
          comparative: mockComparativeInsights
        });
      });
    });
  });

  describe('Performance Considerations', () => {
    it('should not impact performance significantly with large datasets', async () => {
      const largeSnapshotArray = Array.from({ length: 24 }, (_, i) => ({
        ...mockSnapshot,
        month: (i % 12) + 1,
        year: 2023 + Math.floor(i / 12)
      }));

      vi.mocked(monthlySnapshotService.getMonthlySnapshots).mockResolvedValue(largeSnapshotArray);
      vi.mocked(comparativeAnalysisService.getComparativeInsights).mockResolvedValue(mockComparativeInsights);

      const startTime = Date.now();
      const result = await getMonthlySnapshotsWithComparative(24);
      const endTime = Date.now();

      expect(result).toHaveLength(24);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
}); 