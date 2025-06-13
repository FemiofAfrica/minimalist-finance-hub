import { supabase } from '@/integrations/supabase/client';
import { getHistoricalMonthlySnapshots, MonthlySnapshot } from './monthlySnapshotService';

// Base currency for the application (all amounts in database are stored in NGN)
const APP_BASE_CURRENCY = "NGN";

// Time period constants for chart filtering
export const TIME_PERIODS = {
  THREE_MONTHS: 3,
  SIX_MONTHS: 6,
  TWELVE_MONTHS: 12,
  TWENTY_FOUR_MONTHS: 24
} as const;

export type TimePeriod = typeof TIME_PERIODS[keyof typeof TIME_PERIODS];

// Chart data interfaces
export interface BalanceChartData {
  month: string;
  year: number;
  monthNum: number;
  balance: number;
  balanceUSD: number; // For currency conversion context
  formattedMonth: string; // e.g., "Jan 2024"
  tooltip: {
    month: string;
    balance: number;
    balanceUSD: number;
    change: number;
    changePercent: number;
  };
}

export interface IncomeExpenseChartData {
  month: string;
  year: number;
  monthNum: number;
  income: number;
  expenses: number;
  incomeUSD: number;
  expensesUSD: number;
  net: number;
  netUSD: number;
  formattedMonth: string;
  tooltip: {
    month: string;
    income: number;
    expenses: number;
    net: number;
    incomeUSD: number;
    expensesUSD: number;
    netUSD: number;
  };
}

export interface MonthlyTotalsChartData {
  month: string;
  year: number;
  monthNum: number;
  income: number;
  expenses: number;
  incomeUSD: number;
  expensesUSD: number;
  net: number;
  netUSD: number;
  formattedMonth: string;
  transactionCount: number;
  isDeficit: boolean; // expenses > income
  tooltip: {
    month: string;
    income: number;
    expenses: number;
    net: number;
    incomeUSD: number;
    expensesUSD: number;
    netUSD: number;
    transactionCount: number;
    incomePercentage: number;
    expensePercentage: number;
  };
}

export interface CategorySpendingData {
  category: string;
  amount: number;
  amountUSD: number;
  percentage: number;
  transactionCount: number;
  monthlyAverage: number;
  monthlyAverageUSD: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
}

// Helper functions
const formatMonthLabel = (year: number, month: number): string => {
  const date = new Date(year, month - 1);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    year: 'numeric' 
  });
};

const convertNgnToUsd = (amountNgn: number, exchangeRates: Record<string, number>): number => {
  const ngnRate = exchangeRates?.[APP_BASE_CURRENCY];
  if (ngnRate && typeof ngnRate === 'number' && ngnRate > 0) {
    return amountNgn / ngnRate;
  }
  // If conversion fails, return original amount (fallback)
  return amountNgn;
};

const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

// Chart data service functions
export class ChartDataService {
  private static instance: ChartDataService;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  static getInstance(): ChartDataService {
    if (!ChartDataService.instance) {
      ChartDataService.instance = new ChartDataService();
    }
    return ChartDataService.instance;
  }

