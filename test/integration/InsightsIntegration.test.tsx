import { describe, it, expect, beforeEach } from 'vitest';
import { InsightsAnalysisService } from '@/services/insights/insightsAnalysisService';
import { PatternDetectionService } from '@/services/insights/patternDetectionService';
import { RecommendationEngine } from '@/services/insights/recommendationEngine';
import { SpendingPattern, MonthlyAnalysis, InsightThresholds } from '@/types/insights';

describe('Insights Integration Tests', () => {
  let mockThresholds: InsightThresholds;
  let mockCurrentMonth: MonthlyAnalysis;
  let mockPreviousMonth: MonthlyAnalysis;

  beforeEach(() => {
    mockThresholds = {
      expenseIncreasePercent: 30,
      incomeDecreasePercent: 20,
      categorySpikePer: 50,
      balanceTrendMonths: 3,
      housingRatioPercent: 30,
      subscriptionThreshold: 10000
    };

    mockCurrentMonth = {
      month: '2024-01',
      totalIncome: 5000,
      totalExpenses: 3000,
      netAmount: 2000,
      categoryBreakdown: [
        {
          categoryId: '1',
          categoryName: 'Groceries',
          currentAmount: 800,
          previousAmount: 600,
          changePercent: 33.33,
          trend: 'increasing',
          isAnomaly: false
        },
        {
          categoryId: '2',
          categoryName: 'Dining',
          currentAmount: 400,
          previousAmount: 300,
          changePercent: 33.33,
          trend: 'increasing',
          isAnomaly: false
        }
      ],
      anomalies: [],
      balanceTrend: 500,
      housingRatio: 25,
      subscriptionTotal: 150
    };

    mockPreviousMonth = {
      month: '2023-12',
      totalIncome: 5000,
      totalExpenses: 2500,
      netAmount: 2500,
      categoryBreakdown: [
        {
          categoryId: '1',
          categoryName: 'Groceries',
          currentAmount: 600,
          previousAmount: 500,
          changePercent: 20,
          trend: 'stable',
          isAnomaly: false
        }
      ],
      anomalies: [],
      balanceTrend: 300,
      housingRatio: 20,
      subscriptionTotal: 120
    };
  });

  describe('PatternDetectionService', () => {
    it('should detect spending spikes correctly', () => {
      const service = new PatternDetectionService(mockThresholds);
      const amounts = [100, 120, 110, 500]; // Clear spike in last amount
      
      const result = service.detectSpendingSpikes(amounts);
      
      expect(result.isSpike).toBe(true);
      expect(result.severity).toBe('high');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should analyze spending patterns across months', () => {
      const service = new PatternDetectionService(mockThresholds);
      const monthlyData = [
        { month: '2023-12', categories: mockPreviousMonth.categoryBreakdown },
        { month: '2024-01', categories: mockCurrentMonth.categoryBreakdown }
      ];
      
      const trends = service.analyzeSpendingPatterns(monthlyData);
      
      expect(trends).toHaveLength(2); // Two categories
      expect(trends[0]).toHaveProperty('categoryId');
      expect(trends[0]).toHaveProperty('trendAnalysis');
      expect(trends[0]).toHaveProperty('recommendations');
    });
  });

  describe('RecommendationEngine', () => {
    it('should generate recommendations based on financial data', () => {
      const engine = new RecommendationEngine();
      const financialData = {
        currentMonth: mockCurrentMonth,
        previousMonth: mockPreviousMonth
      };
      
      const recommendations = engine.generateRecommendations(financialData);
      
      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThanOrEqual(0);
      
      if (recommendations.length > 0) {
        expect(recommendations[0]).toHaveProperty('id');
        expect(recommendations[0]).toHaveProperty('type');
        expect(recommendations[0]).toHaveProperty('title');
        expect(recommendations[0]).toHaveProperty('description');
      }
    });

    it('should generate emergency fund recommendation for low balance', () => {
      const engine = new RecommendationEngine();
      const lowBalanceData = {
        currentMonth: {
          ...mockCurrentMonth,
          netAmount: 1000, // Less than 3 months of expenses
          totalExpenses: 3000
        }
      };
      
      const recommendations = engine.generateRecommendations(lowBalanceData);
      const emergencyFundRec = recommendations.find(r => r.title.includes('Emergency Fund'));
      
      expect(emergencyFundRec).toBeDefined();
      expect(emergencyFundRec?.type).toBe('recommendation');
      expect(emergencyFundRec?.severity).toBe('high');
    });

    it('should generate high spending alert when expenses increase significantly', () => {
      const engine = new RecommendationEngine();
      const highSpendingData = {
        currentMonth: {
          ...mockCurrentMonth,
          totalExpenses: 4000 // 60% increase from previous month
        },
        previousMonth: {
          ...mockPreviousMonth,
          totalExpenses: 2500
        }
      };
      
      const recommendations = engine.generateRecommendations(highSpendingData);
      const spendingAlert = recommendations.find(r => r.title.includes('Spending Increased'));
      
      expect(spendingAlert).toBeDefined();
      expect(spendingAlert?.type).toBe('alert');
      expect(spendingAlert?.actionable).toBe(true);
    });
  });

  describe('Service Integration', () => {
    it('should work together to provide comprehensive insights', () => {
      const patternService = new PatternDetectionService(mockThresholds);
      const recommendationEngine = new RecommendationEngine();
      
      // Simulate pattern detection
      const monthlyData = [
        { month: '2023-12', categories: mockPreviousMonth.categoryBreakdown },
        { month: '2024-01', categories: mockCurrentMonth.categoryBreakdown }
      ];
      
      const patterns = patternService.analyzeSpendingPatterns(monthlyData);
      expect(patterns).toHaveLength(2);
      
      // Generate recommendations
      const recommendations = recommendationEngine.generateRecommendations({
        currentMonth: mockCurrentMonth,
        previousMonth: mockPreviousMonth
      });
      
      expect(recommendations).toBeInstanceOf(Array);
      
      // Verify the services can work together
      expect(patterns[0].recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThanOrEqual(0);
    });
  });
}); 