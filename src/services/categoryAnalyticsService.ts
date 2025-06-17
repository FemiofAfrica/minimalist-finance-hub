import { supabase } from '@/integrations/supabase/client';
import { CategoryAggregate, CategoryType, CategoryChange } from '@/types/analytics';

// Percentage factor extracted as a constant to follow the DRY rule
const PERCENT_FACTOR = 100;

// Threshold for determining significant changes (25%)
const SIGNIFICANT_CHANGE_THRESHOLD = 25;

// Currency normalization thresholds
const CURRENCY_NORMALIZATION = {
  NGN_KOBO_THRESHOLD: 10000000, // NGN 10M+ likely stored in kobo, divide by 100
  KOBO_TO_NAIRA_FACTOR: 100,
  USD_INFLATION_THRESHOLD: 1000000, // NGN 1M+ likely inflated by USD conversion
} as const;

/**
 * Normalizes currency amounts to handle cases where values might be stored in wrong units
 * or have been incorrectly inflated by the currency system assuming USD amounts
 * @param amount The raw amount from the database
 * @param currency The currency code (NGN, USD, etc.)
 * @returns The normalized amount in the correct currency unit
 */
function normalizeAmount(amount: number, currency: string): number {
  // Handle kobo to naira conversion
  if (currency === 'NGN' && Math.abs(amount) >= CURRENCY_NORMALIZATION.NGN_KOBO_THRESHOLD) {
    // Likely stored in kobo, convert to naira
    return amount / CURRENCY_NORMALIZATION.KOBO_TO_NAIRA_FACTOR;
  }
  
  // CRITICAL FIX: Handle amounts that were incorrectly inflated by USD conversion
  // If NGN amount is suspiciously large (>1M), it's likely a small USD amount that got inflated
  // We need to revert it back to a reasonable NGN amount and let live conversion handle it
  if (currency === 'NGN' && Math.abs(amount) >= CURRENCY_NORMALIZATION.USD_INFLATION_THRESHOLD) {
    // These amounts are likely in the hundreds of thousands or millions due to USD conversion
    // Revert them to reasonable NGN amounts (typically under 100k for most transactions)
    const revertedAmount = amount / 1000; // Divide by 1000 to get reasonable NGN amounts
    console.log(`Currency fix: Reverting inflated NGN ${amount.toLocaleString()} to NGN ${revertedAmount.toLocaleString()}`);
    return revertedAmount;
  }
  
  // For other currencies or amounts below threshold, return as-is
  return amount;
}

/**
 * Returns aggregated totals per category for the given user and time window.
 *
 * @param userId   The authenticated user's ID.
 * @param months   The number of past months (inclusive) to include. Must be > 0.
 * @param filter   Optional category type filter (income | expense | transfer).
 */
