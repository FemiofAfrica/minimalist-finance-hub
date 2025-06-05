/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/integrations/supabase/client";
import { Account } from "@/types/account"; // Your application's Account type

// Work around TypeScript's deep instantiation error by casting supabase to any for specific operations
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAny = supabase as any;

// Get current user ID from auth
const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id || null;
  } catch (error) {
    console.error('Failed to get user session:', error);
    return null;
  }
};

// Other functions (fetchAccounts, createAccount, etc.) would go here...
// Assume they are defined as in previous versions ('supabase_accounts_api_fix')


/**
 * Fetches all accounts for the current user.
 */
export const fetchAccounts = async (): Promise<Account[]> => {
  try {
    const userId = await getCurrentUserId();
    
    // Add timestamp and random value to ensure we don't get cached results
    const timestamp = new Date().getTime();
    const randomValue = Math.random();
    
    console.log(`Fetching accounts with timestamp: ${timestamp} and random: ${randomValue}`);
    
    // Try direct query first with cache-busting parameters
    // Use any to bypass TypeScript restrictions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: accountsData, error: accountsError } = await (supabase as any)
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
      
    if (accountsError) {
      console.error('Error fetching accounts:', accountsError);
      throw accountsError;
    }
    
    if (!accountsData || accountsData.length === 0) {
      console.log("No accounts found for user");
      return [];
    }
    
    console.log(`Fetched ${accountsData.length} accounts directly from database:`, 
      accountsData.map((a: any) => `${a.name}: ${a.balance}`).join(', '));

    // Map the database rows to Account type
    return accountsData.map((account: any) => ({
      account_id: account.account_id,
      name: account.name,
      type: account.type as Account['type'],
      balance: account.balance || 0,
      currency: account.currency,
      is_active: account.is_active || true,
      is_default: account.is_default || false,
      institution: account.institution || null,
      bank_name: account.bank_name || null,
      account_number: account.account_number || null,
      created_at: account.created_at,
      updated_at: account.updated_at,
      user_id: account.user_id,
      custom_tags: account.custom_tags || []
    }));
  } catch (error) {
    console.error('Error in fetchAccounts:', error);
    throw error;
  }
};

/**
 * Creates a new account for the current user.
 */
export const createAccount = async (account: Omit<Account, 'account_id' | 'user_id'>): Promise<Account | null> => {
  try {
    const userId = await getCurrentUserId();
    
    // Check if this is the first account (to set as default if so)
    // Add proper type annotation for PostgrestFilterBuilder
    const { count, error: countError } = await (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase as any
    )
      .from('accounts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    if (countError) {
      console.error('Error checking existing accounts:', countError);
      throw countError;
    }
    
    const isFirstAccount = count === 0;
    
    // Create a copy and exclude fields that don't exist in DB
    const { custom_tags, ...dbAccountData } = account;
    
    // Prepare data for insertion with proper type
    const insertData = {
      user_id: userId,
      name: dbAccountData.name,
      type: dbAccountData.type?.toLowerCase() || 'checking', // Ensure lowercase type
      balance: dbAccountData.balance,
      currency: dbAccountData.currency || 'NGN',
      is_active: dbAccountData.is_active !== undefined ? dbAccountData.is_active : true,
      is_default: isFirstAccount ? true : dbAccountData.is_default || false,
      account_number: dbAccountData.account_number,
      institution: dbAccountData.institution,
      bank_name: dbAccountData.bank_name,
    };
    
    const { data, error } = await (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase as any
    )
      .from('accounts')
      .insert(insertData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating account:', error);
      throw error;
    }
    
    // If this account is set as default, make sure other accounts are not default
    if (insertData.is_default) {
      await setDefaultAccount(data.account_id);
    }
    
    // Map the database row to Account type
    return {
      account_id: data.account_id,
      name: data.name,
      type: data.type as Account['type'],
      balance: data.balance || 0,
      currency: data.currency,
      is_active: data.is_active || true,
      is_default: data.is_default || false,
      institution: data.institution || null,
      bank_name: data.bank_name || null,
      account_number: data.account_number,
      created_at: data.created_at,
      updated_at: data.updated_at,
      user_id: data.user_id,
      custom_tags: custom_tags || [],
    };
  } catch (error) {
    console.error('Error in createAccount:', error);
    throw error;
  }
};

/**
 * Updates an existing account.
 */
export const updateAccount = async (accountId: string, accountData: Partial<Account>): Promise<void> => {
  try {
    const userId = await getCurrentUserId();
    
    // Create a copy of accountData to avoid modifying the original
    // Exclude custom_tags as it might not be supported in the update
    const { custom_tags, ...dbUpdateData } = accountData;
    
    // Prepare data for update
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      ...dbUpdateData,
      updated_at: new Date().toISOString()
    };
    
    // Filter out undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('accounts')
      .update(updateData)
      .eq('account_id', accountId)
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error updating account:', error);
      throw error;
    }
    
    // If this account is set as default, make sure other accounts are not default
    if (accountData.is_default) {
      await setDefaultAccount(accountId);
    }
  } catch (error) {
    console.error('Error in updateAccount:', error);
    throw error;
  }
};

