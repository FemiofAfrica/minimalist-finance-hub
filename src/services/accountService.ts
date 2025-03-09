
import { supabase, getCurrentUserId } from "@/integrations/supabase/client";
import { Account } from "@/types/account";

export const fetchAccounts = async (): Promise<Account[]> => {
  try {
    console.log("Fetching accounts...");
    const userId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching accounts:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error in fetchAccounts:", error);
    throw error;
  }
};

export const createAccount = async (account: Omit<Account, 'account_id'>): Promise<Account> => {
  try {
    const userId = await getCurrentUserId();
    
    const accountWithUserId = {
      ...account,
      user_id: userId
    };
    
    console.log("Creating account with user_id:", accountWithUserId);
    
    const { data, error } = await supabase
      .from('accounts')
      .insert(accountWithUserId)
      .select()
      .single();

    if (error) {
      console.error('Error creating account:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error in createAccount:", error);
    throw error;
  }
};

export const updateAccount = async (accountId: string, updates: Partial<Account>): Promise<Account> => {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .update(updates)
      .eq('account_id', accountId)
      .select()
      .single();

    if (error) {
      console.error('Error updating account:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error in updateAccount:", error);
    throw error;
  }
};

export const deleteAccount = async (accountId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('account_id', accountId);

    if (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  } catch (error) {
    console.error("Error in deleteAccount:", error);
    throw error;
  }
};

export const getAccountById = async (accountId: string): Promise<Account | null> => {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('account_id', accountId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching account:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error in getAccountById:", error);
    throw error;
  }
};
