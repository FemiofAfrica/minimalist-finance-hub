import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/types/card";

export const fetchCards = async (userId: string): Promise<Card[]> => {
  try {
    if (!userId) throw new Error('User ID must be provided');
    console.log("Fetching cards...");
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching cards:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error in fetchCards:", error);
    throw error;
  }
};

export const createCard = async (userId: string, card: Omit<Card, 'card_id' | 'user_id'>): Promise<Card> => {
  try {
    if (!userId) throw new Error('User ID must be provided');
    console.log("Creating card with user_id:", card);
    
    const cardWithUserId = {
      ...card,
      user_id: userId
    };
    
    const { data, error } = await supabase
      .from('cards')
      .insert(cardWithUserId)
      .select()
      .single();

    if (error) {
      console.error('Error creating card:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error in createCard:", error);
    throw error;
  }
};

export const updateCard = async (userId: string, cardId: string, updates: Partial<Card>): Promise<Card> => {
  try {
    if (!userId) throw new Error('User ID must be provided');
    const { data, error } = await supabase
      .from('cards')
      .update(updates)
      .eq('card_id', cardId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating card:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error in updateCard:", error);
    throw error;
  }
};

export const deleteCard = async (userId: string, cardId: string): Promise<void> => {
  try {
    if (!userId) throw new Error('User ID must be provided');
    const { error } = await supabase
      .from('cards')
      .delete()
      .eq('card_id', cardId)
      .eq('user_id', userId);

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

    return data;
  } catch (error) {
    console.error("Error in getCardById:", error);
    throw error;
  }
};

export const getCardsByAccount = async (userId: string, accountId: string): Promise<Card[]> => {
  try {
    if (!userId) throw new Error('User ID must be provided');
    console.log("Fetching cards by account...");
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

    return data || [];
  } catch (error) {
    console.error("Error in getCardsByAccount:", error);
    throw error;
  }
};
