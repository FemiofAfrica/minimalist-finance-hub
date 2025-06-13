export interface TrendDirection {
  direction: 'up' | 'down' | 'neutral';
  strength: 'significant' | 'moderate' | 'minimal';
  confidence: 'high' | 'medium' | 'low';
}

export interface ComparisonMetrics {
  current: number;
  previous: number;
  absoluteChange: number;
  percentageChange: number;
  trend: TrendDirection;
}

export interface MonthOverMonthComparison {
  income: ComparisonMetrics;
  expenses: ComparisonMetrics;
  balance: ComparisonMetrics;
  netChange: ComparisonMetrics;
  period: {
    current: { year: number; month: number };
    previous: { year: number; month: number };
  };
}

export interface YearOverYearComparison {
  income: ComparisonMetrics;
  expenses: ComparisonMetrics;
  balance: ComparisonMetrics;
  netChange: ComparisonMetrics;
  period: {
    current: { year: number; month: number };
    yearAgo: { year: number; month: number };
  };
  seasonalPattern?: 'growing' | 'declining' | 'stable' | 'volatile';
}

export interface ComparativeInsights {
  monthOverMonth: MonthOverMonthComparison | null;
  yearOverYear: YearOverYearComparison | null;
  hasInsufficientData: boolean;
  dataAvailability: {
    hasPreviousMonth: boolean;
    hasYearAgoData: boolean;
    monthsOfHistory: number;
  };
}

export interface TrendThresholds {
  significant: number; // e.g., 20%
  moderate: number;    // e.g., 10%
  minimal: number;     // e.g., 5%
}

export const DEFAULT_TREND_THRESHOLDS: TrendThresholds = {
  significant: 20,
  moderate: 10,
  minimal: 5
}; 