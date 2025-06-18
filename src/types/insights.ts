export interface InsightThresholds {
  expenseIncreasePercent: number;
  incomeDecreasePercent: number;
  categorySpikePer: number;
  balanceTrendMonths: number;
  housingRatioPercent: number;
  subscriptionThreshold: number;
}

export interface SpendingPattern {
  categoryId: string;
  categoryName: string;
  currentAmount: number;
  previousAmount: number;
  changePercent: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  isAnomaly: boolean;
}

export interface FinancialAnomaly {
  type: 'expense_spike' | 'income_drop' | 'category_unusual' | 'balance_negative';
  severity: 'low' | 'medium' | 'high';
  description: string;
  affectedAmount: number;
  changePercent?: number;
  categoryId?: string;
  monthsAffected?: number;
}

export interface InsightType {
  id: string;
  type: 'alert' | 'tip' | 'achievement' | 'recommendation';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  category: string;
  actionable: boolean;
  actionText?: string;
  actionUrl?: string;
  dismissible: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

export interface UserInsightPreferences {
  enableAlerts: boolean;
  enableTips: boolean;
  enableAchievements: boolean;
  enableRecommendations: boolean;
  alertThresholds: Partial<InsightThresholds>;
  dismissedInsights: string[];
}

export interface MonthlyAnalysis {
  month: string;
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  categoryBreakdown: SpendingPattern[];
  anomalies: FinancialAnomaly[];
  balanceTrend: number;
  housingRatio: number;
  subscriptionTotal: number;
}

export interface InsightAnalysisResult {
  userId: string;
  analysisDate: Date;
  currentMonth: MonthlyAnalysis;
  previousMonth?: MonthlyAnalysis;
  insights: InsightType[];
  summary: {
    totalInsights: number;
    alertCount: number;
    tipCount: number;
    achievementCount: number;
    recommendationCount: number;
  };
} 