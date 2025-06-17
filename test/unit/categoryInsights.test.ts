import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateCategoryInsights,
  calculateZScore,
  calculateVariationCoefficient
} from '@/services/insights/categoryInsights';
import type {
  CategoryAggregate,
  CategoryChange,
  InsightGenerationContext,
  CategoryInsight
} from '@/types/analytics';

describe('categoryInsights', () => {
  let mockContext: InsightGenerationContext;

  beforeEach(() => {
    mockContext = {
      userId: 'test-user-123',
      timePeriod: 3,
      categoryData: [],
      categoryChanges: []
    };
  });

  describe('generateCategoryInsights', () => {
    it('should generate spending spike insight for unusual increases', async () => {
      // Arrange: Create data with a significant spending spike
      mockContext.categoryChanges = [
        {
          categoryId: 'dining',
          categoryName: 'Dining',
          type: 'expense',
          currentTotal: 15000, // NGN 15,000
          previousTotal: 10000, // NGN 10,000
          absoluteChange: 5000,
          percentageChange: 50, // 50% increase - should trigger spike insight
          isSignificant: true,
          currency: 'NGN',
          changeType: 'MoM'
        }
      ];

      mockContext.categoryData = [
        {
          categoryId: 'dining',
          categoryName: 'Dining',
          total: 15000,
          percentage: 30,
          currency: 'NGN',
          type: 'expense'
        }
      ];

      // Act
      const insights = await generateCategoryInsights(mockContext);

      // Assert
      expect(insights.length).toBeGreaterThan(0);
      const spikeInsight = insights.find(insight => insight.type === 'spending_spike');
      expect(spikeInsight).toBeDefined();
      expect(spikeInsight?.severity).toBe('warning');
      expect(spikeInsight?.categoryName).toBe('Dining');
      expect(spikeInsight?.title).toContain('Unusual spike in Dining');
      expect(spikeInsight?.description).toContain('50.0%');
      expect(spikeInsight?.actionSuggestion).toBeDefined();
    });

    it('should generate spending drop insight for significant decreases', async () => {
      // Arrange: Create data with a significant spending decrease
      mockContext.categoryChanges = [
        {
          categoryId: 'entertainment',
          categoryName: 'Entertainment',
          type: 'expense',
          currentTotal: 6000, // NGN 6,000
          previousTotal: 10000, // NGN 10,000
          absoluteChange: -4000,
          percentageChange: -40, // 40% decrease - should trigger drop insight
          isSignificant: true,
          currency: 'NGN',
          changeType: 'MoM'
        }
      ];

      mockContext.categoryData = [
        {
          categoryId: 'entertainment',
          categoryName: 'Entertainment',
          total: 6000,
          percentage: 15,
          currency: 'NGN',
          type: 'expense'
        }
      ];

      // Act
      const insights = await generateCategoryInsights(mockContext);

      // Assert
      expect(insights.length).toBeGreaterThan(0);
      const dropInsight = insights.find(insight => insight.type === 'spending_drop');
      expect(dropInsight).toBeDefined();
      expect(dropInsight?.severity).toBe('success');
      expect(dropInsight?.categoryName).toBe('Entertainment');
      expect(dropInsight?.title).toContain('Reduced Entertainment spending');
      expect(dropInsight?.description).toContain('40.0%');
    });

    it('should generate new category insight', async () => {
      // Arrange: Create data with a new category (previous total = 0)
      mockContext.categoryChanges = [
        {
          categoryId: 'fitness',
          categoryName: 'Fitness',
          type: 'expense',
          currentTotal: 8000, // NGN 8,000 - above new category minimum
          previousTotal: 0, // New category
          absoluteChange: 8000,
          percentageChange: 100,
          isSignificant: true,
          currency: 'NGN',
          changeType: 'MoM'
        }
      ];

      mockContext.categoryData = [
        {
          categoryId: 'fitness',
          categoryName: 'Fitness',
          total: 8000,
          percentage: 20,
          currency: 'NGN',
          type: 'expense'
        }
      ];

      // Act
      const insights = await generateCategoryInsights(mockContext);

      // Assert
      expect(insights.length).toBeGreaterThan(0);
      const newCategoryInsight = insights.find(insight => insight.type === 'new_category');
      expect(newCategoryInsight).toBeDefined();
      expect(newCategoryInsight?.severity).toBe('info');
      expect(newCategoryInsight?.categoryName).toBe('Fitness');
      expect(newCategoryInsight?.title).toContain('New spending category: Fitness');
    });

    it('should generate missing category insight', async () => {
      // Arrange: Create data with a missing category (current total = 0)
      mockContext.categoryChanges = [
        {
          categoryId: 'subscriptions',
          categoryName: 'Subscriptions',
          type: 'expense',
          currentTotal: 0, // No spending this period
          previousTotal: 2000, // Previously had spending
          absoluteChange: -2000,
          percentageChange: -100,
          isSignificant: true,
          currency: 'NGN',
          changeType: 'MoM'
        }
      ];

      // Act
      const insights = await generateCategoryInsights(mockContext);

      // Assert
      expect(insights.length).toBeGreaterThan(0);
      const missingInsight = insights.find(insight => insight.type === 'missing_category');
      expect(missingInsight).toBeDefined();
      expect(missingInsight?.severity).toBe('info');
      expect(missingInsight?.categoryName).toBe('Subscriptions');
      expect(missingInsight?.title).toContain('No Subscriptions spending this period');
    });

    it('should generate budget suggestion for high variability', async () => {
      // Arrange: Create data with high spending variability
      mockContext.categoryChanges = [
        {
          categoryId: 'groceries',
          categoryName: 'Groceries',
          type: 'expense',
          currentTotal: 20000,
          previousTotal: 15000,
          absoluteChange: 5000,
          percentageChange: 33.33, // High variability - should trigger budget suggestion
          isSignificant: true,
          currency: 'NGN',
          changeType: 'MoM'
        }
      ];

      mockContext.categoryData = [
        {
          categoryId: 'groceries',
          categoryName: 'Groceries',
          total: 20000,
          percentage: 25,
          currency: 'NGN',
          type: 'expense'
        }
      ];

      // Act
      const insights = await generateCategoryInsights(mockContext);

      // Assert
      const budgetInsight = insights.find(insight => insight.type === 'budget_suggestion');
      expect(budgetInsight).toBeDefined();
      expect(budgetInsight?.categoryName).toBe('Groceries');
      expect(budgetInsight?.title).toContain('Consider budgeting for Groceries');
    });

    it('should generate comparative alert for category concentration', async () => {
      // Arrange: Create data with one dominant category
      mockContext.categoryData = [
        {
          categoryId: 'rent',
          categoryName: 'Rent',
          total: 50000,
          percentage: 60, // 60% of total spending - should trigger alert
          currency: 'NGN',
          type: 'expense'
        },
        {
          categoryId: 'groceries',
          categoryName: 'Groceries',
          total: 10000,
          percentage: 12,
          currency: 'NGN',
          type: 'expense'
        }
      ];

      // Act
      const insights = await generateCategoryInsights(mockContext);

      // Assert
      const concentrationInsight = insights.find(insight => insight.type === 'comparative_alert');
      expect(concentrationInsight).toBeDefined();
      expect(concentrationInsight?.categoryName).toBe('Rent');
      expect(concentrationInsight?.title).toContain('Rent dominates your spending');
    });

    it('should generate positive trend insight for balanced essential spending', async () => {
      // Arrange: Create balanced essential category spending
      mockContext.categoryData = [
        {
          categoryId: 'groceries',
          categoryName: 'Groceries',
          total: 15000,
          percentage: 20, // 20% - good balance for essential category
          currency: 'NGN',
          type: 'expense'
        },
        {
          categoryId: 'utilities',
          categoryName: 'Utilities',
          total: 8000,
          percentage: 15, // 15% - good balance
          currency: 'NGN',
          type: 'expense'
        }
      ];

      // Act
      const insights = await generateCategoryInsights(mockContext);

      // Assert
      const positiveInsights = insights.filter(insight => insight.type === 'trend_positive');
      expect(positiveInsights.length).toBeGreaterThan(0);
      expect(positiveInsights[0].severity).toBe('success');
      expect(positiveInsights[0].title).toContain('Balanced');
    });

    it('should limit insights to maximum of 5', async () => {
      // Arrange: Create data that would generate many insights
      const categories = ['dining', 'entertainment', 'shopping', 'transport', 'utilities', 'groceries'];
      
      mockContext.categoryChanges = categories.map(cat => ({
        categoryId: cat,
        categoryName: cat.charAt(0).toUpperCase() + cat.slice(1),
        type: 'expense' as const,
        currentTotal: 15000,
        previousTotal: 10000,
        absoluteChange: 5000,
        percentageChange: 50, // All have spikes
        isSignificant: true,
        currency: 'NGN',
        changeType: 'MoM' as const
      }));

      mockContext.categoryData = categories.map(cat => ({
        categoryId: cat,
        categoryName: cat.charAt(0).toUpperCase() + cat.slice(1),
        total: 15000,
        percentage: 16.7,
        currency: 'NGN',
        type: 'expense' as const
      }));

      // Act
      const insights = await generateCategoryInsights(mockContext);

      // Assert
      expect(insights.length).toBeLessThanOrEqual(5);
    });

    it('should handle empty data gracefully', async () => {
      // Arrange: Empty context
      mockContext.categoryData = [];
      mockContext.categoryChanges = [];

      // Act
      const insights = await generateCategoryInsights(mockContext);

      // Assert
      expect(insights).toHaveLength(0);
    });

    it('should prioritize insights correctly', async () => {
      // Arrange: Create insights with different priorities
      mockContext.categoryChanges = [
        {
          categoryId: 'critical',
          categoryName: 'Critical',
          type: 'expense',
          currentTotal: 20000,
          previousTotal: 10000,
          absoluteChange: 10000,
          percentageChange: 100, // 100% increase - should be high priority
          isSignificant: true,
          currency: 'NGN',
          changeType: 'MoM'
        },
        {
          categoryId: 'moderate',
          categoryName: 'Moderate',
          type: 'expense',
          currentTotal: 11000,
          previousTotal: 10000,
          absoluteChange: 1000,
          percentageChange: 10, // 10% increase - lower priority
          isSignificant: true,
          currency: 'NGN',
          changeType: 'MoM'
        }
      ];

      mockContext.categoryData = [
        {
          categoryId: 'critical',
          categoryName: 'Critical',
          total: 20000,
          percentage: 40,
          currency: 'NGN',
          type: 'expense'
        },
        {
          categoryId: 'moderate',
          categoryName: 'Moderate',
          total: 11000,
          percentage: 22,
          currency: 'NGN',
          type: 'expense'
        }
      ];

      // Act
      const insights = await generateCategoryInsights(mockContext);

      // Assert
      expect(insights.length).toBeGreaterThan(0);
      // Check that insights are sorted by priority/amount
      const spikeInsights = insights.filter(insight => insight.type === 'spending_spike');
      if (spikeInsights.length > 1) {
        expect(spikeInsights[0].metadata.currentAmount).toBeGreaterThanOrEqual(spikeInsights[1].metadata.currentAmount);
      }
    });
  });

  describe('calculateZScore', () => {
    it('should calculate z-score correctly for normal distribution', () => {
      // Arrange
      const values = [10, 12, 15, 18, 20]; // Mean = 15, SD ≈ 4.18
      const targetValue = 23; // Should be about 2.17 z-score

      // Act
      const zScore = calculateZScore(values, targetValue);

      // Assert
      expect(zScore).toBeCloseTo(2.17, 1);
    });

    it('should return 0 for insufficient data', () => {
      // Arrange
      const values = [10]; // Only one value
      const targetValue = 15;

      // Act
      const zScore = calculateZScore(values, targetValue);

      // Assert
      expect(zScore).toBe(0);
    });

    it('should return 0 for zero standard deviation', () => {
      // Arrange
      const values = [10, 10, 10, 10]; // All same values
      const targetValue = 10;

      // Act
      const zScore = calculateZScore(values, targetValue);

      // Assert
      expect(zScore).toBe(0);
    });
  });

  describe('calculateVariationCoefficient', () => {
    it('should calculate coefficient of variation correctly', () => {
      // Arrange
      const values = [100, 110, 90, 105, 95]; // Mean = 100, CV should be ~7.07%

      // Act
      const cv = calculateVariationCoefficient(values);

      // Assert
      expect(cv).toBeCloseTo(7.07, 1);
    });

    it('should return 0 for insufficient data', () => {
      // Arrange
      const values = [100]; // Only one value

      // Act
      const cv = calculateVariationCoefficient(values);

      // Assert
      expect(cv).toBe(0);
    });

    it('should return 0 for zero mean', () => {
      // Arrange
      const values = [0, 0, 0]; // All zeros

      // Act
      const cv = calculateVariationCoefficient(values);

      // Assert
      expect(cv).toBe(0);
    });

    it('should handle high variability correctly', () => {
      // Arrange
      const values = [10, 50, 100, 5, 200]; // High variation

      // Act
      const cv = calculateVariationCoefficient(values);

      // Assert
      expect(cv).toBeGreaterThan(50); // Should be high CV
    });
  });
}); 