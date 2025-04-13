/**
 * Updated accountService using axios to communicate with Express API endpoints
 * This replaces the direct Supabase calls with API calls to our Express backend
 */

import axios from 'axios';
import { Account } from '@/types/account';

/**
 * Fetches all accounts for a user
 * @param userId The ID of the user whose accounts to fetch
 * @returns Promise<Account[]> Array of accounts
 */
export const fetchAccounts = async (userId: string): Promise<Account[]> => {
  try {
    if (!userId) {
      throw new Error('User ID must be provided to fetch accounts');
    }

    // Call the API endpoint instead of Supabase directly
    const response = await axios.get('/api/accounts', {
      params: { userId }
    });

    return response.data;
  } catch (error) {
    console.error('Error in fetchAccounts:', error);
    throw error;
  }
};

/**
 * Gets the default account for the user. Creates one if it doesn't exist.
 * @param userId The ID of the user
 * @returns Promise<Account> The default account
 */
export const getDefaultAccount = async (userId: string): Promise<Account> => {
  try {
    if (!userId) {
      throw new Error('User ID must be provided');
    }

    // Call the API endpoint to get or create default account
    const response = await axios.get('/api/accounts/default', {
      params: { userId }
    });

    return response.data;
  } catch (error) {
    console.error('Error in getDefaultAccount:', error);
    throw error;
  }
};

/**
 * Creates a new account
 * @param userId The ID of the user
 * @param account The account data to create
 * @returns Promise<Account> The created account
 */
export const createAccount = async (userId: string, account: Omit<Account, 'account_id' | 'user_id'>): Promise<Account> => {
  try {
    if (!userId) {
      throw new Error('User ID must be provided to create an account');
    }

    const response = await axios.post('/api/accounts', {
      userId,
      account
    });

    return response.data;
  } catch (error) {
    console.error('Error in createAccount:', error);
    throw error;
  }
};

/**
 * Updates an existing account
 * @param userId The ID of the user
 * @param accountId The ID of the account to update
 * @param updates The account updates
 * @returns Promise<Account> The updated account
 */
export const updateAccount = async (userId: string, accountId: string, updates: Partial<Account>): Promise<Account> => {
  try {
    if (!userId || !accountId) {
      throw new Error('User ID and account ID must be provided');
    }

    const response = await axios.put(`/api/accounts/${accountId}`, {
      userId,
      account: updates
    });

    return response.data;
  } catch (error) {
    console.error('Error in updateAccount:', error);
    throw error;
  }
};

/**
 * Deletes an account
 * @param userId The ID of the user
 * @param accountId The ID of the account to delete
 * @returns Promise<void>
 */
export const deleteAccount = async (userId: string, accountId: string): Promise<void> => {
  try {
    if (!userId || !accountId) {
      throw new Error('User ID and account ID must be provided');
    }

    await axios.delete(`/api/accounts/${accountId}`, {
      params: { userId }
    });
  } catch (error) {
    console.error('Error in deleteAccount:', error);
    throw error;
  }
};

/**
 * Gets an account by ID
 * @param userId The ID of the user
 * @param accountId The ID of the account to fetch
 * @returns Promise<Account> The account
 */
export const getAccountById = async (userId: string, accountId: string): Promise<Account | null> => {
  try {
    if (!userId || !accountId) {
      throw new Error('User ID and account ID must be provided');
    }

    const response = await axios.get(`/api/accounts/${accountId}`, {
      params: { userId }
    });

    return response.data;
  } catch (error) {
    console.error('Error in getAccountById:', error);
    return null;
  }
};