import { describe, it, expect, beforeEach } from 'vitest';
import { ExplanationService, createExplanationContext } from '@/services/explanationService';
import type { ComparativeInsights } from '@/types/comparativeData';
import type { ExplanationContext } from '@/types/chartData';

describe('ExplanationService', () => {
  let service: ExplanationService;
  let mockComparativeInsights: ComparativeInsights;
  let mockContext: ExplanationContext;

  beforeEach(() => {
    service = new ExplanationService();
    
    mockComparativeInsights = {
      monthOverMonth: {
        income: {
          current: 5000,
          previous: 4000,
          absoluteChange: 1000,
          percentageChange: 25,
          trend: { direction: 'up', strength: 'significant', confidence: 'high' },
          dataAvailable: true
        },
        expenses: {
          current: 3000,
          previous: 3500,
          absoluteChange: -500,
          percentageChange: -16,
          trend: { direction: 'down', strength: 'moderate', confidence: 'medium' },
          dataAvailable: true
        },
        balance: {
          current: 2000,
          previous: 500,
          absoluteChange: 1500,
          percentageChange: 300,
          trend: { direction: 'up', strength: 'significant', confidence: 'high' },
          dataAvailable: true
        }
      }
    };

    mockContext = {
      currentMonth: 'June 2025',
      previousMonth: 'May 2025',
      hasHistoricalData: true,
      dataQuality: 'good',
      availableMonths: 6
    };
  });

  describe('generateExplanations', () => {
    it('should generate explanations for all available metrics', () => {
      const explanations = service.generateExplanations(mockComparativeInsights, mockContext);
      
      expect(explanations).toBeDefined();
      expect(explanations.length).toBeGreaterThan(0);
      
      // Should have explanations for income, expenses, and balance
      const categories = explanations.map(exp => exp.category);
      expect(categories).toContain('income');
      expect(categories).toContain('expenses');
      expect(categories).toContain('balance');
    });

    it('should filter explanations by confidence threshold', () => {
      const lowConfidenceService = new ExplanationService({
        minimumConfidence: 0.95
      });
      
      const explanations = lowConfidenceService.generateExplanations(mockComparativeInsights, mockContext);
      
      explanations.forEach(explanation => {
        expect(explanation.confidence).toBeGreaterThanOrEqual(0.95);
      });
    });

    it('should limit number of explanations per configuration', () => {
      const limitedService = new ExplanationService({
        maxExplanationsPerMetric: 1
      });
      
      const explanations = limitedService.generateExplanations(mockComparativeInsights, mockContext);
      
      expect(explanations.length).toBeLessThanOrEqual(3); // 1 per metric type
    });

    it('should handle missing comparative data gracefully', () => {
      const emptyInsights: ComparativeInsights = {};
      
      const explanations = service.generateExplanations(emptyInsights, mockContext);
      
      expect(explanations).toBeDefined();
      expect(explanations.length).toBe(0);
    });

    it('should handle NaN values in percentage changes', () => {
      const invalidInsights: ComparativeInsights = {
        monthOverMonth: {
          income: {
            current: 5000,
            previous: 0,
            absoluteChange: 5000,
            percentageChange: NaN,
            trend: { direction: 'up', strength: 'significant', confidence: 'high' },
            dataAvailable: false
          },
          expenses: {
            current: 3000,
            previous: 3500,
            absoluteChange: -500,
            percentageChange: -16,
            trend: { direction: 'down', strength: 'moderate', confidence: 'medium' },
            dataAvailable: true
          },
          balance: {
            current: 2000,
            previous: 500,
            absoluteChange: 1500,
            percentageChange: 300,
            trend: { direction: 'up', strength: 'significant', confidence: 'high' },
            dataAvailable: true
          }
        }
      };

      const explanations = service.generateExplanations(invalidInsights, mockContext);
      
      // Should still generate explanations for valid data
      expect(explanations.length).toBeGreaterThan(0);
      
      // Should not include explanations for NaN data
      const incomeExplanations = explanations.filter(exp => exp.category === 'income');
      expect(incomeExplanations.length).toBe(0);
    });
  });

  describe('significance determination', () => {
    it('should correctly classify change significance', () => {
      const testCases = [
        { change: 3, expected: 'minor' },
        { change: 16, expected: 'moderate' },
        { change: 30, expected: 'significant' },
        { change: 60, expected: 'major' }
      ];

      testCases.forEach(({ change, expected }) => {
        const insights: ComparativeInsights = {
          monthOverMonth: {
            income: {
              current: 1000,
              previous: 1000 - (change * 10),
              absoluteChange: change * 10,
              percentageChange: change,
              trend: { direction: 'up', strength: 'moderate', confidence: 'medium' },
              dataAvailable: true
            },
            expenses: {
              current: 500,
              previous: 500,
              absoluteChange: 0,
              percentageChange: 0,
              trend: { direction: 'neutral', strength: 'minimal', confidence: 'low' },
              dataAvailable: true
            },
            balance: {
              current: 500,
              previous: 500,
              absoluteChange: 0,
              percentageChange: 0,
              trend: { direction: 'neutral', strength: 'minimal', confidence: 'low' },
              dataAvailable: true
            }
          }
        };

        const explanations = service.generateExplanations(insights, mockContext);
        const incomeExplanation = explanations.find(exp => exp.category === 'income');
        
        if (expected === 'minor') {
          // Minor changes should not generate explanations
          expect(incomeExplanation).toBeUndefined();
        } else {
          expect(incomeExplanation).toBeDefined();
          expect(incomeExplanation!.significance).toBe(expected);
        }
      });
    });
  });

  describe('explanation types', () => {
    it('should assign correct types for income changes', () => {
      // Positive income change
      const positiveInsights: ComparativeInsights = {
        monthOverMonth: {
          income: {
            current: 5000,
            previous: 4000,
            absoluteChange: 1000,
            percentageChange: 25,
            trend: { direction: 'up', strength: 'significant', confidence: 'high' },
            dataAvailable: true
          },
          expenses: {
            current: 3000,
            previous: 3000,
            absoluteChange: 0,
            percentageChange: 0,
            trend: { direction: 'neutral', strength: 'minimal', confidence: 'low' },
            dataAvailable: true
          },
          balance: {
            current: 2000,
            previous: 1000,
            absoluteChange: 1000,
            percentageChange: 100,
            trend: { direction: 'up', strength: 'significant', confidence: 'high' },
            dataAvailable: true
          }
        }
      };

      const explanations = service.generateExplanations(positiveInsights, mockContext);
      const incomeExplanation = explanations.find(exp => exp.category === 'income');
      
      expect(incomeExplanation).toBeDefined();
      expect(incomeExplanation!.type).toBe('positive');
    });

    it('should assign correct types for expense changes', () => {
      // Expense increase should be warning
      const expenseIncreaseInsights: ComparativeInsights = {
        monthOverMonth: {
          income: {
            current: 4000,
            previous: 4000,
            absoluteChange: 0,
            percentageChange: 0,
            trend: { direction: 'neutral', strength: 'minimal', confidence: 'low' },
            dataAvailable: true
          },
          expenses: {
            current: 4000,
            previous: 3000,
            absoluteChange: 1000,
            percentageChange: 33.3,
            trend: { direction: 'up', strength: 'significant', confidence: 'high' },
            dataAvailable: true
          },
          balance: {
            current: 0,
            previous: 1000,
            absoluteChange: -1000,
            percentageChange: -100,
            trend: { direction: 'down', strength: 'significant', confidence: 'high' },
            dataAvailable: true
          }
        }
      };

      const explanations = service.generateExplanations(expenseIncreaseInsights, mockContext);
      const expenseExplanation = explanations.find(exp => exp.category === 'expenses');
      
      expect(expenseExplanation).toBeDefined();
      expect(expenseExplanation!.type).toBe('warning');
    });
  });

  describe('recommendations', () => {
    it('should generate recommendations when enabled', () => {
      const serviceWithRecommendations = new ExplanationService({
        enableRecommendations: true
      });

      const explanations = serviceWithRecommendations.generateExplanations(mockComparativeInsights, mockContext);
      
      explanations.forEach(explanation => {
        expect(explanation.recommendation).toBeDefined();
        expect(explanation.recommendation!.length).toBeGreaterThan(0);
      });
    });

    it('should not generate recommendations when disabled', () => {
      const serviceWithoutRecommendations = new ExplanationService({
        enableRecommendations: false
      });

      const explanations = serviceWithoutRecommendations.generateExplanations(mockComparativeInsights, mockContext);
      
      explanations.forEach(explanation => {
        expect(explanation.recommendation).toBeUndefined();
      });
    });
  });

  describe('confidence calculation', () => {
    it('should adjust confidence based on data quality', () => {
      const poorQualityContext: ExplanationContext = {
        ...mockContext,
        dataQuality: 'poor'
      };

      // Use a service with lower minimum confidence to ensure poor quality data still generates explanations
      const lowerConfidenceService = new ExplanationService({
        minimumConfidence: 0.5
      });

      const explanations = lowerConfidenceService.generateExplanations(mockComparativeInsights, mockContext);
      const poorQualityExplanations = lowerConfidenceService.generateExplanations(mockComparativeInsights, poorQualityContext);

      // Both should generate explanations
      expect(explanations.length).toBeGreaterThan(0);
      expect(poorQualityExplanations.length).toBeGreaterThan(0);
      
      // Poor quality should have lower confidence
      expect(poorQualityExplanations[0].confidence).toBeLessThan(explanations[0].confidence);
    });

    it('should adjust confidence based on significance', () => {
      const majorChangeInsights: ComparativeInsights = {
        monthOverMonth: {
          income: {
            current: 10000,
            previous: 5000,
            absoluteChange: 5000,
            percentageChange: 100, // Major change
            trend: { direction: 'up', strength: 'significant', confidence: 'high' },
            dataAvailable: true
          },
          expenses: {
            current: 3000,
            previous: 3000,
            absoluteChange: 0,
            percentageChange: 0,
            trend: { direction: 'neutral', strength: 'minimal', confidence: 'low' },
            dataAvailable: true
          },
          balance: {
            current: 7000,
            previous: 2000,
            absoluteChange: 5000,
            percentageChange: 250,
            trend: { direction: 'up', strength: 'significant', confidence: 'high' },
            dataAvailable: true
          }
        }
      };

      const majorExplanations = service.generateExplanations(majorChangeInsights, mockContext);
      const regularExplanations = service.generateExplanations(mockComparativeInsights, mockContext);

      const majorIncomeExp = majorExplanations.find(exp => exp.category === 'income');
      const regularIncomeExp = regularExplanations.find(exp => exp.category === 'income');

      expect(majorIncomeExp!.confidence).toBeGreaterThan(regularIncomeExp!.confidence);
    });
  });
});

describe('createExplanationContext', () => {
  it('should create context with correct data quality assessment', () => {
    const testCases = [
      { months: 1, expected: 'poor' },
      { months: 3, expected: 'limited' },
      { months: 5, expected: 'good' },
      { months: 8, expected: 'excellent' }
    ];

    testCases.forEach(({ months, expected }) => {
      const context = createExplanationContext(
        'June 2025',
        'May 2025',
        months
      );

      expect(context.dataQuality).toBe(expected);
      expect(context.availableMonths).toBe(months);
    });
  });

  it('should correctly determine historical data availability', () => {
    const withHistoricalData = createExplanationContext('June 2025', 'May 2025', 3);
    const withoutHistoricalData = createExplanationContext('June 2025', 'May 2025', 1);

    expect(withHistoricalData.hasHistoricalData).toBe(true);
    expect(withoutHistoricalData.hasHistoricalData).toBe(false);
  });

  it('should set correct month names', () => {
    const context = createExplanationContext('June 2025', 'May 2025', 6);

    expect(context.currentMonth).toBe('June 2025');
    expect(context.previousMonth).toBe('May 2025');
  });
}); 