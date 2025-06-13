// Re-export chart data types from the service for centralized type management
export type {
  BalanceChartData,
  IncomeExpenseChartData,
  MonthlyTotalsChartData,
  CategorySpendingData,
  TimePeriod
} from '@/services/chartDataService';

// Re-export monthly snapshot types
export type {
  MonthlySnapshot,
  CurrentMonthData
} from '@/services/monthlySnapshotService';

// Import comparative data types
import type { ComparativeInsights } from '@/types/comparativeData';

// Extended monthly snapshot interface with comparative data
export interface MonthlySnapshotWithComparative extends MonthlySnapshot {
  comparative?: ComparativeInsights;
}

// Extended current month data with comparative insights
export interface CurrentMonthDataWithComparative extends CurrentMonthData {
  comparative?: ComparativeInsights;
}

// Additional chart-specific types
export interface ChartColors {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  gradient?: {
    start: string;
    end: string;
  };
}

export interface ChartTooltipData {
  label: string;
  value: string | number;
  formattedValue?: string;
  color?: string;
  percentage?: number;
}

export interface ChartLoadingState {
  isLoading: boolean;
  error: string | null;
  lastUpdated?: Date;
}

export interface ChartFilters {
  timePeriod: TimePeriod;
  dateRange?: {
    start: Date;
    end: Date;
  };
  categories?: string[];
  accounts?: string[];
}

// Chart component props interfaces
export interface BaseChartProps {
  height?: number;
  className?: string;
  showTooltip?: boolean;
  showLegend?: boolean;
  showGrid?: boolean;
  animate?: boolean;
  timePeriod: TimePeriod;
  onDataPointClick?: (data: any) => void;
  onPeriodChange?: (period: TimePeriod) => void;
}

export interface LineChartProps extends BaseChartProps {
  data: BalanceChartData[] | IncomeExpenseChartData[];
  showTrendLine?: boolean;
  smoothCurve?: boolean;
  showDataPoints?: boolean;
}

export interface BarChartProps extends BaseChartProps {
  data: MonthlyTotalsChartData[];
  orientation?: 'vertical' | 'horizontal';
  showComparison?: boolean;
  stackBars?: boolean;
}

export interface PieChartProps extends Omit<BaseChartProps, 'timePeriod'> {
  data: CategorySpendingData[];
  showPercentages?: boolean;
  innerRadius?: number;
  outerRadius?: number;
}

// Chart theme configuration
export interface ChartTheme {
  colors: ChartColors;
  fonts: {
    body: string;
    mono: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: number;
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
}

// Export predefined chart themes
export const chartThemes: Record<'light' | 'dark', ChartTheme> = {
  light: {
    colors: {
      primary: '#3B82F6',
      secondary: '#64748B',
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444',
      info: '#06B6D4',
      gradient: {
        start: '#3B82F6',
        end: '#1D4ED8'
      }
    },
    fonts: {
      body: 'Inter, sans-serif',
      mono: 'JetBrains Mono, monospace'
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32
    },
    borderRadius: 8,
    shadows: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
    }
  },
  dark: {
    colors: {
      primary: '#60A5FA',
      secondary: '#94A3B8',
      success: '#34D399',
      warning: '#FBBF24',
      danger: '#F87171',
      info: '#22D3EE',
      gradient: {
        start: '#60A5FA',
        end: '#3B82F6'
      }
    },
    fonts: {
      body: 'Inter, sans-serif',
      mono: 'JetBrains Mono, monospace'
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32
    },
    borderRadius: 8,
    shadows: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.3)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.3)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.3)'
    }
  }
};

// Utility type for chart data transformation
export type ChartDataTransformer<T, R> = (data: T[], options?: any) => R[];

// Common chart error types
export type ChartError = 
  | 'DATA_FETCH_ERROR'
  | 'INVALID_TIME_PERIOD'
  | 'CURRENCY_CONVERSION_ERROR'
  | 'INSUFFICIENT_DATA'
  | 'NETWORK_ERROR'
  | 'AUTHENTICATION_ERROR';

export interface ChartErrorInfo {
  type: ChartError;
  message: string;
  details?: any;
  timestamp: Date;
} 