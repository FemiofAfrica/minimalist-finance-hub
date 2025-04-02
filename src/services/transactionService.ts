import { supabase, getCurrentUserId } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/database.types"; // Assuming types are generated
import { Category } from "@/types/category";
import { Transaction, TransactionInput } from "@/types/transaction";

// Helper function to get user ID safely
async function getUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("User not authenticated.");
  }
  return userId;
}

// --- Helper Function to Map Supabase Data to Application Type ---
// This ensures consistency and handles potential nulls from joins
// Takes 'any' because the exact structure returned by Supabase with hints can be complex for TS to infer directly
function mapSupabaseDataToTransaction(dbData: any): Transaction {
    // Basic validation
    if (!dbData || typeof dbData !== 'object') {
        console.error("Invalid data received for mapping:", dbData);
        throw new Error("Invalid data structure received from database query.");
    }

    // Safely access nested properties, providing defaults
    // IMPORTANT: Double-check the actual structure returned by Supabase with the '!' syntax.
    // It might nest under 'account_id' or 'category_id' instead of 'accounts'/'categories'.
    // Adjust the accessors below if necessary after inspecting the 'data' object via console.log(dbData).
    const accountsData = dbData.accounts ?? dbData.account_id; // Example fallback
    const categoriesData = dbData.categories ?? dbData.category_id; // Example fallback

    const categoryName = categoriesData?.name ?? 'Uncategorized';
    const categoryTypeRaw = categoriesData?.type ?? dbData.type; // Use category table type first
    // Ensure categoryType aligns with your expected Transaction type values
    const categoryType = categoryTypeRaw?.toUpperCase() as "INCOME" | "EXPENSE" | "TRANSFER" | undefined ?? 'EXPENSE';

    const accountName = accountsData?.name ?? null;

    const amount = typeof dbData.amount === 'number' ? dbData.amount : parseFloat(String(dbData.amount ?? 0));

    return {
        transaction_id: dbData.transaction_id,
        user_id: dbData.user_id,
        account_id: dbData.account_id,
        category_id: dbData.category_id,
        name: dbData.description ?? '', // Or map differently if 'name' exists directly
        description: dbData.description ?? '',
        amount: isNaN(amount) ? 0 : amount,
        currency: dbData.currency,
        date: dbData.date,
        type: dbData.type as 'income' | 'expense' | 'transfer', // Transaction's own type
        notes: dbData.notes,
        created_at: dbData.created_at,
        updated_at: dbData.updated_at,
        // Mapped fields from relations
        account_name: accountName,
        category_name: categoryName,
        category_type: categoryType, // Type from the Category relation
    };
}


// --- Corrected Fetching Functions ---

export const fetchTransactions = async (limit?: number): Promise<Transaction[]> => {
  try {
    console.log(`Fetching transactions${limit ? ` (limit ${limit})` : ''}...`);
    const userId = await getUserId();

    let query = supabase
      .from('transactions')
      // Apply explicit foreign key hinting syntax
      // VERIFY 'account_id' and 'category_id' are the correct FK column names in 'transactions'
      .select(`
        *,
        account_id!accounts ( name ),
        category_id!categories ( name, type )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false, nullsFirst: false })
      .order('date', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    // Execute the query, let Supabase handle the complex return type internally for now
    const { data, error } = await query;

    if (error) {
      console.error('Error fetching transactions:', error);
      if (error.code === '42703') {
          console.error("Database schema mismatch or incorrect relationship detection. Verify foreign keys and table/column names used in the select hint (e.g., 'account_id', 'category_id', 'accounts', 'categories', 'name', 'type').");
      }
      throw error;
    }

    if (!data || data.length === 0) {
      console.log("No transactions found in database");
      return [];
    }

    // Map the potentially complex/less-typed data structure using our helper
    const enrichedTransactions = (data as any[]).map(mapSupabaseDataToTransaction);

    console.log(`Processed ${enrichedTransactions.length} transactions.`);
    return enrichedTransactions;

  } catch (error) {
    console.error("Error in fetchTransactions:", error);
    throw error;
  }
};

export const fetchTransactionsByAccount = async (accountId: string): Promise<Transaction[]> => {
  try {
    console.log(`Fetching transactions for account ID: ${accountId}`);
    const userId = await getUserId();

    const { data, error } = await supabase
      .from('transactions')
       // Apply explicit foreign key hinting syntax
      // VERIFY 'account_id' and 'category_id' are the correct FK column names in 'transactions'
      .select(`
        *,
        account_id!accounts ( name ),
        category_id!categories ( name, type )
      `)
      .eq('user_id', userId)
      .eq('account_id', accountId)
      .order('created_at', { ascending: false, nullsFirst: false })
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching transactions by account:', error);
      if (error.code === '42703') {
           console.error("Database schema mismatch or incorrect relationship detection. Verify foreign keys and table/column names used in the select hint.");
      }
      throw error;
    }

    if (!data || data.length === 0) {
       console.log(`No transactions found for account ${accountId}`);
      return [];
    }

    // Map results using the helper function
    const enrichedTransactions = (data as any[]).map(mapSupabaseDataToTransaction);

    console.log(`Processed ${enrichedTransactions.length} transactions for account ${accountId}.`);
    return enrichedTransactions;

  } catch (error) {
    console.error("Error in fetchTransactionsByAccount:", error);
    throw error;
  }
};

// Assuming 'card_id' is a column in your 'transactions' table
export const fetchTransactionsByCard = async (cardId: string): Promise<Transaction[]> => {
  try {
    console.log(`Fetching transactions for card ID: ${cardId}`);
    const userId = await getUserId();

    const { data, error } = await supabase
      .from('transactions')
      // Apply explicit foreign key hinting syntax
      // VERIFY 'account_id' and 'category_id' are the correct FK column names in 'transactions'
      .select(`
        *,
        account_id!accounts ( name ),
        category_id!categories ( name, type )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false, nullsFirst: false })
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching transactions by card:', error);
       if (error.code === '42703') {
           console.error("Database schema mismatch or incorrect relationship detection. Verify foreign keys and table/column names used in the select hint.");
      }
      throw error;
    }

     if (!data || data.length === 0) {
       console.log(`No transactions found for card ${cardId}`);
      return [];
    }

    // Map results using the helper function
    const enrichedTransactions = (data as any[]).map(mapSupabaseDataToTransaction);

    console.log(`Processed ${enrichedTransactions.length} transactions for card ${cardId}.`);
    return enrichedTransactions;

  } catch (error) {
    console.error("Error in fetchTransactionsByCard:", error);
    throw error;
  }
};