  private getCacheKey(method: string, params: any[]): string {
    return `${method}_${JSON.stringify(params)}`;
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_TTL;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private getCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.data;
    }
    return null;
  }

  /**
   * Get historical balance trend data for line chart
   */
  async getBalanceTrendData(
    timePeriod: TimePeriod, 
    exchangeRates: Record<string, number> = {}
  ): Promise<BalanceChartData[]> {
    const cacheKey = this.getCacheKey('getBalanceTrendData', [timePeriod, exchangeRates]);
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      const snapshots = await getHistoricalMonthlySnapshots(timePeriod);
      
      if (!snapshots || snapshots.length === 0) {
        return [];
      }

      // Sort by year and month in ascending order for chronological display
      const sortedSnapshots = snapshots.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });

      const chartData: BalanceChartData[] = sortedSnapshots.map((snapshot, index) => {
        const balanceUSD = convertNgnToUsd(snapshot.closing_balance, exchangeRates);
        const formattedMonth = formatMonthLabel(snapshot.year, snapshot.month);
        
        // Calculate change from previous month
        const previousSnapshot = index > 0 ? sortedSnapshots[index - 1] : null;
        const change = previousSnapshot 
          ? snapshot.closing_balance - previousSnapshot.closing_balance 
          : 0;
        const changePercent = previousSnapshot 
          ? calculatePercentageChange(snapshot.closing_balance, previousSnapshot.closing_balance)
          : 0;

        return {
          month: `${snapshot.year}-${snapshot.month.toString().padStart(2, '0')}`,
          year: snapshot.year,
          monthNum: snapshot.month,
          balance: snapshot.closing_balance,
          balanceUSD,
          formattedMonth,
          tooltip: {
            month: formattedMonth,
            balance: snapshot.closing_balance,
            balanceUSD,
            change,
            changePercent
          }
        };
      });

      this.setCache(cacheKey, chartData);
      return chartData;
    } catch (error) {
      console.error('Error fetching balance trend data:', error);
      throw new Error('Failed to fetch balance trend data');
    }
  }

  /**
   * Get income vs expenses comparison data for dual-line chart
   */
  async getIncomeExpenseComparisonData(
    timePeriod: TimePeriod, 
    exchangeRates: Record<string, number> = {}
  ): Promise<IncomeExpenseChartData[]> {
    const cacheKey = this.getCacheKey('getIncomeExpenseComparisonData', [timePeriod, exchangeRates]);
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      const snapshots = await getHistoricalMonthlySnapshots(timePeriod);
      
      if (!snapshots || snapshots.length === 0) {
        return [];
      }

      // Sort by year and month in ascending order
      const sortedSnapshots = snapshots.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });

      const chartData: IncomeExpenseChartData[] = sortedSnapshots.map((snapshot) => {
        const incomeUSD = convertNgnToUsd(snapshot.total_income, exchangeRates);
        const expensesUSD = convertNgnToUsd(snapshot.total_expenses, exchangeRates);
        const net = snapshot.total_income - snapshot.total_expenses;
        const netUSD = convertNgnToUsd(net, exchangeRates);
        const formattedMonth = formatMonthLabel(snapshot.year, snapshot.month);

        return {
          month: `${snapshot.year}-${snapshot.month.toString().padStart(2, '0')}`,
          year: snapshot.year,
          monthNum: snapshot.month,
          income: snapshot.total_income,
          expenses: snapshot.total_expenses,
          incomeUSD,
          expensesUSD,
          net,
          netUSD,
          formattedMonth,
          tooltip: {
            month: formattedMonth,
            income: snapshot.total_income,
            expenses: snapshot.total_expenses,
            net,
            incomeUSD,
            expensesUSD,
            netUSD
          }
        };
      });

      this.setCache(cacheKey, chartData);
      return chartData;
    } catch (error) {
      console.error('Error fetching income vs expense data:', error);
      throw new Error('Failed to fetch income vs expense comparison data');
    }
  }

  /**
   * Get monthly totals data for bar chart
   */
  async getMonthlyTotalsData(
    timePeriod: TimePeriod, 
    exchangeRates: Record<string, number> = {}
  ): Promise<MonthlyTotalsChartData[]> {
    const cacheKey = this.getCacheKey('getMonthlyTotalsData', [timePeriod, exchangeRates]);
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      const snapshots = await getHistoricalMonthlySnapshots(timePeriod);
      
      if (!snapshots || snapshots.length === 0) {
        return [];
      }

      // Sort by year and month in ascending order
      const sortedSnapshots = snapshots.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });

      const chartData: MonthlyTotalsChartData[] = sortedSnapshots.map((snapshot) => {
        const incomeUSD = convertNgnToUsd(snapshot.total_income, exchangeRates);
        const expensesUSD = convertNgnToUsd(snapshot.total_expenses, exchangeRates);
        const net = snapshot.total_income - snapshot.total_expenses;
        const netUSD = convertNgnToUsd(net, exchangeRates);
        const formattedMonth = formatMonthLabel(snapshot.year, snapshot.month);
        const isDeficit = snapshot.total_expenses > snapshot.total_income;

        // Calculate percentages for tooltip
        const total = snapshot.total_income + snapshot.total_expenses;
        const incomePercentage = total > 0 ? Math.round((snapshot.total_income / total) * 100) : 0;
        const expensePercentage = total > 0 ? Math.round((snapshot.total_expenses / total) * 100) : 0;

        return {
          month: `${snapshot.year}-${snapshot.month.toString().padStart(2, '0')}`,
          year: snapshot.year,
          monthNum: snapshot.month,
          income: snapshot.total_income,
          expenses: snapshot.total_expenses,
          incomeUSD,
          expensesUSD,
          net,
          netUSD,
          formattedMonth,
          transactionCount: snapshot.transaction_count,
          isDeficit,
          tooltip: {
            month: formattedMonth,
            income: snapshot.total_income,
            expenses: snapshot.total_expenses,
            net,
            incomeUSD,
            expensesUSD,
            netUSD,
            transactionCount: snapshot.transaction_count,
            incomePercentage,
            expensePercentage
          }
        };
      });

      this.setCache(cacheKey, chartData);
      return chartData;
    } catch (error) {
      console.error('Error fetching monthly totals data:', error);
      throw new Error('Failed to fetch monthly totals data');
    }
  }

  /**
   * Get category spending breakdown data
   */
  async getCategorySpendingData(
    timePeriod: TimePeriod, 
    exchangeRates: Record<string, number> = {}
  ): Promise<CategorySpendingData[]> {
    const cacheKey = this.getCacheKey('getCategorySpendingData', [timePeriod, exchangeRates]);
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Calculate date range for the time period
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - timePeriod);

      // Fetch category spending data
      const { data: categoryData, error } = await supabase
        .from('transactions')
        .select(`
          amount,
          category_name,
          date,
          categories (
            name,
            type
          )
        `)
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      if (error) throw error;

      if (!categoryData || categoryData.length === 0) {
        return [];
      }

      // Group by category and calculate totals
      const categoryTotals = new Map<string, {
        amount: number;
        transactionCount: number;
        monthlyAmounts: number[];
      }>();

      categoryData.forEach(transaction => {
        const categoryName = transaction.category_name || 'Uncategorized';
        const amount = Math.abs(Number(transaction.amount));

        if (!categoryTotals.has(categoryName)) {
          categoryTotals.set(categoryName, {
            amount: 0,
            transactionCount: 0,
            monthlyAmounts: []
          });
        }

        const categoryInfo = categoryTotals.get(categoryName)!;
        categoryInfo.amount += amount;
        categoryInfo.transactionCount += 1;
        categoryInfo.monthlyAmounts.push(amount);
      });

      // Calculate total spending for percentages
      const totalSpending = Array.from(categoryTotals.values())
        .reduce((sum, cat) => sum + cat.amount, 0);

      // Convert to chart data format
      const chartData: CategorySpendingData[] = Array.from(categoryTotals.entries())
        .map(([category, data]) => {
          const amountUSD = convertNgnToUsd(data.amount, exchangeRates);
          const monthlyAverage = data.amount / timePeriod;
          const monthlyAverageUSD = convertNgnToUsd(monthlyAverage, exchangeRates);
          const percentage = totalSpending > 0 ? (data.amount / totalSpending) * 100 : 0;

          return {
            category,
            amount: data.amount,
            amountUSD,
            percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal
            transactionCount: data.transactionCount,
            monthlyAverage,
            monthlyAverageUSD,
            trend: 'stable' as const, // TODO: Calculate actual trend in future enhancement
            trendPercent: 0
          };
        })
        .sort((a, b) => b.amount - a.amount); // Sort by amount descending

      this.setCache(cacheKey, chartData);
      return chartData;
    } catch (error) {
      console.error('Error fetching category spending data:', error);
      throw new Error('Failed to fetch category spending data');
    }
  }

  /**
   * Clear all cached data (useful when transactions are updated)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Convenience functions for direct usage
export const chartDataService = ChartDataService.getInstance();

export const getBalanceTrendData = (timePeriod: TimePeriod, exchangeRates?: Record<string, number>) =>
  chartDataService.getBalanceTrendData(timePeriod, exchangeRates);

export const getIncomeExpenseComparisonData = (timePeriod: TimePeriod, exchangeRates?: Record<string, number>) =>
  chartDataService.getIncomeExpenseComparisonData(timePeriod, exchangeRates);

export const getMonthlyTotalsData = (timePeriod: TimePeriod, exchangeRates?: Record<string, number>) =>
  chartDataService.getMonthlyTotalsData(timePeriod, exchangeRates);

export const getCategorySpendingData = (timePeriod: TimePeriod, exchangeRates?: Record<string, number>) =>
  chartDataService.getCategorySpendingData(timePeriod, exchangeRates);

export const clearChartDataCache = () => chartDataService.clearCache(); 