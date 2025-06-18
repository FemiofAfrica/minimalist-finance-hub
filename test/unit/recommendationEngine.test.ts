import { describe, it, expect } from 'vitest';
import { RecommendationEngine } from '@/services/insights/recommendationEngine';
import type { MonthlyAnalysis } from '@/types/insights';

const buildMonth = (overrides: Partial<MonthlyAnalysis>): MonthlyAnalysis => ({
  month: '2025-05',
  totalIncome: 100000,
  totalExpenses: 50000,
  netAmount: 50000,
  categoryBreakdown: [],
  anomalies: [],
  balanceTrend: 0,
  housingRatio: 20,
  subscriptionTotal: 0,
  ...overrides
});

describe('RecommendationEngine', () => {
  const engine = new RecommendationEngine();

  it('generates cash-flow recommendation when expenses are high', () => {
    const recs = engine.generateRecommendations({
      currentMonth: buildMonth({ totalIncome: 100000, totalExpenses: 95000 }),
    });
    expect(recs.some(r => r.title.includes('cash flow'))).toBe(true);
  });

  it('generates subscription recommendation from subscription alert insight', () => {
    const recs = engine.generateRecommendations({
      currentMonth: buildMonth({}),
      insights: [{
        id: 'subscription-alert-1',
        type: 'alert',
        title: 'High Recurring',
        description: '',
        severity: 'low',
        category: 'subscriptions',
        actionable: false,
        dismissible: true,
        createdAt: new Date()
      }] as any
    } as any);
    expect(recs.some(r => r.title.toLowerCase().includes('subscription'))).toBe(true);
  });
}); 