// --- createTransaction and updateTransaction ---

export const createTransaction = async (transaction: TransactionInput): Promise<Transaction> => {
  try {
    const userId = await getUserId();

    // --- Category Handling ---
    let categoryId = transaction.category_id;
    // [ Keep existing category find/create logic here... ]
    if (transaction.category_name && !categoryId) {
      const categoryTypeLower = (transaction.type ?? 'expense').toLowerCase() as 'income' | 'expense' | 'transfer';
      const { data: existingCategory } = await supabase
        .from('categories')
        .select('category_id')
        .eq('name', transaction.category_name)
        .eq('user_id', userId)
        .eq('type', categoryTypeLower)
        .maybeSingle();

      if (existingCategory) {
        categoryId = existingCategory.category_id;
      } else {
        const { data: newCategory, error: insertCatError } = await supabase
          .from('categories')
          .insert({ name: transaction.category_name, user_id: userId, type: categoryTypeLower })
          .select('category_id')
          .single();
        if (insertCatError) throw insertCatError;
        categoryId = newCategory.category_id;
      }
    } else if (!categoryId && transaction.description) {
       const categoryTypeLower = (transaction.type ?? 'expense').toLowerCase() as 'income' | 'expense' | 'transfer';
       const { data: existingCategory } = await supabase
        .from('categories')
        .select('category_id')
        .eq('name', transaction.description)
        .eq('user_id', userId)
        .eq('type', categoryTypeLower)
        .maybeSingle();

       if (existingCategory) {
           categoryId = existingCategory.category_id;
       } else {
           const { data: newCategory, error: insertCatError } = await supabase
             .from('categories')
             .insert({ name: transaction.description, user_id: userId, type: categoryTypeLower })
             .select('category_id')
             .single();
           if (insertCatError) throw insertCatError;
           categoryId = newCategory.category_id;
       }
    }


    // --- Currency Handling ---
    let currency = transaction.currency;
     if (!currency && transaction.account_id) {
       const { data: accountData, error: accountError } = await supabase
         .from('accounts')
         .select('currency')
         .eq('account_id', transaction.account_id)
         .maybeSingle();
       if (accountError) throw accountError;
       currency = accountData?.currency ?? 'NGN';
    } else if (!currency) {
        currency = 'NGN';
    }


    // --- Prepare Data for DB ---
    const transactionDataToInsert = {
      user_id: userId,
      account_id: transaction.account_id,
      category_id: categoryId,
      type: (transaction.type ?? 'expense').toLowerCase() as 'income' | 'expense' | 'transfer',
      amount: transaction.amount,
      currency: currency,
      description: transaction.description ?? '',
      date: transaction.date ?? new Date().toISOString().split('T')[0],
      notes: transaction.notes,
      // card_id: transaction.card_id // Include if applicable
    };

     Object.keys(transactionDataToInsert).forEach(key => {
        const typedKey = key as keyof typeof transactionDataToInsert;
        if (transactionDataToInsert[typedKey] === undefined) {
            delete transactionDataToInsert[typedKey];
        }
    });


    // --- Insert Transaction ---
    const { data, error } = await supabase
      .from('transactions')
      .insert(transactionDataToInsert)
      // Apply explicit foreign key hinting syntax to the select after insert
      // VERIFY 'account_id' and 'category_id' are the correct FK column names
      .select(`
          *,
          account_id!accounts ( name ),
          category_id!categories ( name, type )
      `)
      .single(); // This returns the inserted row with the joined data

    // ** The TS2589 error likely occurred around the line above **
    // The fix is to rely on the mapping function rather than complex type inference here.

    if (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }

    // Map the result to the application's Transaction type
    return mapSupabaseDataToTransaction(data); // Pass the raw data to the mapper

  } catch (error) {
    console.error("Error in createTransaction:", error);
    throw error;
  }
};

