import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CategoryAggregate } from '@/types/analytics';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      }))
    }))
  }
}));

// Mock the categoryAnalyticsService module
vi.mock('@/services/categoryAnalyticsService', async () => {
  const actual = await vi.importActual('@/services/categoryAnalyticsService') as any;
  return {
    ...actual,
    getCategoryTotals: vi.fn(),
  };
});

// Import after mocking
import { getCategoryChanges, getCategoryTotals } from '@/services/categoryAnalyticsService';

// Get the mocked function
const mockGetCategoryTotals = getCategoryTotals as any;

describe('Category Change Analysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUserId = 'test-user-123';
  const mockMonths = 3;

  const createMockCategory = (
    id: string,
    name: string,
    total: number,
    type: 'income' | 'expense' | 'transfer' = 'expense'
  ): CategoryAggregate => ({
    categoryId: id,
    categoryName: name,
    total,
    percentage: 0,
    currency: 'USD',
    type,
  });

  describe('getCategoryChanges', () => {
    it('should calculate month-over-month and year-over-year changes correctly', async () => {
      const currentPeriod = [
        createMockCategory('cat1', 'Groceries', 1000),
        createMockCategory('cat2', 'Transport', 500),
      ];

      const previousPeriod = [
        createMockCategory('cat1', 'Groceries', 800),
        createMockCategory('cat2', 'Transport', 600),
      ];

      const yearOverYearPeriod = [
        createMockCategory('cat1', 'Groceries', 900),
        createMockCategory('cat2', 'Transport', 400),
      ];

      mockGetCategoryTotals
        .mockResolvedValueOnce(currentPeriod)
        .mockResolvedValueOnce(previousPeriod)
        .mockResolvedValueOnce(yearOverYearPeriod);

      const result = await getCategoryChanges(mockUserId, mockMonths);

      expect(result).toHaveLength(4); // 2 categories × 2 change types (MoM + YoY)

      const groceriesMoM = result.find(c => c.categoryId === 'cat1' && c.changeType === 'MoM');
      const groceriesYoY = result.find(c => c.categoryId === 'cat1' && c.changeType === 'YoY');

      expect(groceriesMoM).toEqual({
        categoryId: 'cat1',
        categoryName: 'Groceries',
        type: 'expense',
        currentTotal: 1000,
        previousTotal: 800,
        absoluteChange: 200,
        percentageChange: 25,
        isSignificant: true,
        currency: 'USD',
        changeType: 'MoM',
      });

      expect(groceriesYoY).toEqual({
        categoryId: 'cat1',
        categoryName: 'Groceries',
        type: 'expense',
        currentTotal: 1000,
        previousTotal: 900,
        absoluteChange: 100,
        percentageChange: expect.closeTo(11.11, 2),
        isSignificant: false,
        currency: 'USD',
        changeType: 'YoY',
      });
    });

    it('should validate input parameters', async () => {
      await expect(getCategoryChanges('', mockMonths)).rejects.toThrow('userId is required');
      await expect(getCategoryChanges(mockUserId, 0)).rejects.toThrow('months must be greater than zero');
      await expect(getCategoryChanges(mockUserId, -1)).rejects.toThrow('months must be greater than zero');
    });

    it('should handle new categories correctly', async () => {
      const currentPeriod = [
        createMockCategory('cat1', 'Groceries', 1000),
        createMockCategory('cat2', 'New Category', 300),
      ];

      const previousPeriod = [
        createMockCategory('cat1', 'Groceries', 800),
      ];

      const yearOverYearPeriod = [
        createMockCategory('cat1', 'Groceries', 900),
      ];

      mockGetCategoryTotals
        .mockResolvedValueOnce(currentPeriod)
        .mockResolvedValueOnce(previousPeriod)
        .mockResolvedValueOnce(yearOverYearPeriod);

      const result = await getCategoryChanges(mockUserId, mockMonths);

      const newCategoryMoM = result.find(c => c.categoryId === 'cat2' && c.changeType === 'MoM');

      expect(newCategoryMoM).toEqual({
        categoryId: 'cat2',
        categoryName: 'New Category',
        type: 'expense',
        currentTotal: 300,
        previousTotal: 0,
        absoluteChange: 300,
        percentageChange: 100,
        isSignificant: true,
        currency: 'USD',
        changeType: 'MoM',
      });
    });

    it('should mark changes as significant when exceeding 25% threshold', async () => {
      const currentPeriod = [
        createMockCategory('cat1', 'Just Below Threshold', 124), // 24% increase
        createMockCategory('cat2', 'Just At Threshold', 125),    // 25% increase
        createMockCategory('cat3', 'Above Threshold', 130),      // 30% increase
      ];

      const previousPeriod = [
        createMockCategory('cat1', 'Just Below Threshold', 100),
        createMockCategory('cat2', 'Just At Threshold', 100),
        createMockCategory('cat3', 'Above Threshold', 100),
      ];

      const yearOverYearPeriod = [];

      mockGetCategoryTotals
        .mockResolvedValueOnce(currentPeriod)
        .mockResolvedValueOnce(previousPeriod)
        .mockResolvedValueOnce(yearOverYearPeriod);

      const result = await getCategoryChanges(mockUserId, mockMonths);

      const belowThreshold = result.find(c => c.categoryId === 'cat1' && c.changeType === 'MoM');
      const atThreshold = result.find(c => c.categoryId === 'cat2' && c.changeType === 'MoM');
      const aboveThreshold = result.find(c => c.categoryId === 'cat3' && c.changeType === 'MoM');

      expect(belowThreshold?.isSignificant).toBe(false); // 24% < 25%
      expect(atThreshold?.isSignificant).toBe(true);     // 25% = 25%
      expect(aboveThreshold?.isSignificant).toBe(true);  // 30% > 25%
    });
  });
}); 