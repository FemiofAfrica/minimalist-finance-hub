export type CategoryType = 'income' | 'expense' | 'transfer';

export interface CategoryAggregate {
  /** Category identifier; 'uncategorized' when null */
  categoryId: string;
  /** Human-readable category name */
  categoryName: string;
  /** Sum of amounts within the period (always positive) */
  total: number;
  /** Share of grand total (0–100) */
  percentage: number;
  /** ISO currency code, e.g. 'USD' */
  currency: string;
  /** Category transaction type */
  type: CategoryType;
}

export interface CategoryChange {
  /** Category identifier */
  categoryId: string;
  /** Human-readable category name */
  categoryName: string;
  /** Category transaction type */
  type: CategoryType;
  /** Current period total amount */
  currentTotal: number;
  /** Previous period total amount for comparison */
  previousTotal: number;
  /** Absolute change between periods (current - previous) */
  absoluteChange: number;
  /** Percentage change between periods (0-100, can be negative) */
  percentageChange: number;
  /** Whether the change exceeds the significance threshold */
  isSignificant: boolean;
  /** ISO currency code */
  currency: string;
  /** Period type for this change calculation */
  changeType: 'MoM' | 'YoY';
}

export interface CategoryTrendPoint {
  /** Month in YYYY-MM format */
  month: string;
  /** Amount for this category in this month */
  amount: number;
  /** Percentage change from previous month (optional) */
  percentageChange?: number;
}

export interface CategoryTrendSeries {
  /** Category identifier */
  categoryId: string;
  /** Human-readable category name */
  categoryName: string;
  /** Category transaction type */
  type: CategoryType;
  /** ISO currency code */
  currency: string;
  /** Color for this series in charts */
  color: string;
  /** Array of monthly data points */
  data: CategoryTrendPoint[];
} 