export async function getCategoryTotals(
  userId: string,
  months: number,
  filter?: CategoryType
): Promise<CategoryAggregate[]> {
  if (!userId) {
    throw new Error('getCategoryTotals: userId is required');
  }
  if (months <= 0) {
    throw new Error('getCategoryTotals: months must be greater than zero');
  }

  // Calculate the start date (first day of the month, "months – 1" months ago)
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1).toISOString();
  const endDate = now.toISOString();

  let query = supabase
    .from('transactions')
    .select(
      `amount, currency, type, category_id, categories (name, type)`
    )
    .eq('user_id', userId);

  if (filter) {
    query = query.eq('type', filter);
  }

  query = query
    .gte('date', startDate)
    .lte('date', endDate);

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching category totals:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Internal structure matching the select clause
  interface RawTxRow {
    amount: number;
    currency: string;
    type: CategoryType;
    category_id: string | null;
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    categories: { name: string | null; type: CategoryType | null } | null;
  }

  const aggregateMap = new Map<string, { name: string; type: CategoryType; total: number; currency: string }>();
  let grandTotal = 0;

  (data as RawTxRow[]).forEach((tx) => {
    // Normalise amount (treat expenses as positive values for aggregation)
    const rawAmount = Math.abs(Number(tx.amount));
    // Apply currency normalization to handle kobo/naira conversion issues
    const amountAbs = normalizeAmount(rawAmount, tx.currency);
    const categoryId = tx.category_id ?? 'uncategorized';
    const categoryName = tx.categories?.name ?? 'Uncategorized';
    const categoryType = tx.categories?.type ?? tx.type; // Fallback to tx.type if join missing

    const existing = aggregateMap.get(categoryId);
    if (existing) {
      existing.total += amountAbs;
    } else {
      aggregateMap.set(categoryId, {
        name: categoryName,
        type: categoryType as CategoryType,
        total: amountAbs,
        currency: tx.currency,
      });
    }

    grandTotal += amountAbs;
  });

  const aggregates: CategoryAggregate[] = Array.from(aggregateMap.entries())
    .map(([id, info]) => ({
      categoryId: id,
      categoryName: info.name,
      total: info.total,
      percentage: grandTotal ? (info.total / grandTotal) * PERCENT_FACTOR : 0,
      currency: info.currency,
      type: info.type,
    }))
    .sort((a, b) => b.total - a.total);

  return aggregates;
}

/**
 * Returns category change analysis comparing current period with previous period.
 * Calculates both month-over-month (MoM) and year-over-year (YoY) changes.
 *
 * @param userId   The authenticated user's ID.
 * @param months   The number of past months for current period. Must be > 0.
 */
export async function getCategoryChanges(
  userId: string,
  months: number
): Promise<CategoryChange[]> {
  if (!userId) {
    throw new Error('getCategoryChanges: userId is required');
  }
  if (months <= 0) {
    throw new Error('getCategoryChanges: months must be greater than zero');
  }

  // Get current period data
  const currentPeriodData = await getCategoryTotals(userId, months);
  
  // Get previous period data (same duration, but shifted back by the period length)
  const previousPeriodData = await getCategoryTotalsPeriod(userId, months, months);
  
  // Get year-over-year data (same period but 12 months back)
  const yearOverYearData = await getCategoryTotalsPeriod(userId, months, 12);

  // Create maps for efficient lookup
  const currentMap = new Map(currentPeriodData.map(cat => [cat.categoryId, cat]));
  const previousMap = new Map(previousPeriodData.map(cat => [cat.categoryId, cat]));
  const yearOverYearMap = new Map(yearOverYearData.map(cat => [cat.categoryId, cat]));

  // Get all unique category IDs from all periods
  const allCategoryIds = new Set([
    ...Array.from(currentMap.keys()),
    ...Array.from(previousMap.keys()),
    ...Array.from(yearOverYearMap.keys())
  ]);

  const changes: CategoryChange[] = [];

  // Calculate MoM changes
  for (const categoryId of Array.from(allCategoryIds)) {
    const current = currentMap.get(categoryId);
    const previous = previousMap.get(categoryId);
    
    if (current || previous) {
      const change = calculateCategoryChange(current, previous, 'MoM');
      if (change) {
        changes.push(change);
      }
    }
  }

  // Calculate YoY changes
  for (const categoryId of Array.from(allCategoryIds)) {
    const current = currentMap.get(categoryId);
    const yearAgo = yearOverYearMap.get(categoryId);
    
    if (current || yearAgo) {
      const change = calculateCategoryChange(current, yearAgo, 'YoY');
      if (change) {
        changes.push(change);
      }
    }
  }

  // Sort by absolute change magnitude (largest changes first)
  return changes.sort((a, b) => Math.abs(b.absoluteChange) - Math.abs(a.absoluteChange));
}

/**
 * Helper function to get category totals for a specific period offset.
 * 
 * @param userId The authenticated user's ID
 * @param months The number of months for the period duration
 * @param offsetMonths How many months back to start the period
 */
