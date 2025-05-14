import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId } from "@/integrations/supabase/client";
import { Account } from "@/types/account";

// Define a type for the partial account data returned from select queries
interface AccountSummary {
  account_id: string;
  name: string;
  balance: number;
}

/**
 * Debug service for diagnosing account balance issues
 */
export const verifyAccountBalances = async (): Promise<{ 
  directDbAccounts: AccountSummary[],
  serviceAccounts: AccountSummary[],
  userId: string | null,
  timestamp: string,
  forceRefresh: boolean
}> => {
  try {
    // Get current user ID
    const userId = await getCurrentUserId();
    
    if (!userId) {
      return { 
        directDbAccounts: [], 
        serviceAccounts: [], 
        userId: null,
        timestamp: new Date().toISOString(),
        forceRefresh: false
      };
    }
    
    // Get accounts directly from database
    const timestamp = new Date().getTime();
    
    // Direct database query with no caching
    const { data: directDbAccounts, error: directError } = await supabase
      .from('accounts')
      .select('account_id, name, balance')
      .eq('user_id', userId);
      
    if (directError) {
      console.error('Error in direct DB account query:', directError);
      throw directError;
    }
    
    // Force a data refresh by updating timestamps
    let forceRefresh = false;
    try {
      // Test if updating timestamps helps refresh data
      if (directDbAccounts && directDbAccounts.length > 0) {
        const firstAccountId = directDbAccounts[0].account_id;
        
        // Update the timestamp on the first account to force refresh
        const { error: updateError } = await supabase
          .from('accounts')
          .update({ updated_at: new Date().toISOString() })
          .eq('account_id', firstAccountId);
          
        if (!updateError) {
          forceRefresh = true;
        }
      }
    } catch (refreshError) {
      console.error('Error forcing refresh:', refreshError);
    }
    
    // Get accounts via the accountService
    // Using a separate query instead of the options parameter, which is not available
    const { data: serviceAccounts, error: serviceError } = await supabase
      .from('accounts')
      .select('account_id, name, balance')
      .eq('user_id', userId);
      
    if (serviceError) {
      console.error('Error in service account query:', serviceError);
      throw serviceError;
    }
    
    return {
      directDbAccounts: directDbAccounts || [],
      serviceAccounts: serviceAccounts || [],
      userId,
      timestamp: new Date().toISOString(),
      forceRefresh
    };
  } catch (error) {
    console.error('Error verifying account balances:', error);
    throw error;
  }
};

/**
 * Force updates account balances to trigger a UI refresh
 */
export const forceUpdateAccountBalances = async (): Promise<boolean> => {
  try {
    // Get current user ID
    const userId = await getCurrentUserId();
    
    if (!userId) {
      console.error('No user ID found');
      return false;
    }
    
    // Get all accounts for user
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('account_id, balance')
      .eq('user_id', userId);
      
    if (accountsError) {
      console.error('Error fetching accounts:', accountsError);
      throw accountsError;
    }
    
    if (!accounts || accounts.length === 0) {
      console.warn('No accounts found for user');
      return false;
    }
    
    console.log(`Found ${accounts.length} accounts to update`);
    
    // Update each account with its current balance to force refresh
    let success = true;
    for (const account of accounts) {
      const { error: updateError } = await supabase
        .from('accounts')
        .update({ 
          balance: account.balance, // keeping the same balance
          updated_at: new Date().toISOString() // force timestamp update
        })
        .eq('account_id', account.account_id);
        
      if (updateError) {
        console.error(`Error updating account ${account.account_id}:`, updateError);
        success = false;
      }
    }
    
    return success;
  } catch (error) {
    console.error('Error in forceUpdateAccountBalances:', error);
    return false;
  }
}; 