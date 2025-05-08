import { supabase, getCurrentUserId } from "@/integrations/supabase/client";
import { Card, normalizeDatabaseCard, prepareDatabaseCard } from "@/types/card";
import { getAccountById, fetchAccounts } from "@/services/accountService";

// Utility function to ensure cards have their account balances
async function syncCardWithAccountBalance(card: Card): Promise<Card> {
  if (!card.account_id) return card;
  
  try {
    console.log(`Syncing card ${card.card_id} with account ${card.account_id}`);
    const account = await getAccountById(card.account_id);
    
    if (account) {
      console.log(`Account found with balance: ${account.balance}`);
      return {
        ...card,
        current_balance: account.balance,
        // Also set legacy field for backward compatibility
        card_name: card.name || card.card_name,
        card_type: card.type || card.card_type
      };
    } else {
      console.warn(`Account ${card.account_id} not found for card ${card.card_id}`);
    }
  } catch (error) {
    console.error(`Error syncing card ${card.card_id} with account:`, error);
  }
  
  return card;
}

// Cache for accounts to reduce duplicate fetches
let accountsCache: Record<string, any> = {};

// Function to refresh the accounts cache
async function refreshAccountsCache(): Promise<void> {
  try {
    const accounts = await fetchAccounts();
    accountsCache = accounts.reduce((acc, account) => {
      acc[account.account_id] = account;
      return acc;
    }, {} as Record<string, any>);
    console.log('Accounts cache refreshed with', Object.keys(accountsCache).length, 'accounts');
  } catch (error) {
    console.error('Error refreshing accounts cache:', error);
  }
}

export const fetchCards = async (): Promise<Card[]> => {
  try {
    console.log("Fetching cards...");
    const userId = await getCurrentUserId();
    
    // Refresh accounts cache first
    await refreshAccountsCache();
    
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching cards:', error);
      throw error;
    }

    // Normalize the cards to match our application format
    const normalizedCards = (data || []).map(card => {
      const normalizedCard = normalizeDatabaseCard(card);
      
      // Use cached account data if available
      if (normalizedCard.account_id && accountsCache[normalizedCard.account_id]) {
        const account = accountsCache[normalizedCard.account_id];
        normalizedCard.current_balance = account.balance;
        console.log(`Set card ${normalizedCard.card_id} balance to ${account.balance} from cache`);
      }
      
      return normalizedCard;
    });
    
    // For any cards that didn't get balance from cache, fetch individually
    const cardsWithBalances = await Promise.all(
      normalizedCards.map(async (card) => {
        if (card.account_id && card.current_balance === 0) {
          return syncCardWithAccountBalance(card);
        }
        return card;
      })
    );
    
    console.log(`Returning ${cardsWithBalances.length} cards with updated balances`);
    return cardsWithBalances;
  } catch (error) {
    console.error("Error in fetchCards:", error);
    throw error;
  }
};

export const createCard = async (card: Omit<Card, 'card_id'>): Promise<Card> => {
  try {
    const userId = await getCurrentUserId();
    
    // Refresh the cache to ensure we have updated account data
    await refreshAccountsCache();
    
    // Ensure account_id is correctly set and get balance
    if (card.account_id) {
      const account = accountsCache[card.account_id] || await getAccountById(card.account_id);
      if (account) {
        console.log(`Creating card with account_id ${card.account_id}, balance: ${account.balance}`);
      } else {
        console.warn(`Creating card with account_id ${card.account_id} but account not found`);
      }
    }
    
    // Prepare the card data for database insertion
    const cardWithUserId = prepareDatabaseCard({
      ...card,
      user_id: userId
    });
    
    console.log("Creating card with data:", cardWithUserId);
    
    const { data, error } = await supabase
      .from('cards')
      .insert(cardWithUserId)
      .select()
      .single();

    if (error) {
      console.error('Error creating card:', error);
      throw error;
    }

    // Normalize and sync with account
    const normalizedCard = normalizeDatabaseCard(data);
    const syncedCard = await syncCardWithAccountBalance(normalizedCard);
    
    console.log('Card created successfully:', syncedCard);
    return syncedCard;
  } catch (error) {
    console.error("Error in createCard:", error);
    throw error;
  }
};

export const updateCard = async (cardId: string, updates: Partial<Card>): Promise<Card> => {
  try {
    // Refresh the cache to ensure we have updated account data
    await refreshAccountsCache();
    
    // Log the updates being applied
    console.log(`Updating card ${cardId} with:`, updates);
    
    // If account_id is changing, log the change
    if (updates.account_id) {
      console.log(`Changing card account to ${updates.account_id}`);
    }
    
    // Prepare the card data for database update
    const cardUpdates = prepareDatabaseCard({
      card_id: cardId,
      ...updates
    });
    
    const { data, error } = await supabase
      .from('cards')
      .update(cardUpdates)
      .eq('card_id', cardId)
      .select()
      .single();

    if (error) {
      console.error('Error updating card:', error);
      throw error;
    }

    // Normalize and sync with account
    const normalizedCard = normalizeDatabaseCard(data);
    const syncedCard = await syncCardWithAccountBalance(normalizedCard);
    
    console.log('Card updated successfully:', syncedCard);
    return syncedCard;
  } catch (error) {
    console.error("Error in updateCard:", error);
    throw error;
  }
};

export const deleteCard = async (cardId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('cards')
      .delete()
      .eq('card_id', cardId);

    if (error) {
      console.error('Error deleting card:', error);
      throw error;
    }
  } catch (error) {
    console.error("Error in deleteCard:", error);
    throw error;
  }
};

export const getCardById = async (cardId: string): Promise<Card | null> => {
  try {
    console.log(`Fetching card by ID: ${cardId}`);
    
    // Refresh accounts cache
    await refreshAccountsCache();
    
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('card_id', cardId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching card:', error);
      throw error;
    }

    // If no data found, return null
    if (!data) {
      console.log(`Card ${cardId} not found`);
      return null;
    }
    
    // Normalize the card data
    const normalizedCard = normalizeDatabaseCard(data);
    
    // Use cached account data if available
    if (normalizedCard.account_id && accountsCache[normalizedCard.account_id]) {
      normalizedCard.current_balance = accountsCache[normalizedCard.account_id].balance;
      console.log(`Set card ${cardId} balance to ${normalizedCard.current_balance} from cache`);
      return normalizedCard;
    }
    
    // Otherwise sync with account
    const syncedCard = await syncCardWithAccountBalance(normalizedCard);
    return syncedCard;
  } catch (error) {
    console.error("Error in getCardById:", error);
    throw error;
  }
};

export const getCardsByAccount = async (accountId: string): Promise<Card[]> => {
  try {
    console.log(`Fetching cards for account: ${accountId}`);
    const userId = await getCurrentUserId();
    
    // Fetch the specific account first
    const account = await getAccountById(accountId);
    if (!account) {
      console.warn(`Account ${accountId} not found`);
      return [];
    }
    
    console.log(`Account found with balance: ${account.balance}`);
    
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('account_id', accountId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching cards by account:', error);
      throw error;
    }

    // Normalize the cards and set all to have the account's balance
    const cardsWithBalance = (data || []).map(card => {
      const normalizedCard = normalizeDatabaseCard(card);
      normalizedCard.current_balance = account.balance;
      return normalizedCard;
    });
    
    console.log(`Returning ${cardsWithBalance.length} cards with balance ${account.balance}`);
    return cardsWithBalance;
  } catch (error) {
    console.error("Error in getCardsByAccount:", error);
    throw error;
  }
};
