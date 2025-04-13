/**
 * Updated cardService using axios to communicate with Express API endpoints
 * This replaces the direct Supabase calls with API calls to our Express backend
 */

import axios from 'axios';
import { Card } from '@/types/card';

/**
 * Fetches all cards for a user
 * @param userId The ID of the user whose cards to fetch
 * @returns Promise<Card[]> Array of cards
 */
export const fetchCards = async (userId: string): Promise<Card[]> => {
  try {
    if (!userId) {
      throw new Error('User ID must be provided');
    }

    // Call the API endpoint instead of Supabase directly
    const response = await axios.get('/api/cards', {
      params: { userId }
    });

    return response.data;
  } catch (error) {
    console.error('Error in fetchCards:', error);
    throw error;
  }
};

/**
 * Creates a new card
 * @param userId The ID of the user
 * @param card The card data to create
 * @returns Promise<Card> The created card
 */
export const createCard = async (userId: string, card: Omit<Card, 'card_id' | 'user_id'>): Promise<Card> => {
  try {
    if (!userId) {
      throw new Error('User ID must be provided');
    }

    const response = await axios.post('/api/cards', {
      userId,
      card
    });

    return response.data;
  } catch (error) {
    console.error('Error in createCard:', error);
    throw error;
  }
};

/**
 * Updates an existing card
 * @param userId The ID of the user
 * @param cardId The ID of the card to update
 * @param updates The card updates
 * @returns Promise<Card> The updated card
 */
export const updateCard = async (userId: string, cardId: string, updates: Partial<Card>): Promise<Card> => {
  try {
    if (!userId) {
      throw new Error('User ID must be provided');
    }

    const response = await axios.put(`/api/cards/${cardId}`, {
      userId,
      card: updates
    });

    return response.data;
  } catch (error) {
    console.error('Error in updateCard:', error);
    throw error;
  }
};

/**
 * Deletes a card
 * @param userId The ID of the user
 * @param cardId The ID of the card to delete
 * @returns Promise<void>
 */
export const deleteCard = async (userId: string, cardId: string): Promise<void> => {
  try {
    if (!userId) {
      throw new Error('User ID must be provided');
    }

    await axios.delete(`/api/cards/${cardId}`, {
      params: { userId }
    });
  } catch (error) {
    console.error('Error in deleteCard:', error);
    throw error;
  }
};

/**
 * Gets a card by ID
 * @param cardId The ID of the card to fetch
 * @returns Promise<Card | null> The card or null if not found
 */
/**
 * Fetches all cards for a specific account
 * @param userId The ID of the user
 * @param accountId The ID of the account whose cards to fetch
 * @returns Promise<Card[]> Array of cards for the specified account
 */
export const getCardsByAccount = async (userId: string, accountId: string): Promise<Card[]> => {
  try {
    if (!userId || !accountId) {
      throw new Error('User ID and account ID must be provided');
    }

    // Call the API endpoint to get cards by account
    const response = await axios.get('/api/cards/by-account', {
      params: { userId, accountId }
    });

    return response.data;
  } catch (error) {
    console.error('Error in getCardsByAccount:', error);
    throw error;
  }
};

/**
 * Gets a card by ID
 * @param userId The ID of the user
 * @param cardId The ID of the card to fetch
 * @returns Promise<Card | null> The card or null if not found
 */
export const getCardById = async (userId: string, cardId: string): Promise<Card | null> => {
  try {
    if (!userId || !cardId) {
      throw new Error('User ID and card ID must be provided');
    }

    const response = await axios.get(`/api/cards/${cardId}`, {
      params: { userId }
    });

    return response.data;
  } catch (error) {
    console.error('Error in getCardById:', error);
    return null;
  }
};