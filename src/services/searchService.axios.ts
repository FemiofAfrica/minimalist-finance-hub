/**
 * Updated searchService using axios to communicate with Express API endpoints
 * This replaces the direct Supabase calls with API calls to our Express backend
 */

import axios from 'axios';
import { Transaction } from '../types/transaction';
import { Account } from '../types/account';
import { Card } from '../types/card';

// Define API response types to avoid 'any' usage
interface TransactionsResponse {
  transactions: Transaction[];
}

// Use type aliases instead of empty interfaces
type AccountResponse = Account;
type CardResponse = Card;

// Define interfaces for account and card search results
interface AccountSearchResult {
  id: string;
  name: string;
  type: 'account';
}

interface CardSearchResult {
  id: string;
  name: string;
  type: 'card';
}

/**
 * Search for transactions by description
 * This function is used for the autosuggest feature in the subscription form
 * @param userId The ID of the user
 * @param query The search query
 * @returns Promise<Transaction[]> Array of matching transactions
 */
export const searchTransactionsByDescription = async (userId: string, query: string): Promise<Transaction[]> => {
  try {
    if (!query || query.trim().length < 2) {
      return [];
    }

    if (!userId) {
      throw new Error('User ID must be provided');
    }

    console.log("Searching transactions by description:", query);
    
    // Call the API endpoint instead of Supabase directly
    // Since there's no specific search endpoint, we'll get all transactions and filter client-side
    // In a production app, you would create a dedicated search endpoint on the server
    const response = await axios.get<TransactionsResponse>('/api/transactions', {
      params: { userId, query }
    });
    
    if (!response.data || !response.data.transactions) {
      console.log("No matching transactions found");
      return [];
    }

    // Filter transactions by description (client-side filtering)
    // This is a temporary solution until a proper search endpoint is implemented
    const filteredTransactions = response.data.transactions.filter((transaction: Transaction) => 
      transaction.description?.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5); // Limit to 5 results for performance
    
    // Return unique transactions based on description
    const uniqueTransactions = Array.from(
      new Map(filteredTransactions.map((item: Transaction) => [item.description, item]))
      .values()
    ) as Transaction[];
    
    return uniqueTransactions;
  } catch (error) {
    console.error("Error in searchTransactionsByDescription:", error);
    return [];
  }
};

/**
 * Search for accounts and cards by name
 * @param userId The ID of the user
 * @param query The search query
 * @returns Promise with accounts and cards that match the query
 */
export const searchAccountsAndCards = async (userId: string, query: string): Promise<{
  accounts: { id: string, name: string, type: 'account' }[],
  cards: { id: string, name: string, type: 'card' }[]
}> => {
  try {
    if (!query || query.trim().length < 2) {
      return { accounts: [], cards: [] };
    }

    if (!userId) {
      throw new Error('User ID must be provided');
    }

    // Get accounts and cards from their respective endpoints
    const [accountsResponse, cardsResponse] = await Promise.all([
      axios.get<AccountResponse[]>('/api/accounts', { params: { userId } }),
      axios.get<CardResponse[]>('/api/cards', { params: { userId } })
    ]);

    // Filter accounts by name
    const filteredAccounts = (accountsResponse.data || []).filter((account) => 
      account.name?.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 3).map((account) => ({
      id: account.account_id,
      name: account.name,
      type: 'account' as const
    }));

    // Filter cards by name
    const filteredCards = (cardsResponse.data || []).filter((card) => 
      card.card_name?.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 3).map((card) => ({
      id: card.card_id,
      name: card.card_name,
      type: 'card' as const
    }));

    return {
      accounts: filteredAccounts,
      cards: filteredCards
    };
  } catch (error) {
    console.error("Error in searchAccountsAndCards:", error);
    return { accounts: [], cards: [] };
  }
};