export const updateTransaction = async (
  transactionId: string,
  updates: Partial<TransactionInput>
): Promise<Transaction> => {
   try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("User not authenticated.");

    // --- Category Handling ---
    let categoryId = updates.category_id;
    // [ Keep existing category find/create logic here... ]
     if (updates.category_name) {
        const categoryTypeLower = (updates.type ?? 'expense').toLowerCase() as 'income' | 'expense' | 'transfer';
         const { data: existingCategory } = await supabase
            .from('categories')
            .select('category_id')
            .eq('name', updates.category_name)
            .eq('user_id', userId)
            .eq('type', categoryTypeLower)
            .maybeSingle();

         if (existingCategory) {
             categoryId = existingCategory.category_id;
         } else {
              const { data: newCategory, error: insertCatError } = await supabase
                 .from('categories')
                 .insert({ name: updates.category_name, user_id: userId, type: categoryTypeLower })
                 .select('category_id')
                 .single();
              if (insertCatError) throw insertCatError;
              categoryId = newCategory.category_id;
         }
    } else if (updates.description && updates.category_id === undefined) {
         const categoryTypeLower = (updates.type ?? 'expense').toLowerCase() as 'income' | 'expense' | 'transfer';
          const { data: existingCategory } = await supabase
            .from('categories')
            .select('category_id')
            .eq('name', updates.description) // Use description as name
            .eq('user_id', userId)
            .eq('type', categoryTypeLower)
            .maybeSingle();

         if (existingCategory) {
             categoryId = existingCategory.category_id;
         } else {
              const { data: newCategory, error: insertCatError } = await supabase
                 .from('categories')
                 .insert({ name: updates.description, user_id: userId, type: categoryTypeLower })
                 .select('category_id')
                 .single();
              if (insertCatError) throw insertCatError;
              categoryId = newCategory.category_id;
         }
    }


    // --- Prepare Update Data ---
    const updateData: { [key: string]: any } = {};
    if (updates.account_id !== undefined) updateData.account_id = updates.account_id;
    if (categoryId !== undefined) updateData.category_id = categoryId; // Use determined categoryId
    if (updates.type !== undefined) updateData.type = updates.type.toLowerCase();
    if (updates.amount !== undefined) updateData.amount = updates.amount;
    if (updates.currency !== undefined) updateData.currency = updates.currency;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.date !== undefined) updateData.date = updates.date;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    // if (updates.card_id !== undefined) updateData.card_id = updates.card_id; // Include if applicable


    // --- Update Transaction ---
     if (Object.keys(updateData).length === 0) {
         console.warn("Update called with no changes.");
         // Fetch current data using the same select logic
         const { data: currentData, error: currentError } = await supabase
            .from('transactions')
            .select(`
                *,
                account_id!accounts ( name ),
                category_id!categories ( name, type )
            `)
            .eq('transaction_id', transactionId)
            .eq('user_id', userId) // Also check user ID here for fetch
            .single();
         if (currentError) throw currentError;
         // Check if data exists before mapping
         if (!currentData) throw new Error("Transaction not found or access denied.");
         return mapSupabaseDataToTransaction(currentData);
     }


    const { data, error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('transaction_id', transactionId)
      .eq('user_id', userId) // Ensure user can only update their own transactions
      // Apply explicit foreign key hinting syntax to the select after update
      // VERIFY 'account_id' and 'category_id' are the correct FK column names
      .select(`
          *,
          account_id!accounts ( name ),
          category_id!categories ( name, type )
      `)
      .single(); // This returns the updated row with joined data

    // ** The TS2589 error likely occurred around the line above **
    // The fix is to rely on the mapping function rather than complex type inference here.

    if (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }

     // Check if data exists before mapping (update might not return data if RLS prevents it)
    if (!data) throw new Error("Transaction update failed or data not returned.");

    // Map the result to the application's Transaction type
    return mapSupabaseDataToTransaction(data);

  } catch (error) {
    console.error("Error in updateTransaction:", error);
    throw error;
  }
};
