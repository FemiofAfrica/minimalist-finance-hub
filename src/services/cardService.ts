import { supabase } from "@/utils/networkUtils";
import { Card } from "@/types/card";

export const fetchCards = async (userId: string): Promise<Card[]> => {
    if (!userId) throw new Error('User ID must be provided');
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
};

export const createCard = async (userId: string, card: Omit<Card, 'card_id' | 'user_id'>): Promise<Card> => {
    if (!userId) throw new Error('User ID must be provided');
    
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
};

export const updateCard = async (userId: string, cardId: string, updates: Partial<Card>): Promise<Card> => {
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
};

export const deleteCard = async (userId: string, cardId: string): Promise<void> => {
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

    return data;
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

    return data || [];
};
