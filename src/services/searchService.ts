
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
      .select(`
        *,
        accounts:account_id(account_name),
        cards:card_id(card_name)
      `)
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

    // Process the transactions to include account and card names
    const enrichedTransactions = transactionsData.map(transaction => {
      const processedTransaction: Transaction = {
        ...transaction,
      };
      
      // Add account and card name information if available
      if (transaction.accounts) {
        processedTransaction.account_name = transaction.accounts.account_name;
      }
      
      if (transaction.cards) {
        processedTransaction.card_name = transaction.cards.card_name;
      }
      
      return processedTransaction;
    });
    
    // Return unique transactions based on description
    // This prevents showing multiple entries of the same subscription
    const uniqueTransactions = Array.from(
      new Map(enrichedTransactions.map(item => [item.description, item]))
      .values()
    );
    
    return uniqueTransactions;
  } catch (error) {
    console.error("Error in searchTransactionsByDescription:", error);
    return [];
  }
};

/**
 * Search for accounts and cards by name
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
      .select('account_id, account_name')
      .ilike('account_name', `%${query}%`)
      .limit(3);

    if (accountsError) {
      console.error('Error searching accounts:', accountsError);
      throw accountsError;
    }

    // Search for cards with similar names
    const { data: cardsData, error: cardsError } = await supabase
      .from('cards')
      .select('card_id, card_name')
      .ilike('card_name', `%${query}%`)
      .limit(3);

    if (cardsError) {
      console.error('Error searching cards:', cardsError);
      throw cardsError;
    }

    // Format results
    const accounts = (accountsData || []).map(account => ({
      id: account.account_id,
      name: account.account_name,
      type: 'account' as const
    }));

    const cards = (cardsData || []).map(card => ({
      id: card.card_id,
      name: card.card_name,
      type: 'card' as const
    }));

    return { accounts, cards };
  } catch (error) {
    console.error("Error in searchAccountsAndCards:", error);
    return { accounts: [], cards: [] };
  }
};
