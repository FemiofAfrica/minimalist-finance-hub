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
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .ilike('description', `%${query}%`)
      .order('date', { ascending: false })
      .limit(5); // Limit to 5 results for performance

    if (error) {
      console.error('Error searching transactions:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log("No matching transactions found");
      return [];
    }

    // Map to the Transaction type
    const transactions = data.map((t): Transaction => ({
      transaction_id: t.transaction_id,
      user_id: t.user_id,
      account_id: t.account_id,
      category_id: t.category_id,
      description: t.description || '',
      amount: t.amount,
      currency: t.currency,
      date: t.date,
      type: t.type
    }));
    
    // Get unique transactions by description to avoid duplicates
    const uniqueTransactions = Array.from(
      new Map(transactions.map(item => [item.description, item]))
      .values()
    );
    
    console.log(`Found ${uniqueTransactions.length} unique matching transactions`);
    return uniqueTransactions;
  } catch (error) {
    console.error('Error in searchTransactionsByDescription:', error);
    return [];
  }
};

/**
 * Search for accounts by name
 */
export const searchAccountsAndCards = async (query: string): Promise<{
  accounts: { id: string, name: string, type: 'account' }[],
  cards: { id: string, name: string, type: 'card' }[]
}> => {
  try {
    if (!query || query.trim().length < 2) {
      return { accounts: [], cards: [] };
    }

    // Search for accounts with similar names
    const { data: accountsData, error: accountsError } = await supabase
      .from('accounts')
      .select('account_id, name')
      .ilike('name', `%${query}%`)
      .limit(3);

    if (accountsError) {
      console.error('Error searching accounts:', accountsError);
      return { accounts: [], cards: [] };
    }

    // Format results
    const accounts = (accountsData || []).map(account => ({
      id: account.account_id,
      name: account.name,
      type: 'account' as const
    }));

    // Return only accounts - cards functionality removed as it's not in the DB schema
    return { accounts, cards: [] };
  } catch (error) {
    console.error("Error in searchAccountsAndCards:", error);
    return { accounts: [], cards: [] };
  }
};
