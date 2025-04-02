import { supabase, getCurrentUserId } from "@/integrations/supabase/client";
import { Transaction } from "@/types/transaction";

// Type for category expenses used in the pie chart
export type CategoryExpense = {
  name: string;
  value: number;
};

// Type for dashboard analytics data
export type DashboardAnalytics = {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  monthlyTransactionCount: number;
  incomeChange: number;
  expenseChange: number;
  balanceChange: number;
};

/**
 * Fetches expense data grouped by category for the pie chart
 * @returns Promise<CategoryExpense[]> Array of category expenses
 */
export const fetchCategoryExpenses = async (): Promise<CategoryExpense[]> => {
  try {
    console.log("Fetching category expenses...");
    const userId = await getCurrentUserId();
    
    // Get current month's start and end dates
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    
    // Fetch transactions with category information
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        amount,
        category_id,
        categories (category_name)
      `)
      .eq('user_id', userId)
      .eq('type', 'expense')
      .gte('date', startOfMonth)
      .lte('date', endOfMonth);
    
    if (error) {
      console.error('Error fetching category expenses:', error);
      throw error;
    }
    
    // Group expenses by category
    const categoryMap = new Map<string, number>();
    
    data?.forEach((transaction: any) => {
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
    
    console.log('Category expenses data:', result);
    return result;
  } catch (error) {
    console.error('Error in fetchCategoryExpenses:', error);
    return [];
  }
};

/**
 * Fetches analytics data for the dashboard
 * @returns Promise<DashboardAnalytics> Dashboard analytics data
 */
export const fetchDashboardAnalytics = async (): Promise<DashboardAnalytics> => {
  try {
    console.log("Fetching dashboard analytics...");
    const userId = await getCurrentUserId();
    
    // Get current and previous month date ranges
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();
    
    // Fetch current month transactions
    const { data: currentMonthData, error: currentMonthError } = await supabase
      .from('transactions')
      .select(`
        amount,
        type,
        categories (category_type)
      `)
      .eq('user_id', userId)
      .gte('date', currentMonthStart)
      .lte('date', currentMonthEnd);
    
    if (currentMonthError) {
      console.error('Error fetching current month transactions:', currentMonthError);
      throw currentMonthError;
    }
    
    // Fetch previous month transactions for comparison
    const { data: previousMonthData, error: previousMonthError } = await supabase
      .from('transactions')
      .select(`
        amount,
        type,
        categories (category_type)
      `)
      .eq('user_id', userId)
      .gte('date', previousMonthStart)
      .lte('date', previousMonthEnd);
    
    if (previousMonthError) {
      console.error('Error fetching previous month transactions:', previousMonthError);
      throw previousMonthError;
    }
    
    // Calculate current month metrics
    let totalIncome = 0;
    let totalExpense = 0;
    
    currentMonthData?.forEach((transaction: any) => {
      const amount = Number(transaction.amount);
      // Use transaction.type directly (which is from the transactions table)
      // or derive from categories if needed
      const transactionType = transaction.type ? transaction.type.toUpperCase() : 
                             (transaction.categories && transaction.categories.category_type ? 
                              transaction.categories.category_type.toUpperCase() : 'EXPENSE');
      
      if (transactionType === 'INCOME') {
        totalIncome += amount;
      } else if (transactionType === 'EXPENSE') {
        totalExpense += Math.abs(amount);
      }
    });
    
    const totalBalance = totalIncome - totalExpense;
    const monthlyTransactionCount = currentMonthData?.length || 0;
    
    // Calculate previous month metrics for comparison
    let previousIncome = 0;
    let previousExpense = 0;
    
    previousMonthData?.forEach((transaction: any) => {
      const amount = Number(transaction.amount);
      // Use transaction.type directly (which is from the transactions table)
      // or derive from categories if needed
      const transactionType = transaction.type ? transaction.type.toUpperCase() : 
                             (transaction.categories && transaction.categories.category_type ? 
                              transaction.categories.category_type.toUpperCase() : 'EXPENSE');
      
      if (transactionType === 'INCOME') {
        previousIncome += amount;
      } else if (transactionType === 'EXPENSE') {
        previousExpense += Math.abs(amount);
      }
    });
    
    const previousBalance = previousIncome - previousExpense;
    
    // Calculate percentage changes
    const incomeChange = previousIncome === 0 ? 100 : ((totalIncome - previousIncome) / previousIncome) * 100;
    const expenseChange = previousExpense === 0 ? 100 : ((totalExpense - previousExpense) / previousExpense) * 100;
    const balanceChange = previousBalance === 0 ? 100 : ((totalBalance - previousBalance) / Math.abs(previousBalance)) * 100;
    
    const analytics: DashboardAnalytics = {
      totalBalance,
      totalIncome,
      totalExpense,
      monthlyTransactionCount,
      incomeChange,
      expenseChange,
      balanceChange
    };
    
    console.log('Dashboard analytics:', analytics);
    return analytics;
  } catch (error) {
    console.error('Error in fetchDashboardAnalytics:', error);
    // Return default values in case of error
    return {
      totalBalance: 0,
      totalIncome: 0,
      totalExpense: 0,
      monthlyTransactionCount: 0,
      incomeChange: 0,
      expenseChange: 0,
      balanceChange: 0
    };
  }
};