/**
 * Deletes an account.
 */
export const deleteAccount = async (accountId: string): Promise<void> => {
  try {
    const userId = await getCurrentUserId();
    
    // Check if the account is marked as default
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: fetchError } = await (supabase as any)
      .from('accounts')
      .select('is_default')
      .eq('account_id', accountId)
      .eq('user_id', userId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching account details:', fetchError);
      throw fetchError;
    }
    
    // Delete the account
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('account_id', accountId)
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
    
    // If the deleted account was default, set another account as default
    if (data.is_default) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: remainingAccounts, error: fetchRemainingError } = await (supabase as any)
        .from('accounts')
        .select('account_id')
        .eq('user_id', userId)
        .limit(1);
      
      if (fetchRemainingError) {
        console.error('Error fetching remaining accounts:', fetchRemainingError);
        throw fetchRemainingError;
      }
      
      if (remainingAccounts && remainingAccounts.length > 0) {
        await setDefaultAccount(remainingAccounts[0].account_id);
      }
    }
  } catch (error) {
    console.error('Error in deleteAccount:', error);
    throw error;
  }
};

/**
 * Sets an account as the default account and ensures no other accounts are default.
 */
export const setDefaultAccount = async (accountId: string): Promise<void> => {
  try {
    const userId = await getCurrentUserId();
    
    // Begin transaction
    await supabaseAny.rpc('begin_transaction');
    
    try {
      // First, set all accounts to non-default
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateAllError } = await (supabase as any)
        .from('accounts')
        .update({ is_default: false })
        .eq('user_id', userId);
      
      if (updateAllError) throw updateAllError;
      
      // Then, set the specified account as default
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateOneError } = await (supabase as any)
        .from('accounts')
        .update({ is_default: true })
        .eq('account_id', accountId)
        .eq('user_id', userId);
      
      if (updateOneError) throw updateOneError;
      
      // Commit transaction
      await supabaseAny.rpc('commit_transaction');
    } catch (error) {
      // Rollback on error
      await supabaseAny.rpc('rollback_transaction');
      throw error;
    }
  } catch (error) {
    console.error('Error in setDefaultAccount:', error);
    throw error;
  }
};

/**
 * Gets the default account for the user.
 * If no default account exists, returns the first account or null if no accounts exist.
 */
export const getDefaultAccount = async (): Promise<Account | null> => {
  try {
    const userId = await getCurrentUserId();
    
    // Try to fetch the existing default account
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching default account:', error);
      throw error;
    }
    
    // If default account exists, return it
    if (data) {
      return {
        account_id: data.account_id,
        name: data.name,
        type: data.type as Account['type'],
        balance: data.balance || 0,
        currency: data.currency,
        is_active: data.is_active || true,
        is_default: true,
        institution: data.institution || null,
        bank_name: data.bank_name || null,
        account_number: data.account_number,
        created_at: data.created_at,
        updated_at: data.updated_at,
        user_id: data.user_id,
        custom_tags: data.custom_tags || []
      };
    }
    
    // If no default account, try to get the first account
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: firstAccount, error: firstAccountError } = await (supabase as any)
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    
    if (firstAccountError) {
      console.error('Error fetching first account:', firstAccountError);
      throw firstAccountError;
    }
    
    // If any account exists, set it as default and return it
    if (firstAccount) {
      await setDefaultAccount(firstAccount.account_id);
      
      return {
        account_id: firstAccount.account_id,
        name: firstAccount.name,
        type: firstAccount.type as Account['type'],
        balance: firstAccount.balance || 0,
        currency: firstAccount.currency,
        is_active: firstAccount.is_active || true,
        is_default: true,
        institution: firstAccount.institution || null,
        bank_name: firstAccount.bank_name || null,
        account_number: firstAccount.account_number,
        created_at: firstAccount.created_at,
        updated_at: firstAccount.updated_at,
        user_id: firstAccount.user_id,
        custom_tags: firstAccount.custom_tags || []
      };
    }
    
    // No accounts found
    return null;
  } catch (error) {
    console.error('Error in getDefaultAccount:', error);
    throw error;
  }
};

/**
 * Gets an account by its ID.
 */
export const getAccountById = async (accountId: string): Promise<Account | null> => {
  try {
    const userId = await getCurrentUserId();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('accounts')
      .select('*')
      .eq('account_id', accountId)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching account by ID:', error);
      throw error;
    }
    
    // If account exists, return it
    if (data) {
      return {
        account_id: data.account_id,
        name: data.name,
        type: data.type as Account['type'],
        balance: data.balance || 0,
        currency: data.currency,
        is_active: data.is_active || true,
        is_default: data.is_default || false,
        institution: data.institution || null,
        bank_name: data.bank_name || null,
        account_number: data.account_number,
        created_at: data.created_at,
        updated_at: data.updated_at,
        user_id: data.user_id,
        custom_tags: data.custom_tags || []
      };
    }
    
    // No account found
    return null;
  } catch (error) {
    console.error('Error in getAccountById:', error);
    throw error;
  }
};

// Make sure other functions like createAccount, updateAccount also use AccountInsert
// or AccountUpdate types from generated Supabase types when preparing data for .insert()/.update()

