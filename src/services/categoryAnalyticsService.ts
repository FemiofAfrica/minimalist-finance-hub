import { supabase } from '@/integrations/supabase/client';
import { CategoryAggregate, CategoryType } from '@/types/analytics';

// Percentage factor extracted as a constant to follow the DRY rule
const PERCENT_FACTOR = 100;

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
    const amountAbs = Math.abs(Number(tx.amount));
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