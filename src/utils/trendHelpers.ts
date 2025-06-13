import { TrendDirection } from '@/types/comparativeData';

export type MetricContext = 'income' | 'expenses' | 'balance' | 'net';

export interface TrendColors {
  text: string;
  background: string;
  border: string;
}

/**
 * Get appropriate colors for a trend based on context and direction
 */
export function getTrendColors(
  direction: TrendDirection['direction'],
  context: MetricContext,
  variant: 'default' | 'subtle' | 'strong' = 'default'
): TrendColors {
  // For income: up is good (green), down is bad (red)
  // For expenses: up is bad (red), down is good (green)
  // For balance/net: up is good (green), down is bad (red)
  
  const isPositiveTrend = 
    (context === 'income' && direction === 'up') ||
    (context === 'expenses' && direction === 'down') ||
    ((context === 'balance' || context === 'net') && direction === 'up');

  const isNegativeTrend = 
    (context === 'income' && direction === 'down') ||
    (context === 'expenses' && direction === 'up') ||
    ((context === 'balance' || context === 'net') && direction === 'down');

  if (direction === 'neutral') {
    return {
      text: 'text-muted-foreground',
      background: variant === 'subtle' ? 'bg-muted/50' : 'bg-muted',
      border: 'border-muted'
    };
  }

  if (isPositiveTrend) {
    switch (variant) {
      case 'subtle':
        return {
          text: 'text-green-700 dark:text-green-400',
          background: 'bg-green-50 dark:bg-green-950/50',
          border: 'border-green-200 dark:border-green-800'
        };
      case 'strong':
        return {
          text: 'text-white',
          background: 'bg-green-600',
          border: 'border-green-600'
        };
      default:
        return {
          text: 'text-green-600 dark:text-green-400',
          background: 'bg-green-100 dark:bg-green-950/30',
          border: 'border-green-300 dark:border-green-700'
        };
    }
  }

  if (isNegativeTrend) {
    switch (variant) {
      case 'subtle':
        return {
          text: 'text-red-700 dark:text-red-400',
          background: 'bg-red-50 dark:bg-red-950/50',
          border: 'border-red-200 dark:border-red-800'
        };
      case 'strong':
        return {
          text: 'text-white',
          background: 'bg-red-600',
          border: 'border-red-600'
        };
      default:
        return {
          text: 'text-red-600 dark:text-red-400',
          background: 'bg-red-100 dark:bg-red-950/30',
          border: 'border-red-300 dark:border-red-700'
        };
    }
  }

  // Fallback to neutral
  return {
    text: 'text-muted-foreground',
    background: 'bg-muted',
    border: 'border-muted'
  };
}

/**
 * Format percentage change for display
 */
export function formatPercentageChange(
  percentage: number,
  options: {
    showSign?: boolean;
    precision?: number;
    maxValue?: number;
  } = {}
): string {
  const { showSign = true, precision = 1, maxValue = 999 } = options;

  // Handle edge cases
  if (!isFinite(percentage)) {
    return 'N/A';
  }

  if (Math.abs(percentage) > maxValue) {
    return `${percentage > 0 ? '+' : ''}${maxValue}%+`;
  }

  const formatted = Math.abs(percentage).toFixed(precision);
  const sign = showSign ? (percentage >= 0 ? '+' : '-') : '';
  
  return `${sign}${formatted}%`;
}

/**
 * Get trend strength description
 */
export function getTrendStrengthLabel(strength: TrendDirection['strength']): string {
  switch (strength) {
    case 'significant':
      return 'Significant change';
    case 'moderate':
      return 'Moderate change';
    case 'minimal':
      return 'Minor change';
    default:
      return 'Change';
  }
}

/**
 * Get accessible description for trend
 */
export function getTrendDescription(
  direction: TrendDirection['direction'],
  percentage: number,
  context: MetricContext
): string {
  const formattedPercentage = formatPercentageChange(percentage, { showSign: false });
  
  const contextLabel = {
    income: 'income',
    expenses: 'expenses',
    balance: 'balance',
    net: 'net change'
  }[context];

  switch (direction) {
    case 'up':
      return `${contextLabel} increased by ${formattedPercentage}`;
    case 'down':
      return `${contextLabel} decreased by ${formattedPercentage}`;
    case 'neutral':
      return `${contextLabel} remained stable`;
    default:
      return `${contextLabel} changed by ${formattedPercentage}`;
  }
}

/**
 * Get arrow icon name based on direction
 */
export function getArrowIcon(direction: TrendDirection['direction']): string {
  switch (direction) {
    case 'up':
      return 'trending-up';
    case 'down':
      return 'trending-down';
    case 'neutral':
      return 'minus';
    default:
      return 'minus';
  }
} 