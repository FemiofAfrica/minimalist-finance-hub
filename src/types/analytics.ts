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