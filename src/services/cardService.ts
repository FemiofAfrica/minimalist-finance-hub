import { supabase, getCurrentUserId } from "@/integrations/supabase/client";
import { Card, normalizeDatabaseCard, prepareDatabaseCard } from "@/types/card";
import { getAccountById } from "@/services/accountService";

// Utility function to ensure cards have their account balances
async function syncCardWithAccountBalance(card: Card): Promise<Card> {
  if (!card.account_id) {
    console.log(`Card ${card.card_id} has no account_id, cannot sync balance`);
    return card;
  }
  
  try {
    console.log(`Syncing card ${card.card_id} with account ${card.account_id}`);
    
    // Check cache first
    if (accountsCache[card.account_id]) {
      const accountBalance = accountsCache[card.account_id].balance;
      console.log(`Using cached balance for account ${card.account_id}: ${accountBalance}`);
      return {
        ...card,
        current_balance: accountBalance,
        // Also set legacy field for backward compatibility
        card_name: card.name || card.card_name,
        card_type: card.type || card.card_type
      };
    }
    
    // If not in cache, fetch the account
    const account = await getAccountById(card.account_id);
    
    if (account) {
      console.log(`Account found with balance: ${account.balance}`);
      // Update cache
      accountsCache[card.account_id] = account;
      
      return {
        ...card,
        current_balance: account.balance, // Set the current_balance to account balance
        // Also set legacy fields for backward compatibility
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
    const normalizedCards = (data || []).map(card => normalizeDatabaseCard(card));
    
    // Fetch account balances for all cards with account_id
    const cardsWithBalances = await Promise.all(
      normalizedCards.map(async (card) => {
        if (card.account_id) {
          try {
            const account = await getAccountById(card.account_id);
            if (account) {
              // Set the card's current balance to the account's balance
              return {
                ...card,
                current_balance: account.balance
              };
            }
          } catch (error) {
            console.error(`Error fetching account for card ${card.card_id}:`, error);
          }
        }
        return card;
      })
    );
    
    return cardsWithBalances;
  } catch (error) {
    console.error("Error in fetchCards:", error);
    throw error;
  }
};

export const createCard = async (userId: string, card: Omit<Card, 'card_id' | 'user_id'>): Promise<Card> => {
    if (!userId) throw new Error('User ID must be provided');
    
    // Prepare the card data for database insertion
    const cardWithUserId = prepareDatabaseCard({
      ...card,
      user_id: userId
    });
    
    console.log("Creating card with user_id:", cardWithUserId);
    
    const { data, error } = await supabase
      .from('cards')
      .insert(cardWithUserId)
      .select()
      .single();

    if (error) {
      console.error('Error creating card:', error);
      throw error;
    }

    // Normalize the card data
    const normalizedCard = normalizeDatabaseCard(data);
    
    // If the card is linked to an account, get the account balance
    if (normalizedCard.account_id) {
      try {
        const account = await getAccountById(normalizedCard.account_id);
        if (account) {
          normalizedCard.current_balance = account.balance;
        }
      } catch (error) {
        console.error(`Error fetching account for new card:`, error);
      }
    }

    return normalizedCard;
  } catch (error) {
    console.error("Error in createCard:", error);
    throw error;
  }
};

export const updateCard = async (cardId: string, updates: Partial<Card>): Promise<Card> => {
  try {
    // Get the current user ID
    const userId = await getCurrentUserId();
    
    // Refresh the cache to ensure we have updated account data
    await refreshAccountsCache();
    
    // Log the updates being applied
    console.log(`Updating card ${cardId} with:`, updates);
    
    // If account_id is changing, log the change and get the new account's balance
    if (updates.account_id) {
      console.log(`Changing card account to ${updates.account_id}`);
      const account = accountsCache[updates.account_id] || await getAccountById(updates.account_id);
      if (account) {
        // Always ensure the current_balance matches the account balance
        updates.current_balance = account.balance;
        console.log(`Updated card balance to match account: ${account.balance}`);
      }
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
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating card:', error);
      throw error;
    }

    // Normalize the card data
    const normalizedCard = normalizeDatabaseCard(data);
    
    // If the card is linked to an account, get the account balance
    if (normalizedCard.account_id) {
      try {
        const account = await getAccountById(normalizedCard.account_id);
        if (account) {
          normalizedCard.current_balance = account.balance;
        }
      } catch (error) {
        console.error(`Error fetching account for updated card:`, error);
      }
    }

    return normalizedCard;
  } catch (error) {
    console.error("Error in updateCard:", error);
    throw error;
  }
};

export const deleteCard = async (cardId: string): Promise<void> => {
  try {
    const userId = await getCurrentUserId();
    console.log(`Deleting card ${cardId} for user ${userId}`);
    
    const { error } = await supabase
      .from('cards')
      .delete()
      .eq('card_id', cardId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting card:', error);
      throw error;
    }
    
    console.log(`Card ${cardId} deleted successfully`);
  } catch (error) {
    console.error("Error in deleteCard:", error);
    throw error;
  }
};

export const getCardById = async (cardId: string): Promise<Card | null> => {
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
    if (!data) return null;
    
    // Normalize the card data
    const normalizedCard = normalizeDatabaseCard(data);
    
    // If the card is linked to an account, get the account balance
    if (normalizedCard.account_id) {
      try {
        const account = await getAccountById(normalizedCard.account_id);
        if (account) {
          normalizedCard.current_balance = account.balance;
        }
      } catch (error) {
        console.error(`Error fetching account for card ${cardId}:`, error);
      }
    }
    
    return normalizedCard;
  } catch (error) {
    console.error("Error in getCardById:", error);
    throw error;
  }
};

export const getCardsByAccount = async (userId: string, accountId: string): Promise<Card[]> => {
    if (!userId) throw new Error('User ID must be provided');
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

    // Normalize the cards
    const normalizedCards = (data || []).map(card => normalizeDatabaseCard(card));
    
    // Get the account to set balances
    try {
      const account = await getAccountById(accountId);
      if (account) {
        // Set all cards for this account to have the account's balance
        return normalizedCards.map(card => ({
          ...card,
          current_balance: account.balance
        }));
      }
    } catch (error) {
      console.error(`Error fetching account ${accountId}:`, error);
    }
    
    return normalizedCards;
  } catch (error) {
    console.error("Error in getCardsByAccount:", error);
    throw error;
  }
};
