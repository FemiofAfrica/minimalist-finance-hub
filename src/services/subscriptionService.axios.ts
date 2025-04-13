/**
 * Updated subscriptionService using axios to communicate with Express API endpoints
 * This replaces the direct Supabase calls with API calls to our Express backend
 */

import axios from 'axios';
import { Subscription, SubscriptionFrequency } from '@/types/subscription';

/**
 * Fetches all subscriptions for a user
 * @param userId The ID of the user whose subscriptions to fetch
 * @returns Promise<Subscription[]> Array of subscriptions
 */
export const fetchSubscriptions = async (userId: string): Promise<Subscription[]> => {
  try {
    if (!userId) {
      throw new Error('User ID must be provided');
    }

    // Call the API endpoint instead of Supabase directly
    const response = await axios.get('/api/subscriptions', {
      params: { userId }
    });

    console.log("Subscriptions data from API:", response.data);
    return response.data;
  } catch (error) {
    console.error('Error in fetchSubscriptions:', error);
    return [];
  }
};

/**
 * Creates a new subscription
 * @param userId The ID of the user
 * @param subscription The subscription data to create
 * @returns Promise<Subscription> The created subscription
 */
export const createSubscription = async (userId: string, subscription: Omit<Subscription, 'subscription_id' | 'created_at' | 'updated_at'>): Promise<Subscription> => {
  try {
    if (!userId) {
      throw new Error('User ID must be provided');
    }

    const response = await axios.post('/api/subscriptions', {
      userId,
      subscription
    });

    return response.data;
  } catch (error) {
    console.error('Error in createSubscription:', error);
    throw error;
  }
};

/**
 * Updates an existing subscription
 * @param userId The ID of the user
 * @param subscriptionId The ID of the subscription to update
 * @param updates The subscription updates
 * @returns Promise<Subscription> The updated subscription
 */
export const updateSubscription = async (userId: string, subscriptionId: string, updates: Partial<Subscription>): Promise<Subscription> => {
  try {
    if (!userId || !subscriptionId) {
      throw new Error('User ID and subscription ID must be provided');
    }

    const response = await axios.put(`/api/subscriptions/${subscriptionId}`, {
      userId,
      subscription: updates
    });

    return response.data;
  } catch (error) {
    console.error('Error in updateSubscription:', error);
    throw error;
  }
};

/**
 * Deletes a subscription
 * @param userId The ID of the user
 * @param subscriptionId The ID of the subscription to delete
 * @returns Promise<void>
 */
export const deleteSubscription = async (userId: string, subscriptionId: string): Promise<void> => {
  try {
    if (!userId || !subscriptionId) {
      throw new Error('User ID and subscription ID must be provided');
    }

    await axios.delete(`/api/subscriptions/${subscriptionId}`, {
      params: { userId }
    });
  } catch (error) {
    console.error('Error in deleteSubscription:', error);
    throw error;
  }
};

/**
 * Gets a subscription by ID
 * @param userId The ID of the user
 * @param subscriptionId The ID of the subscription to fetch
 * @returns Promise<Subscription | null> The subscription or null if not found
 */
export const getSubscriptionById = async (userId: string, subscriptionId: string): Promise<Subscription | null> => {
  try {
    if (!userId || !subscriptionId) {
      throw new Error('User ID and subscription ID must be provided');
    }

    const response = await axios.get(`/api/subscriptions/${subscriptionId}`, {
      params: { userId }
    });

    return response.data;
  } catch (error) {
    console.error('Error in getSubscriptionById:', error);
    return null;
  }
};

/**
 * Convert a subscription to a transaction when payment is confirmed
 * @param userId The ID of the user
 * @param subscriptionId The ID of the subscription to convert
 * @returns Promise<void>
 */
export const convertSubscriptionToTransaction = async (userId: string, subscriptionId: string): Promise<void> => {
  try {
    if (!userId || !subscriptionId) {
      throw new Error('User ID and subscription ID must be provided');
    }

    await axios.post(`/api/subscriptions/${subscriptionId}/convert-to-transaction`, {
      userId
    });
    
    console.log("Successfully converted subscription to transaction");
  } catch (error) {
    console.error("Error in convertSubscriptionToTransaction:", error);
    throw error;
  }
};

// Helper function to calculate the next billing date based on frequency
export const calculateNextBillingDate = (currentDate: string, frequency: SubscriptionFrequency): string => {
  const date = new Date(currentDate);
  
  switch (frequency) {
    case 'MONTHLY':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'QUARTERLY':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'ANNUALLY':
      date.setFullYear(date.getFullYear() + 1);
      break;
    case 'CUSTOM':
      // For custom frequency, default to monthly
      date.setMonth(date.getMonth() + 1);
      break;
    default:
      date.setMonth(date.getMonth() + 1);
  }
  
  return date.toISOString().split('T')[0];
};