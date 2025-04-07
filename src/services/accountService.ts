import { supabase } from "@/integrations/supabase/client";
// Assuming generated types are here:
import { Database } from "@/integrations/supabase/database.types";
import { Account } from "@/types/account"; // Your application's Account type

// Define the specific type for inserting into the accounts table using generated types
// Adjust 'public' if your schema is different
type AccountInsert = Database['public']['Tables']['accounts']['Insert'];
// Define the type for a row returned from the accounts table
type AccountRow = Database['public']['Tables']['accounts']['Row'];

// Define the type for updating accounts table rows using generated types
type AccountUpdate = Database['public']['Tables']['accounts']['Update'];

// Other functions (fetchAccounts, createAccount, etc.) would go here...
// Assume they are defined as in previous versions ('supabase_accounts_api_fix')


/**
 * Gets the default account for the user. Creates one if it doesn't exist.
 */
export const getDefaultAccount = async (userId: string): Promise<Account> => { // Returns application Account type
  try {
    if (!userId) throw new Error('User ID must be provided');
    const defaultAccountName = 'Default Account'; // Define default name

    console.log(`Getting or creating default account for user ${userId}`);

    // Try to fetch the existing default account
    const { data: existingAccount, error: fetchError } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('name', defaultAccountName) // Use schema column 'name'
      .maybeSingle(); // Returns AccountRow | null

    // Handle fetch errors (excluding 'No rows found' which is expected)
    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = range not satisfiable (0 rows)
      console.error('Error fetching default account:', fetchError);
      throw new Error('Failed to get default account: ' + fetchError.message);
    }

    // If account exists, return it (Map DB Row to Application Account type)
    if (existingAccount) {
      console.log("Found existing default account:", existingAccount.account_id);
      // You might need a mapping function here if AccountRow differs significantly from Account type
      // For simplicity, assuming direct compatibility or minimal mapping needed:
      return {
          ...existingAccount,
          // Ensure type compatibility if Account type uses different enum casing etc.
          type: existingAccount.type as Account['type'] // Cast if needed
      } as Account; // Assert as Account type
    }

    // --- Create Default Account ---
    console.log("Default account not found. Creating one...");

    // Explicitly type the object using the generated 'Insert' type
    const defaultAccountData: AccountInsert = {
      user_id: userId,
      name: defaultAccountName, // DB column 'name'
      type: 'savings' as 'checking' | 'savings' | 'credit' | 'investment', // Ensure this matches one of the expected literal types
      balance: 0,              // DB column 'balance'
      currency: 'NGN',         // DB column 'currency' - Ensure NGN is valid/default
      is_active: true          // DB column 'is_active'
      // created_at and updated_at are usually handled by the database
    };

    const { data: newAccount, error: createError } = await supabase
      .from('accounts')
      .insert(defaultAccountData) // Pass the correctly typed object
      .select()
      .single(); // Returns AccountRow

    if (createError) {
      console.error('Error creating default account:', createError);
      throw new Error('Failed to create default account: ' + createError.message);
    }

     if (!newAccount) {
         throw new Error("Failed to create or retrieve default account after insertion.");
     }

    console.log("Created new default account:", newAccount.account_id);
    // Map the newly created AccountRow to the application's Account type before returning
     return {
          ...newAccount,
          type: newAccount.type as Account['type'] // Cast if needed
      } as Account; // Assert as Account type

  } catch (error) {
    console.error("Error in getDefaultAccount:", error);
    throw error;
  }
};

// Make sure other functions like createAccount, updateAccount also use AccountInsert
// or AccountUpdate types from generated Supabase types when preparing data for .insert()/.update()


/**
 * Fetches all accounts for the current user.
 */
export const fetchAccounts = async (userId: string): Promise<Account[]> => {
  try {
    if (!userId) throw new Error('User ID must be provided');
    
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
      ...account,
      type: account.type as Account['type']
    }));
  } catch (error) {
    console.error('Error in fetchAccounts:', error);
    throw error;
  }
};

/**
 * Updates an existing account for the user.
 */
