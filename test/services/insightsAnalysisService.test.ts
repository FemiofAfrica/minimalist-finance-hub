import { describe, it, expect } from 'vitest';
import { createInsightsAnalysisService } from '@/services/insights/insightsAnalysisService';
import type { MonthlyAnalysis } from '@/types/insights';

// Helper to build MonthlyAnalysis quickly
const buildMonthly = (overrides: Partial<MonthlyAnalysis>): MonthlyAnalysis => ({
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

// Dummy user id
const userId = 'test-user';

describe('InsightsAnalysisService comparative rules', () => {
  it('detects expense increase alert', () => {
    const svc: any = createInsightsAnalysisService(userId);

    const prev = buildMonthly({ totalExpenses: 100000 });
    const cur = buildMonthly({ totalExpenses: 140000 }); // 40% increase

    const insights = svc.generateComparativeInsights(cur, prev);
    const alert = insights.find((i: any) => i.id.startsWith('expense-increase'));
    expect(alert).toBeDefined();
    expect(alert.severity).toBe('medium');
  });

  it('detects income decrease alert', () => {
    const svc: any = createInsightsAnalysisService(userId);
    const prev = buildMonthly({ totalIncome: 100000 });
    const cur = buildMonthly({ totalIncome: 70000 }); // 30% drop
    const insights = svc.generateComparativeInsights(cur, prev);
    const inc = insights.find((i: any) => i.id.startsWith('income-drop'));
    expect(inc).toBeDefined();
  });
});

describe('InsightsAnalysisService threshold rules', () => {
  it('detects housing ratio tip', () => {
    const svc: any = createInsightsAnalysisService(userId);
    const cur = buildMonthly({ housingRatio: 40 });
    const insights = svc.generateThresholdInsights(cur);
    expect(insights.some((i: any) => i.id.startsWith('housing-ratio'))).toBe(true);
  });

  it('detects subscription cost alert', () => {
    const svc: any = createInsightsAnalysisService(userId);
    const cur = buildMonthly({ subscriptionTotal: 20000 });
    const insights = svc.generateThresholdInsights(cur);
    expect(insights.find((i: any) => i.id.startsWith('subscription-alert'))).toBeTruthy();
  });

  it('detects cash flow warning', () => {
    const svc: any = createInsightsAnalysisService(userId);
    const cur = buildMonthly({ totalExpenses: 95000, totalIncome: 100000 });
    const insights = svc.generateThresholdInsights(cur);
    expect(insights.some((i: any) => i.id.startsWith('cashflow-warning'))).toBe(true);
  });
}); 