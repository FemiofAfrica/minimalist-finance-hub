import { BadRequestError, InternalServerError } from "@/types/errors";
import { retryWithBackoff } from "@/utils/networkUtils";
import { CategoryExpense } from "@/types/dashboard";

type TransactionRow = Tables<"transactions">;
type TransactionWithCategory = TransactionRow & { categories: Tables<"categories"> | null };

/**
 * Fetches expense data grouped by category for the pie chart.
 * @param userId The ID of the user whose expenses to fetch.
 * @returns Promise<CategoryExpense[]> Array of category expenses
 */
export const fetchCategoryExpenses = async (userId: string): Promise<CategoryExpense[]> => {
  try {
    if (!userId) throw new BadRequestError("User ID must be provided to fetchCategoryExpenses");

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    
    const { data, error } = await retryWithBackoff(() => supabase
      .from('transactions')
      .select(`
        amount,
        category_id,
        categories (category_name)
      `)
      .eq('user_id', userId)
      .eq('type', 'expense')
      .gte('date', startOfMonth)
      .lte('date', endOfMonth));
    
    if (error) {
      console.error('Error fetching category expenses:', error);
      throw new InternalServerError(error.message);
    }
    
    // Group expenses by category
    const categoryMap = new Map<string, number>();
    
    data?.forEach((transaction: TransactionWithCategory) => {
      if (transaction.categories && transaction.categories.category_name) {
        const categoryName = transaction.categories.category_name;
        const amount = Math.abs(Number(transaction.amount));
        
        if (categoryMap.has(categoryName)) {
          categoryMap.set(categoryName, categoryMap.get(categoryName)! + amount);
        } else {
          categoryMap.set(categoryName, amount);
        }
      }
    });
    
    // Convert map to array format needed for the pie chart
    const result: CategoryExpense[] = Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value); // Sort by value descending
    
    return result;
  } catch (error) {
    console.error("Error in fetchCategoryExpenses:", error);
    if (error instanceof BadRequestError || error instanceof InternalServerError) throw error;
    throw new InternalServerError("Failed to fetch category expenses");
  }
};