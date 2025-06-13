import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ChartDataService,
  TIME_PERIODS,
  getBalanceTrendData,
  getIncomeExpenseComparisonData,
  getMonthlyTotalsData,
  getCategorySpendingData,
  clearChartDataCache
} from '@/services/chartDataService';
import { getMonthlySnapshots } from '@/services/monthlySnapshotService';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
vi.mock('@/services/monthlySnapshotService');
vi.mock('@/integrations/supabase/client');

const mockGetMonthlySnapshots = vi.mocked(getMonthlySnapshots);
const mockSupabase = vi.mocked(supabase);

// Mock data
const mockMonthlySnapshots = [
  {
    snapshot_id: '1',
    user_id: 'user1',
    year: 2024,
    month: 1,
    opening_balance: 100000,
    closing_balance: 150000,
    total_income: 200000,
    total_expenses: 150000,
    transaction_count: 15,
    created_at: '2024-01-31T00:00:00Z',
    updated_at: '2024-01-31T00:00:00Z'
  },
  {
    snapshot_id: '2',
    user_id: 'user1',
    year: 2024,
    month: 2,
    opening_balance: 150000,
    closing_balance: 180000,
    total_income: 220000,
    total_expenses: 190000,
    transaction_count: 18,
    created_at: '2024-02-29T00:00:00Z',
    updated_at: '2024-02-29T00:00:00Z'
  },
  {
    snapshot_id: '3',
    user_id: 'user1',
    year: 2024,
    month: 3,
    opening_balance: 180000,
    closing_balance: 160000,
    total_income: 180000,
    total_expenses: 200000,
    transaction_count: 20,
    created_at: '2024-03-31T00:00:00Z',
    updated_at: '2024-03-31T00:00:00Z'
  }
];

const mockExchangeRates = {
  USD: 1,
  NGN: 460.5,
  EUR: 0.85,
  GBP: 0.73
};

const mockTransactionData = [
  {
    amount: 50000,
    category_name: 'Food',
    date: '2024-01-15',
    categories: { name: 'Food', type: 'expense' }
  },
  {
    amount: 30000,
    category_name: 'Transport',
    date: '2024-01-20',
    categories: { name: 'Transport', type: 'expense' }
  },
  {
    amount: 70000,
    category_name: 'Food',
    date: '2024-02-10',
    categories: { name: 'Food', type: 'expense' }
  }
];

