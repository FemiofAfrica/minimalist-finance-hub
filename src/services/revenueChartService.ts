
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export type RevenueChartData = {
  month: string;
  revenue: number;
};

export type TimePeriod = "7days" | "30days" | "90days";

// Function to get data for the revenue chart filtered by time period
export const fetchRevenueData = async (period: TimePeriod): Promise<RevenueChartData[]> => {
  try {
    console.log(`Fetching revenue data for period: ${period}`);
    
    // Calculate the start date based on the selected period
    const now = new Date();
    let startDate = new Date();
    
    if (period === "7days") {
      startDate.setDate(now.getDate() - 7);
    } else if (period === "30days") {
      startDate.setDate(now.getDate() - 30);
    } else if (period === "90days") {
      startDate.setDate(now.getDate() - 90);
    }
    
    // Format dates for the query
    const formattedStartDate = startDate.toISOString();
    
    // Fetch transactions within the date range
    const { data, error } = await supabase
      .from('transactions')
      .select('date, amount, category_type')
      .gte('date', formattedStartDate)
      .order('date', { ascending: true });
    
    if (error) {
      console.error('Error fetching revenue data:', error);
      throw error;
    }
    
    console.log(`Retrieved ${data?.length || 0} transactions for the period`);
    
    // Process data to create daily or monthly aggregates based on period
    const aggregatedData: Record<string, number> = {};
    
    // Determine format string based on period
    let formatStr = 'MMM d';
    if (period === "30days" || period === "90days") {
      formatStr = 'MMM d';
    }
    
    // Group transactions by date and sum income amounts
    data?.forEach(transaction => {
      const date = new Date(transaction.date);
      const formattedDate = format(date, formatStr);
      
      // Only count income transactions for revenue
      if (transaction.category_type === 'INCOME') {
        if (!aggregatedData[formattedDate]) {
          aggregatedData[formattedDate] = 0;
        }
        aggregatedData[formattedDate] += Number(transaction.amount);
      }
    });
    
    // Convert the aggregated data into the format expected by the chart
    const chartData: RevenueChartData[] = Object.keys(aggregatedData).map(date => ({
      month: date,
      revenue: aggregatedData[date]
    }));
    
    console.log('Processed revenue chart data:', chartData);
    
    return chartData;
  } catch (error) {
    console.error('Error in fetchRevenueData:', error);
    return [];
  }
};
