import { supabase, getCurrentUserId } from "@/integrations/supabase/client";
import { Card, normalizeDatabaseCard, prepareDatabaseCard } from "@/types/card";
import { getAccountById } from "@/services/accountService";

export const fetchCards = async (): Promise<Card[]> => {
  try {
    console.log("Fetching cards...");
    const userId = await getCurrentUserId();
    
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

export const createCard = async (card: Omit<Card, 'card_id'>): Promise<Card> => {
  try {
    const userId = await getCurrentUserId();
    
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

export const getCardsByAccount = async (accountId: string): Promise<Card[]> => {
  try {
    const userId = await getCurrentUserId();
    
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