describe('ChartDataService', () => {
  let chartDataService: ChartDataService;

  beforeEach(() => {
    chartDataService = ChartDataService.getInstance();
    chartDataService.clearCache();
    
    // Setup default mocks
    mockGetMonthlySnapshots.mockResolvedValue(mockMonthlySnapshots);
    
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user1' } },
      error: null
    } as any);
    
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ChartDataService.getInstance();
      const instance2 = ChartDataService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getBalanceTrendData', () => {
    it('should return balance trend data with correct structure', async () => {
      const result = await chartDataService.getBalanceTrendData(TIME_PERIODS.THREE_MONTHS, mockExchangeRates);
      
      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        month: '2024-01',
        year: 2024,
        monthNum: 1,
        balance: 150000,
        balanceUSD: expect.any(Number),
        formattedMonth: 'Jan 2024',
        tooltip: expect.objectContaining({
          month: 'Jan 2024',
          balance: 150000,
          balanceUSD: expect.any(Number),
          change: 0,
          changePercent: 0
        })
      });
    });

    it('should calculate percentage changes correctly', async () => {
      const result = await chartDataService.getBalanceTrendData(TIME_PERIODS.THREE_MONTHS, mockExchangeRates);
      
      // Second month should show change from first month
      expect(result[1].tooltip.change).toBe(30000); // 180000 - 150000
      expect(result[1].tooltip.changePercent).toBe(20); // 20% increase
    });

    it('should sort data chronologically', async () => {
      const unsortedData = [...mockMonthlySnapshots].reverse();
      mockGetMonthlySnapshots.mockResolvedValueOnce(unsortedData);
      
      const result = await chartDataService.getBalanceTrendData(TIME_PERIODS.THREE_MONTHS, mockExchangeRates);
      
      expect(result[0].month).toBe('2024-01');
      expect(result[1].month).toBe('2024-02');
      expect(result[2].month).toBe('2024-03');
    });

    it('should return empty array when no snapshots available', async () => {
      mockGetMonthlySnapshots.mockResolvedValueOnce([]);
      
      const result = await chartDataService.getBalanceTrendData(TIME_PERIODS.THREE_MONTHS, mockExchangeRates);
      
      expect(result).toEqual([]);
    });

    it('should handle currency conversion correctly', async () => {
      const result = await chartDataService.getBalanceTrendData(TIME_PERIODS.THREE_MONTHS, mockExchangeRates);
      
      // NGN to USD conversion: 150000 / 460.5 ≈ 325.69
      expect(result[0].balanceUSD).toBeCloseTo(150000 / 460.5, 2);
    });

    it('should throw error when monthly snapshots service fails', async () => {
      mockGetMonthlySnapshots.mockRejectedValueOnce(new Error('Database error'));
      
      await expect(chartDataService.getBalanceTrendData(TIME_PERIODS.THREE_MONTHS, mockExchangeRates))
        .rejects.toThrow('Failed to fetch balance trend data');
    });
  });

  describe('getIncomeExpenseComparisonData', () => {
    it('should return income vs expense data with correct structure', async () => {
      const result = await chartDataService.getIncomeExpenseComparisonData(TIME_PERIODS.THREE_MONTHS, mockExchangeRates);
      
      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        month: '2024-01',
        year: 2024,
        monthNum: 1,
        income: 200000,
        expenses: 150000,
        incomeUSD: expect.any(Number),
        expensesUSD: expect.any(Number),
        net: 50000,
        netUSD: expect.any(Number),
        formattedMonth: 'Jan 2024'
      });
    });

    it('should calculate net income correctly', async () => {
      const result = await chartDataService.getIncomeExpenseComparisonData(TIME_PERIODS.THREE_MONTHS, mockExchangeRates);
      
      expect(result[0].net).toBe(50000); // 200000 - 150000
      expect(result[1].net).toBe(30000); // 220000 - 190000
      expect(result[2].net).toBe(-20000); // 180000 - 200000 (deficit)
    });
  });

  describe('getMonthlyTotalsData', () => {
    it('should return monthly totals data with correct structure', async () => {
      const result = await chartDataService.getMonthlyTotalsData(TIME_PERIODS.THREE_MONTHS, mockExchangeRates);
      
      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        month: '2024-01',
        year: 2024,
        monthNum: 1,
        income: 200000,
        expenses: 150000,
        transactionCount: 15,
        isDeficit: false,
        tooltip: expect.objectContaining({
          incomePercentage: expect.any(Number),
          expensePercentage: expect.any(Number)
        })
      });
    });

    it('should identify deficit months correctly', async () => {
      const result = await chartDataService.getMonthlyTotalsData(TIME_PERIODS.THREE_MONTHS, mockExchangeRates);
      
      expect(result[0].isDeficit).toBe(false); // Income > Expenses
      expect(result[1].isDeficit).toBe(false); // Income > Expenses
      expect(result[2].isDeficit).toBe(true);  // Expenses > Income
    });

    it('should calculate percentages correctly', async () => {
      const result = await chartDataService.getMonthlyTotalsData(TIME_PERIODS.THREE_MONTHS, mockExchangeRates);
      
      // First month: Income 200000, Expenses 150000, Total 350000
      expect(result[0].tooltip.incomePercentage).toBe(57); // 200000/350000 * 100
      expect(result[0].tooltip.expensePercentage).toBe(43); // 150000/350000 * 100
    });
  });

  describe('getCategorySpendingData', () => {
    beforeEach(() => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
      };
      
      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);
      
      // Mock the final query result
      Object.assign(mockQueryBuilder, {
        lte: vi.fn().mockResolvedValue({
          data: mockTransactionData,
          error: null
        })
      });
    });

    it('should return category spending data with correct structure', async () => {
      const result = await chartDataService.getCategorySpendingData(TIME_PERIODS.THREE_MONTHS, mockExchangeRates);
      
      expect(result).toHaveLength(2); // Food and Transport categories
      
      const foodCategory = result.find(cat => cat.category === 'Food');
      expect(foodCategory).toMatchObject({
        category: 'Food',
        amount: 120000, // 50000 + 70000
        amountUSD: expect.any(Number),
        percentage: expect.any(Number),
        transactionCount: 2,
        monthlyAverage: expect.any(Number),
        monthlyAverageUSD: expect.any(Number),
        trend: 'stable',
        trendPercent: 0
      });
    });

    it('should sort categories by amount descending', async () => {
      const result = await chartDataService.getCategorySpendingData(TIME_PERIODS.THREE_MONTHS, mockExchangeRates);
      
      expect(result[0].category).toBe('Food'); // Highest amount (120000)
      expect(result[1].category).toBe('Transport'); // Lower amount (30000)
    });

    it('should calculate percentages correctly', async () => {
      const result = await chartDataService.getCategorySpendingData(TIME_PERIODS.THREE_MONTHS, mockExchangeRates);
      
      const totalSpending = 120000 + 30000; // 150000
      const foodPercentage = (120000 / totalSpending) * 100; // 80%
      const transportPercentage = (30000 / totalSpending) * 100; // 20%
      
      expect(result[0].percentage).toBe(80);
      expect(result[1].percentage).toBe(20);
    });

    it('should handle authentication error', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null
      } as any);
      
      await expect(chartDataService.getCategorySpendingData(TIME_PERIODS.THREE_MONTHS, mockExchangeRates))
        .rejects.toThrow('User not authenticated');
    });
  });

  describe('Caching', () => {
    it('should cache results and return cached data on subsequent calls', async () => {
      // First call
      const result1 = await chartDataService.getBalanceTrendData(TIME_PERIODS.THREE_MONTHS, mockExchangeRates);
      
      // Second call should use cache
      const result2 = await chartDataService.getBalanceTrendData(TIME_PERIODS.THREE_MONTHS, mockExchangeRates);
      
      expect(result1).toEqual(result2);
      expect(mockGetMonthlySnapshots).toHaveBeenCalledTimes(1); // Should only call service once
    });

    it('should clear cache when requested', () => {
      const stats = chartDataService.getCacheStats();
      expect(stats.size).toBe(0);
      
      chartDataService.clearCache();
      
      const statsAfter = chartDataService.getCacheStats();
      expect(statsAfter.size).toBe(0);
    });

    it('should provide cache statistics', async () => {
      await chartDataService.getBalanceTrendData(TIME_PERIODS.THREE_MONTHS, mockExchangeRates);
      
      const stats = chartDataService.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.keys).toContain(expect.stringContaining('getBalanceTrendData'));
    });
  });

  describe('Convenience functions', () => {
    it('should export convenience functions that work correctly', async () => {
      const result = await getBalanceTrendData(TIME_PERIODS.THREE_MONTHS, mockExchangeRates);
      expect(result).toHaveLength(3);
    });

    it('should export all required convenience functions', () => {
      expect(typeof getBalanceTrendData).toBe('function');
      expect(typeof getIncomeExpenseComparisonData).toBe('function');
      expect(typeof getMonthlyTotalsData).toBe('function');
      expect(typeof getCategorySpendingData).toBe('function');
      expect(typeof clearChartDataCache).toBe('function');
    });
  });

  describe('Error handling', () => {
    it('should handle network errors gracefully', async () => {
      mockGetMonthlySnapshots.mockRejectedValueOnce(new Error('Network error'));
      
      await expect(chartDataService.getBalanceTrendData(TIME_PERIODS.THREE_MONTHS, mockExchangeRates))
        .rejects.toThrow('Failed to fetch balance trend data');
    });

    it('should handle missing exchange rates', async () => {
      const result = await chartDataService.getBalanceTrendData(TIME_PERIODS.THREE_MONTHS, {});
      
      // Should fallback to original amounts when exchange rates are missing
      expect(result[0].balanceUSD).toBe(result[0].balance);
    });
  });
}); 