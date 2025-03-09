
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/types/card";

export const fetchCards = async (): Promise<Card[]> => {
  try {
    console.log("Fetching cards...");
    
    const { data, error } = await supabase
      .from('cards')
      .select('*')
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

export const createCard = async (card: Omit<Card, 'card_id'>): Promise<Card> => {
  try {
    const { data, error } = await supabase
      .from('cards')
      .insert(card)
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

export const updateCard = async (cardId: string, updates: Partial<Card>): Promise<Card> => {
  try {
    const { data, error } = await supabase
      .from('cards')
      .update(updates)
      .eq('card_id', cardId)
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

    return data;
  } catch (error) {
    console.error("Error in getCardById:", error);
    throw error;
  }
};

export const getCardsByAccount = async (accountId: string): Promise<Card[]> => {
  try {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('account_id', accountId)
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
