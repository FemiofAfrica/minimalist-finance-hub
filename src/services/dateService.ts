import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches all unique dates that have transactions in the database
 * @returns Promise<Date[]> Array of dates that have transactions
 */
export const fetchAvailableTransactionDates = async (): Promise<Date[]> => {
  try {
    // Query to get all unique dates from transactions table
    const { data, error } = await supabase
      .from('transactions')
      .select('date')
      .order('date');

    if (error) {
      console.error('Error fetching available transaction dates:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('No transaction dates found');
      return [];
    }

    // Extract unique dates and convert to Date objects
    const uniqueDates = new Set<string>();
    data.forEach(item => {
      if (item.date) {
        // Ensure we're working with just the date part (YYYY-MM-DD)
        const dateStr = item.date.split('T')[0];
        uniqueDates.add(dateStr);
      }
    });

    // Convert string dates to Date objects
    const availableDates = Array.from(uniqueDates).map(dateStr => {
      // Create a date object at noon to avoid timezone issues
      return new Date(`${dateStr}T12:00:00`);
    });

    console.log(`Found ${availableDates.length} unique transaction dates`);
    return availableDates;
  } catch (error) {
    console.error('Error in fetchAvailableTransactionDates:', error);
    throw error;
  }
};