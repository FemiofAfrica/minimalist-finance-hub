/**
 * Updated dashboardService using axios to communicate with Express API endpoints
 * This replaces the direct Supabase calls with API calls to our Express backend
 */

import axios from 'axios';
import { CategoryExpense } from '@/types/category';

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
 * @param userId The ID of the user whose expenses to fetch.
 * @returns Promise<CategoryExpense[]> Array of category expenses
 */
export const fetchCategoryExpenses = async (userId: string): Promise<CategoryExpense[]> => {
  try {
    console.log("Fetching category expenses for user:", userId);
    if (!userId) {
      console.error("User ID must be provided to fetchCategoryExpenses");
      return []; // Return empty array if ID is missing
    }
    
    // Call the API endpoint instead of Supabase directly
    const response = await axios.get('/api/category-expenses', {
      params: { userId }
    });
    
    console.log('Category expenses data:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error in fetchCategoryExpenses:', error);
    return [];
  }
};

/**
 * Fetches analytics data for the dashboard
 * @returns Promise<DashboardAnalytics> Dashboard analytics data
 */
export const fetchDashboardAnalytics = async (userId: string): Promise<DashboardAnalytics> => {
  try {
    console.log("Fetching dashboard analytics...");
    if (!userId) throw new Error('User ID must be provided');
    
    // Call the API endpoint instead of Supabase directly
    const response = await axios.get('/api/dashboard-analytics', {
      params: { userId }
    });
    
    console.log('Dashboard analytics:', response.data);
    return response.data;
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

// Interface for monthly revenue data
export interface MonthlyRevenue {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

/**
 * Fetches monthly revenue data for charts
 * @param userId The ID of the user whose revenue data to fetch.
 * @returns Promise<MonthlyRevenue[]> Monthly revenue data
 */
export const fetchMonthlyRevenue = async (userId: string): Promise<MonthlyRevenue[]> => {
  try {
    if (!userId) {
      console.error("User ID must be provided to fetchMonthlyRevenue");
      return [];
    }
    
    // Call the API endpoint instead of Supabase directly
    const response = await axios.get('/api/monthly-revenue', {
      params: { userId }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error in fetchMonthlyRevenue:', error);
    return [];
  }
};