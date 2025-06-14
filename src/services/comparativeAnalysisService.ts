import { 
  MonthlySnapshot, 
  getMonthlySnapshot, 
  getMonthlySnapshots,
  getCurrentMonthData 
} from './monthlySnapshotService';
import {
  TrendDirection,
  ComparisonMetrics,
  MonthOverMonthComparison,
  YearOverYearComparison,
  ComparativeInsights,
  TrendThresholds,
  DEFAULT_TREND_THRESHOLDS
} from '@/types/comparativeData';
import { 
  safePercentageChange, 
  safeAbsoluteDifference, 
  safeTrendDirection,
  safeComparativeCalculation,
  safeCurrencyFormat
} from '@/utils/safeCalculations';
import { 
  isValidNumber, 
  sanitizeNumber, 
  validateFinancialData,
  hasSufficientDataForComparison 
} from '@/utils/dataValidation';

/**
 * Calculate percentage change between two values using safe calculations
 */
export const getPercentageChange = (current: number, previous: number): number => {
  const result = safePercentageChange(current, previous);
  return result.value;
};

/**
 * Calculate absolute difference between two values using safe calculations
 */
export const getAbsoluteDifference = (current: number, previous: number): number => {
  const result = safeAbsoluteDifference(current, previous);
  return result.value;
};

/**
 * Determine trend direction and strength based on percentage change
 */
export const calculateTrendDirection = (
  changePercentage: number, 
  thresholds: TrendThresholds = DEFAULT_TREND_THRESHOLDS
): TrendDirection => {
  // Validate input
  if (!isValidNumber(changePercentage)) {
    return { direction: 'neutral', strength: 'minimal', confidence: 'low' };
  }

  const absChange = Math.abs(changePercentage);
  
  let direction: 'up' | 'down' | 'neutral';
  if (changePercentage > thresholds.minimal) {
    direction = 'up';
  } else if (changePercentage < -thresholds.minimal) {
    direction = 'down';
  } else {
    direction = 'neutral';
  }

  let strength: 'significant' | 'moderate' | 'minimal';
  if (absChange >= thresholds.significant) {
    strength = 'significant';
  } else if (absChange >= thresholds.moderate) {
    strength = 'moderate';
  } else {
    strength = 'minimal';
  }

  // Confidence based on magnitude and consistency
  let confidence: 'high' | 'medium' | 'low';
  if (absChange >= thresholds.significant) {
    confidence = 'high';
  } else if (absChange >= thresholds.moderate) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return { direction, strength, confidence };
};

/**
 * Create comparison metrics for a specific financial metric with safe calculations
 */
const createComparisonMetrics = (
  current: number, 
  previous: number, 
  thresholds?: TrendThresholds
): ComparisonMetrics => {
  // Sanitize inputs
  const sanitizedCurrent = sanitizeNumber(current, 0);
  const sanitizedPrevious = sanitizeNumber(previous, 0);

  // Use safe calculations
  const calculation = safeComparativeCalculation(sanitizedCurrent, sanitizedPrevious);
  
  // Calculate trend with validation
  const trend = calculateTrendDirection(calculation.percentageChange, thresholds);

  return {
    current: calculation.current,
    previous: calculation.previous,
    absoluteChange: calculation.absoluteDifference,
    percentageChange: calculation.percentageChange,
    trend,
    dataAvailable: calculation.dataAvailable,
    calculationErrors: calculation.calculationErrors
  };
};

/**
 * Calculate month-over-month comparison
 */
export const calculateMonthOverMonth = async (
  year: number, 
  month: number,
  thresholds?: TrendThresholds
): Promise<MonthOverMonthComparison | null> => {
  try {
    // Get current month data
    const currentSnapshot = await getMonthlySnapshot(year, month);
    if (!currentSnapshot) {
      return null;
    }

    // Calculate previous month
    const previousMonth = month === 1 ? 12 : month - 1;
    const previousYear = month === 1 ? year - 1 : year;
    
    // Get previous month data
    const previousSnapshot = await getMonthlySnapshot(previousYear, previousMonth);
    if (!previousSnapshot) {
      return null;
    }

    // Calculate net change (income - expenses)
    const currentNet = currentSnapshot.total_income - currentSnapshot.total_expenses;
    const previousNet = previousSnapshot.total_income - previousSnapshot.total_expenses;

    return {
      income: createComparisonMetrics(
        currentSnapshot.total_income, 
        previousSnapshot.total_income, 
        thresholds
      ),
      expenses: createComparisonMetrics(
        currentSnapshot.total_expenses, 
        previousSnapshot.total_expenses, 
        thresholds
      ),
      balance: createComparisonMetrics(
        currentSnapshot.closing_balance, 
        previousSnapshot.closing_balance, 
        thresholds
      ),
      netChange: createComparisonMetrics(currentNet, previousNet, thresholds),
      period: {
        current: { year, month },
        previous: { year: previousYear, month: previousMonth }
      }
    };
  } catch (error) {
    console.error('Error calculating month-over-month comparison:', error);
    return null;
  }
};

/**
 * Calculate year-over-year comparison
 */
