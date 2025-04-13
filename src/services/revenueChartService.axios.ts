/**
 * Updated revenueChartService using axios to communicate with Express API endpoints
 * This replaces the direct Supabase calls with API calls to our Express backend
 */

import axios from 'axios';

export type RevenueChartData = {
  month: string;
  revenue: number;
};

export type TimePeriod = "7days" | "30days" | "90days";

/**
 * Fetches revenue data for the chart filtered by time period
 * @param period The time period to filter by (7days, 30days, 90days)
 * @returns Promise with revenue chart data
 */
export const fetchRevenueData = async (period: TimePeriod, userId?: string): Promise<RevenueChartData[]> => {
  try {
    console.log(`Fetching revenue data for period: ${period}`);
    
    if (!userId) {
      // Try to get userId from local storage or another source if not provided
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        userId = parsedUser.id;
      }
      
      if (!userId) {
        console.error('User ID is required to fetch revenue data');
        return [];
      }
    }
    
    // Call the API endpoint instead of Supabase directly
    const response = await axios.get('/api/monthly-revenue', {
      params: { userId, period }
    });
    
    // The API returns data in the format expected by the chart
    return response.data;
  } catch (error) {
    console.error('Error in fetchRevenueData:', error);
    return [];
  }
};