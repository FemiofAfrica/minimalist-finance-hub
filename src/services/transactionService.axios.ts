/**
 * Updated transactionService using axios to communicate with Express API endpoints
 * This replaces the direct Supabase calls with API calls to our Express backend
 */

import axios from 'axios';
import { Transaction, TransactionInput } from '@/types/transaction';

/**
 * Fetches transactions for a user with optional limit
 * @param userId The ID of the user whose transactions to fetch
 * @param limit Optional limit on the number of transactions to fetch
 * @returns Promise with transactions and summary data
 */
export const fetchTransactions = async (userId: string, limit?: number): Promise<{ 
  transactions: Transaction[], 
  totalIncome: number, 
  totalExpenses: number, 
  netBalance: number 
}> => {
  try {
    if (!userId) {
      throw new Error('User ID must be provided to fetch transactions');
    }

    // Call the API endpoint instead of Supabase directly
    const response = await axios.get('/api/transactions', {
      params: { userId, limit }
    });

    return response.data;
  } catch (error) {
    console.error('Error in fetchTransactions:', error);
    throw error;
  }
};

/**
 * Fetches transactions for a specific account
 * @param userId The ID of the user
 * @param accountId The ID of the account
 * @returns Promise<Transaction[]> Array of transactions
 */
export const fetchTransactionsByAccount = async (userId: string, accountId: string): Promise<Transaction[]> => {
  try {
    if (!userId) {
      throw new Error('User ID must be provided to fetch transactions');
    }

    const response = await axios.get(`/api/accounts/${accountId}/transactions`, {
      params: { userId }
    });

    return response.data;
  } catch (error) {
    console.error('Error in fetchTransactionsByAccount:', error);
    throw error;
  }
};

/**
 * Fetches a single transaction by ID
 * @param userId The ID of the user
 * @param transactionId The ID of the transaction to fetch
 * @returns Promise<Transaction> The transaction
 */
export const fetchTransactionById = async (userId: string, transactionId: string): Promise<Transaction> => {
  try {
    if (!userId || !transactionId) {
      throw new Error('User ID and transaction ID must be provided');
    }

    const response = await axios.get(`/api/transactions/${transactionId}`, {
      params: { userId }
    });

    return response.data;
  } catch (error) {
    console.error('Error in fetchTransactionById:', error);
    throw error;
  }
};

/**
 * Creates a new transaction
 * @param userId The ID of the user
 * @param transaction The transaction data to create
 * @returns Promise<Transaction> The created transaction
 */
export const createTransaction = async (userId: string, transaction: Omit<Transaction, 'transaction_id' | 'user_id'>): Promise<Transaction> => {
  try {
    if (!userId) {
      throw new Error('User ID must be provided to create a transaction');
    }

    const response = await axios.post('/api/transactions', {
      userId,
      transaction
    });

    return response.data;
  } catch (error) {
    console.error('Error in createTransaction:', error);
    throw error;
  }
};

/**
 * Updates an existing transaction
 * @param userId The ID of the user
 * @param transactionId The ID of the transaction to update
 * @param updates The transaction updates
 * @returns Promise<Transaction> The updated transaction
 */
export const updateTransaction = async (userId: string, transactionId: string, updates: Partial<Transaction>): Promise<Transaction> => {
  try {
    if (!userId || !transactionId) {
      throw new Error('User ID and transaction ID must be provided');
    }

    const response = await axios.put(`/api/transactions/${transactionId}`, {
      userId,
      transaction: updates
    });

    return response.data;
  } catch (error) {
    console.error('Error in updateTransaction:', error);
    throw error;
  }
};

/**
 * Deletes a transaction
 * @param userId The ID of the user
 * @param transactionId The ID of the transaction to delete
 * @returns Promise<void>
 */
export const deleteTransaction = async (userId: string, transactionId: string): Promise<void> => {
  try {
    if (!userId || !transactionId) {
      throw new Error('User ID and transaction ID must be provided');
    }

    await axios.delete(`/api/transactions/${transactionId}`, {
      params: { userId }
    });
  } catch (error) {
    console.error('Error in deleteTransaction:', error);
    throw error;
  }
};