export const calculateYearOverYear = async (
  year: number, 
  month: number,
  thresholds?: TrendThresholds
): Promise<YearOverYearComparison | null> => {
  try {
    // Get current month data
    const currentSnapshot = await getMonthlySnapshot(year, month);
    if (!currentSnapshot) {
      return null;
    }

    // Get same month from previous year
    const yearAgoSnapshot = await getMonthlySnapshot(year - 1, month);
    if (!yearAgoSnapshot) {
      return null;
    }

    // Calculate net change (income - expenses)
    const currentNet = currentSnapshot.total_income - currentSnapshot.total_expenses;
    const yearAgoNet = yearAgoSnapshot.total_income - yearAgoSnapshot.total_expenses;

    // Determine seasonal pattern (simplified)
    const seasonalPattern = determineSeasonalPattern(currentSnapshot, yearAgoSnapshot);

    return {
      income: createComparisonMetrics(
        currentSnapshot.total_income, 
        yearAgoSnapshot.total_income, 
        thresholds
      ),
      expenses: createComparisonMetrics(
        currentSnapshot.total_expenses, 
        yearAgoSnapshot.total_expenses, 
        thresholds
      ),
      balance: createComparisonMetrics(
        currentSnapshot.closing_balance, 
        yearAgoSnapshot.closing_balance, 
        thresholds
      ),
      netChange: createComparisonMetrics(currentNet, yearAgoNet, thresholds),
      period: {
        current: { year, month },
        yearAgo: { year: year - 1, month }
      },
      seasonalPattern
    };
  } catch (error) {
    console.error('Error calculating year-over-year comparison:', error);
    return null;
  }
};

/**
 * Determine seasonal pattern based on YoY comparison
 */
const determineSeasonalPattern = (
  current: MonthlySnapshot, 
  yearAgo: MonthlySnapshot
): 'growing' | 'declining' | 'stable' | 'volatile' => {
  const incomeChange = getPercentageChange(current.total_income, yearAgo.total_income);
  const expenseChange = getPercentageChange(current.total_expenses, yearAgo.total_expenses);
  const balanceChange = getPercentageChange(current.closing_balance, yearAgo.closing_balance);

  const avgChange = (Math.abs(incomeChange) + Math.abs(expenseChange) + Math.abs(balanceChange)) / 3;

  if (avgChange > 30) {
    return 'volatile';
  } else if (balanceChange > 10) {
    return 'growing';
  } else if (balanceChange < -10) {
    return 'declining';
  } else {
    return 'stable';
  }
};

/**
 * Get comprehensive comparative insights for a specific month
 */
export const getComparativeInsights = async (
  year: number, 
  month: number,
  thresholds?: TrendThresholds
): Promise<ComparativeInsights> => {
  try {
    // Get available historical data
    const snapshots = await getMonthlySnapshots(24); // Get up to 2 years of data
    const monthsOfHistory = snapshots.length;

    // Calculate comparisons
    const monthOverMonth = await calculateMonthOverMonth(year, month, thresholds);
    const yearOverYear = await calculateYearOverYear(year, month, thresholds);

    // Determine data availability
    const hasPreviousMonth = monthOverMonth !== null;
    const hasYearAgoData = yearOverYear !== null;
    const hasInsufficientData = !hasPreviousMonth && !hasYearAgoData;

    return {
      monthOverMonth,
      yearOverYear,
      hasInsufficientData,
      dataAvailability: {
        hasPreviousMonth,
        hasYearAgoData,
        monthsOfHistory
      }
    };
  } catch (error) {
    console.error('Error getting comparative insights:', error);
    return {
      monthOverMonth: null,
      yearOverYear: null,
      hasInsufficientData: true,
      dataAvailability: {
        hasPreviousMonth: false,
        hasYearAgoData: false,
        monthsOfHistory: 0
      }
    };
  }
};

/**
 * Get comparative insights for current month
 */
export const getCurrentMonthComparativeInsights = async (
  thresholds?: TrendThresholds
): Promise<ComparativeInsights> => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  return getComparativeInsights(currentYear, currentMonth, thresholds);
};

/**
 * Format trend data for display
 */
export const formatTrendData = (metrics: ComparisonMetrics): {
  displayText: string;
  colorClass: string;
  iconDirection: 'up' | 'down' | 'neutral';
} => {
  const { trend, percentageChange, absoluteChange } = metrics;
  
  let displayText = '';
  let colorClass = '';
  let iconDirection: 'up' | 'down' | 'neutral' = trend.direction;

  // Format percentage
  const formattedPercentage = Math.abs(percentageChange).toFixed(1);
  
  // Create display text
  if (trend.direction === 'up') {
    displayText = `+${formattedPercentage}%`;
    colorClass = 'text-green-600';
  } else if (trend.direction === 'down') {
    displayText = `-${formattedPercentage}%`;
    colorClass = 'text-red-600';
  } else {
    displayText = `${formattedPercentage}%`;
    colorClass = 'text-gray-600';
  }

  return {
    displayText,
    colorClass,
    iconDirection
  };
}; 