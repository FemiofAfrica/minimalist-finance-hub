import { supabase, getCurrentUserId } from "@/integrations/supabase/client";
// Assuming generated types are here:
import { Database } from "@/integrations/supabase/database.types";
import { Account } from "@/types/account"; // Your application's Account type

// Define the specific type for inserting into the accounts table using generated types
// Adjust 'public' if your schema is different
type AccountInsert = Database['public']['Tables']['accounts']['Insert'];
// Define the type for a row returned from the accounts table
type AccountRow = Database['public']['Tables']['accounts']['Row'];


// Helper function to get user ID safely
async function getUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("User not authenticated.");
  }
  return userId;
}

// Other functions (fetchAccounts, createAccount, etc.) would go here...
// Assume they are defined as in previous versions ('supabase_accounts_api_fix')


/**
 * Gets the default account for the user. Creates one if it doesn't exist.
 */
export const getDefaultAccount = async (): Promise<Account | null> => {
  try {
    const userId = await getUserId();
    
    // Try to fetch the existing default account
    const { data, error } = await supabase
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
        institution: null, // institution doesn't exist in database, default to null
        account_number: data.account_number,
        created_at: data.created_at,
        updated_at: data.updated_at,
        user_id: data.user_id,
        custom_tags: [] // custom_tags doesn't exist in database, default to empty array
      };
    }
    
    // If no default account, try to get the first account
    const { data: firstAccount, error: firstAccountError } = await supabase
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
        institution: null, // institution doesn't exist in database, default to null
        account_number: firstAccount.account_number,
        created_at: firstAccount.created_at,
        updated_at: firstAccount.updated_at,
        user_id: firstAccount.user_id,
        custom_tags: [] // custom_tags doesn't exist in database, default to empty array
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
    const userId = await getUserId();
    
    const { data, error } = await supabase
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
        institution: null, // institution doesn't exist in database, default to null
        account_number: data.account_number,
        created_at: data.created_at,
        updated_at: data.updated_at,
        user_id: data.user_id,
        custom_tags: [] // custom_tags doesn't exist in database, default to empty array
      };
    }
    
    // No account found
    return null;
  } catch (error) {
    console.error('Error in getAccountById:', error);
    throw error;
  }
};

/**
 * Fetches all accounts for the current user.
 */
export const fetchAccounts = async (): Promise<Account[]> => {
  try {
    const userId = await getUserId();
    
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching accounts:', error);
      throw error;
    }

    // Map the database rows to Account type
    return (data || []).map(account => ({
      account_id: account.account_id,
      name: account.name,
      type: account.type as Account['type'],
      balance: account.balance || 0,
      currency: account.currency,
      is_active: account.is_active || true,
      is_default: account.is_default || false,
      institution: null, // institution doesn't exist in database, default to null
      account_number: account.account_number,
      created_at: account.created_at,
      updated_at: account.updated_at,
      user_id: account.user_id,
      custom_tags: [] // custom_tags doesn't exist in database, default to empty array
    }));
  } catch (error) {
    console.error('Error in fetchAccounts:', error);
    throw error;
  }
};