export const updateAccount = async (userId: string, accountId: string, updates: Partial<AccountUpdate>): Promise<Account> => {
  try {
    if (!userId) throw new Error('User ID must be provided');
    if (!accountId) throw new Error('Account ID must be provided');
    if (!updates || Object.keys(updates).length === 0) throw new Error('No update data provided');

    console.log(`Updating account ${accountId} for user ${userId}`);

    // Ensure user_id is not accidentally included in updates sent to Supabase
    const { user_id, ...validUpdates } = updates;

    // You might want additional validation here (e.g., check allowed fields)

    const { data: updatedAccount, error } = await supabase
      .from('accounts')
      .update(validUpdates) // Pass the update data
      .eq('user_id', userId)    // IMPORTANT: Ensure the user owns the account
      .eq('account_id', accountId) // Specify which account to update
      .select()               // Select the updated row data
      .single();              // Expect a single row back

    if (error) {
      console.error('Error updating account:', error);
      // Handle specific errors, e.g., row not found (PGRST116)
      if (error.code === 'PGRST116') {
          throw new Error("Account not found or user does not have permission to update it.");
      }
      throw new Error('Failed to update account: ' + error.message);
    }
    
    if (!updatedAccount) {
        throw new Error("Account data was not returned after update.");
    }

    console.log("Account updated successfully:", updatedAccount.account_id);
    // Map the AccountRow back to the application Account type
    return {
      ...updatedAccount,
      type: updatedAccount.type as Account['type']
    } as Account;

  } catch (error) {
    console.error("Error in updateAccount:", error);
    throw error;
  }
};

/**
 * Creates a new account for the user.
 */
export const createAccount = async (userId: string, accountData: Omit<AccountInsert, 'user_id'>): Promise<Account> => {
  try {
    if (!userId) throw new Error('User ID must be provided');

    const insertData: AccountInsert = {
      ...accountData,
      user_id: userId
    };
    
    // Add validation for accountData fields if necessary

    const { data: newAccount, error } = await supabase
      .from('accounts')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating account:', error);
      throw new Error('Failed to create account: ' + error.message);
    }
    
    if (!newAccount) {
        throw new Error("Account data was not returned after creation.");
    }

    console.log("Account created successfully:", newAccount.account_id);
    return {
      ...newAccount,
      type: newAccount.type as Account['type']
    } as Account;

  } catch (error) {
    console.error("Error in createAccount:", error);
    throw error;
  }
};

/**
 * Fetches a single account by its ID for the current user.
 */
export const getAccountById = async (userId: string, accountId: string): Promise<Account | null> => {
  try {
    if (!userId) throw new Error('User ID must be provided');
    if (!accountId) throw new Error('Account ID must be provided');

    console.log(`Fetching account ${accountId} for user ${userId}`);

    const { data: account, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)    // Ensure user owns the account
      .eq('account_id', accountId)
      .maybeSingle();          // Use maybeSingle to return null if not found

    if (error) {
      console.error(`Error fetching account ${accountId}:`, error);
      // Don't throw if it's just not found (PGRST116), return null instead
      if (error.code !== 'PGRST116') { 
          throw new Error('Failed to fetch account: ' + error.message);
      }
      // For PGRST116 (not found), fall through to return null
    }

    if (!account) {
        console.log(`Account ${accountId} not found for user ${userId}`);
        return null;
    }

    console.log("Account fetched successfully:", account.account_id);
    // Map the AccountRow back to the application Account type
    return {
      ...account,
      type: account.type as Account['type']
    } as Account;

  } catch (error) {
    console.error("Error in getAccountById:", error);
    throw error; // Re-throw other unexpected errors
  }
};

/**
 * Deletes an account for the user.
 */
export const deleteAccount = async (userId: string, accountId: string): Promise<void> => {
  try {
    if (!userId) throw new Error('User ID must be provided');
    if (!accountId) throw new Error('Account ID must be provided');

    console.log(`Deleting account ${accountId} for user ${userId}`);

    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('user_id', userId)    // Ensure user owns the account
      .eq('account_id', accountId);

    if (error) {
      console.error('Error deleting account:', error);
      throw new Error('Failed to delete account: ' + error.message);
    }

    console.log("Account deleted successfully:", accountId);

  } catch (error) {
    console.error("Error in deleteAccount:", error);
    throw error;
  }
};

