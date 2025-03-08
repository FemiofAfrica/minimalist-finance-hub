import { supabase } from "@/integrations/supabase/client";
import { Transaction } from "@/types/transaction";

/**
 * Search for transactions by description
 * This function is used for the autosuggest feature in the subscription form
 */
export const searchTransactionsByDescription = async (query: string): Promise<Transaction[]> => {
  try {
    if (!query || query.trim().length < 2) {
      return [];
    }

    console.log("Searching transactions by description:", query);
    
    // Search for transactions with a similar description
    const { data: transactionsData, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .ilike('description', `%${query}%`)
      .order('date', { ascending: false })
      .limit(5); // Limit to 5 results for performance

    if (transactionsError) {
      console.error('Error searching transactions:', transactionsError);
      throw transactionsError;
    }

    if (!transactionsData || transactionsData.length === 0) {
      console.log("No matching transactions found");
      return [];
    }

    // Return unique transactions based on description
    // This prevents showing multiple entries of the same subscription
    const uniqueTransactions = Array.from(
      new Map(transactionsData.map(item => [item.description, item]))
      .values()
    );
    
    return uniqueTransactions;
  } catch (error) {
    console.error("Error in searchTransactionsByDescription:", error);
    return [];
  }
};