async function getCategoryTotalsPeriod(
  userId: string,
  months: number,
  offsetMonths: number,
  filter?: CategoryType
): Promise<CategoryAggregate[]> {
  if (!userId) {
    throw new Error('getCategoryTotalsPeriod: userId is required');
  }
  if (months <= 0 || offsetMonths < 0) {
    throw new Error('getCategoryTotalsPeriod: invalid period parameters');
  }

  // Calculate the date range for the offset period
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - offsetMonths - (months - 1), 1).toISOString();
  const endDate = new Date(now.getFullYear(), now.getMonth() - offsetMonths + 1, 0).toISOString();

  let query = supabase
    .from('transactions')
    .select(
      `amount, currency, type, category_id, categories (name, type)`
    )
    .eq('user_id', userId);

  if (filter) {
    query = query.eq('type', filter);
  }

  query = query
    .gte('date', startDate)
    .lte('date', endDate);

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching category totals for period:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Same aggregation logic as getCategoryTotals
  interface RawTxRow {
    amount: number;
    currency: string;
    type: CategoryType;
    category_id: string | null;
    categories: { name: string | null; type: CategoryType | null } | null;
  }

  const aggregateMap = new Map<string, { name: string; type: CategoryType; total: number; currency: string }>();
  let grandTotal = 0;

  (data as RawTxRow[]).forEach((tx) => {
    // Normalise amount (treat expenses as positive values for aggregation)
    const rawAmount = Math.abs(Number(tx.amount));
    // Apply currency normalization to handle kobo/naira conversion issues
    const amountAbs = normalizeAmount(rawAmount, tx.currency);
    const categoryId = tx.category_id ?? 'uncategorized';
    const categoryName = tx.categories?.name ?? 'Uncategorized';
    const categoryType = tx.categories?.type ?? tx.type;

    const existing = aggregateMap.get(categoryId);
    if (existing) {
      existing.total += amountAbs;
    } else {
      aggregateMap.set(categoryId, {
        name: categoryName,
        type: categoryType as CategoryType,
        total: amountAbs,
        currency: tx.currency,
      });
    }

    grandTotal += amountAbs;
  });

  const aggregates: CategoryAggregate[] = Array.from(aggregateMap.entries())
    .map(([id, info]) => ({
      categoryId: id,
      categoryName: info.name,
      total: info.total,
      percentage: grandTotal ? (info.total / grandTotal) * PERCENT_FACTOR : 0,
      currency: info.currency,
      type: info.type,
    }))
    .sort((a, b) => b.total - a.total);

  return aggregates;
}

/**
 * Helper function to calculate change metrics between two category periods.
 */
function calculateCategoryChange(
  current: CategoryAggregate | undefined,
  previous: CategoryAggregate | undefined,
  changeType: 'MoM' | 'YoY'
): CategoryChange | null {
  if (!current && !previous) {
    return null;
  }

  // Use current category info if available, otherwise previous
  const categoryInfo = current || previous!;
  
  const currentTotal = current?.total ?? 0;
  const previousTotal = previous?.total ?? 0;
  const absoluteChange = currentTotal - previousTotal;
  
  // Calculate percentage change, handling division by zero
  let percentageChange = 0;
  if (previousTotal > 0) {
    percentageChange = (absoluteChange / previousTotal) * PERCENT_FACTOR;
  } else if (currentTotal > 0) {
    // New category appeared, consider it as 100% increase
    percentageChange = PERCENT_FACTOR;
  }
  // If both are 0, percentage change remains 0

  const isSignificant = Math.abs(percentageChange) >= SIGNIFICANT_CHANGE_THRESHOLD;

  return {
    categoryId: categoryInfo.categoryId,
    categoryName: categoryInfo.categoryName,
    type: categoryInfo.type,
    currentTotal,
    previousTotal,
    absoluteChange,
    percentageChange,
    isSignificant,
    currency: categoryInfo.currency,
    changeType,
  };
} 