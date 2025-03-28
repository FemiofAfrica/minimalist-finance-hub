
import { supabase, getCurrentUserId } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/database.types";
import { Category } from "@/types/category";
import { Transaction, TransactionInput } from "@/types/transaction";

// Define the type of the data returned by the supabase query
type TransactionWithRelations = Database['public']['Tables']['transactions']['Row'] & {
  accounts: Pick<Database['public']['Tables']['accounts']['Row'], 'name'> | null;
  categories: Pick<Database['public']['Tables']['categories']['Row'], 'name' | 'type'> | null;
};

export const fetchTransactions = async (limit?: number): Promise<Transaction[]> => {
  try {
    console.log("Fetching transactions...");
    const userId = await getCurrentUserId();
    
    // Step 1: Fetch all transactions
    // Sort by created_at to include time information, falling back to date if created_at is not available
    let query = supabase
      .from('transactions')
      .select('*, accounts:account_id(name), categories:category_id(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .order('date', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data: transactionsData, error: transactionsError } = await query as { data: TransactionWithRelations[] | null, error: any };

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
      throw transactionsError;
    }

    console.log("Transactions data from Supabase:", transactionsData);

    if (!transactionsData || transactionsData.length === 0) {
      console.log("No transactions found in database");
      return [];
    }

    // Step 2: Extract all category IDs and fetch categories in a separate query
    const categoryIds = transactionsData
      .map(transaction => transaction.category_id)
      .filter((id): id is string => id !== null && id !== undefined);
    
    let categoriesMap = new Map();
    
    if (categoryIds.length > 0) {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .in('category_id', categoryIds);
      
      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
      } else if (categoriesData) {
        console.log("Categories data from Supabase:", categoriesData);
        // Create a map of category_id to category object for faster lookups
        categoriesData.forEach(category => {
          categoriesMap.set(category.category_id, category);
        });
      }
    }

    // Step 3: Combine transaction data with category data
    const enrichedTransactions = transactionsData.map(transaction => {
      const category = transaction.categories;
      const account = transaction.accounts;
      
      const enrichedTransaction: Transaction = {
        transaction_id: transaction.transaction_id,
        user_id: transaction.user_id,
        amount: transaction.amount,
        currency: transaction.currency,
        date: transaction.date,
        created_at: transaction.created_at || null,
        updated_at: transaction.updated_at || null,
        description: transaction.description,
        notes: transaction.notes,
        name: transaction.name || transaction.description,
        type: transaction.type,
        account_id: transaction.account_id,
        category_id: transaction.category_id,
        category_name: category ? category.name : 'Uncategorized',
        account_name: account ? account.name : null,
        category_type: transaction.type ? transaction.type.toUpperCase() as "INCOME" | "EXPENSE" | "TRANSFER" : 'EXPENSE'
      };
      return enrichedTransaction;
    });
    
    console.log("Processed transactions:", enrichedTransactions);
    return enrichedTransactions;
  } catch (error) {
    console.error("Error in fetchTransactions:", error);
    throw error;
  }
};

export const fetchTransactionsByAccount = async (accountId: string): Promise<Transaction[]> => {
  try {
    const { data: transactionsData, error } = await supabase
      .from('transactions')
      .select('*, categories:category_id(name)')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .order('date', { ascending: false }) as { data: TransactionWithRelations[] | null, error: any };

    if (error) {
      console.error('Error fetching transactions by account:', error);
      throw error;
    }

    if (!transactionsData || transactionsData.length === 0) {
      return [];
    }

    const enrichedTransactions = transactionsData.map(transaction => {
      const category = transaction.categories;
      
      const enrichedTransaction: Transaction = {
        transaction_id: transaction.transaction_id,
        user_id: transaction.user_id,
        amount: transaction.amount,
        currency: transaction.currency,
        date: transaction.date,
        created_at: transaction.created_at || null,
        updated_at: transaction.updated_at || null,
        description: transaction.description,
        notes: transaction.notes,
        type: transaction.type,
        account_id: transaction.account_id,
        category_id: transaction.category_id,
        category_name: category ? category.name : 'Uncategorized',
        category_type: transaction.type ? transaction.type.toUpperCase() as "INCOME" | "EXPENSE" | "TRANSFER" : 'EXPENSE'
      };
      return enrichedTransaction;
    });

    return enrichedTransactions;
  } catch (error) {
    console.error("Error in fetchTransactionsByAccount:", error);
    throw error;
  }
};

export const fetchTransactionsByCard = async (cardId: string): Promise<Transaction[]> => {
  try {
    console.log("Fetching transactions by card...");
    
    // Step 1: Fetch all transactions for this card
    const { data: transactionsData, error: transactionsError } = await supabase
      .from('transactions')
      .select('*, categories:category_id(name)')
      .eq('card_id', cardId)
      .order('created_at', { ascending: false })
      .order('date', { ascending: false }) as { data: TransactionWithRelations[] | null, error: any };

    if (transactionsError) {
      console.error('Error fetching transactions by card:', transactionsError);
      throw transactionsError;
    }

    if (!transactionsData || transactionsData.length === 0) {
      console.log("No transactions found for this card");
      return [];
    }

    // Step 2: Extract all category IDs and fetch categories in a separate query
    const categoryIds = transactionsData
      .map(transaction => transaction.category_id)
      .filter((id): id is string => id !== null && id !== undefined);
    
    let categoriesMap = new Map();
    
    if (categoryIds.length > 0) {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .in('category_id', categoryIds);
      
      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
      } else if (categoriesData) {
        // Create a map of category_id to category object for faster lookups
        categoriesData.forEach(category => {
          categoriesMap.set(category.category_id, category);
        });
      }
    }

    // Step 3: Combine transaction data with category data
    const enrichedTransactions = transactionsData.map(transaction => {
      const category = transaction.categories;
      
      const enrichedTransaction: Transaction = {
        transaction_id: transaction.transaction_id,
        user_id: transaction.user_id,
        amount: transaction.amount,
        currency: transaction.currency,
        date: transaction.date,
        created_at: transaction.created_at || null,
        updated_at: transaction.updated_at || null,
        description: transaction.description,
        notes: transaction.notes,
        type: transaction.type,
        account_id: transaction.account_id,
        category_id: transaction.category_id,
        category_name: category ? category.name : 'Uncategorized',
        category_type: transaction.type ? transaction.type.toUpperCase() as "INCOME" | "EXPENSE" | "TRANSFER" : 'EXPENSE'
      };
      return enrichedTransaction;
    });
    
    return enrichedTransactions;
  } catch (error) {
    console.error("Error in fetchTransactionsByCard:", error);
    throw error;
  }
};

export const createTransaction = async (transaction: TransactionInput): Promise<Transaction> => {
  try {
    const userId = await getCurrentUserId();
    
    // Check if the category exists
    let categoryId = transaction.category_id;
    
    if (transaction.category_name && !categoryId) {
      const { data: existingCategory, error: categoryError } = await supabase
        .from('categories')
        .select('category_id, name, type')
        .eq('name', transaction.category_name)
        .eq('user_id', userId)
        .eq('type', transaction.type?.toLowerCase() || 'expense')
        .maybeSingle<Category>();

      if (categoryError) {
        console.error('Category lookup error:', categoryError);
        throw categoryError;
      }

      if (existingCategory) {
        categoryId = existingCategory.category_id;
      } else {
        // Create a new category
        const { data: newCategory, error: insertCategoryError } = await supabase
          .from('categories')
          .insert({
            name: transaction.category_name,
            user_id: userId,
            type: (transaction.type?.toLowerCase() || 'expense') as 'income' | 'expense' | 'transfer'
          })
          .select()
          .single();

        if (insertCategoryError) {
          console.error('Category creation error:', insertCategoryError);
          throw insertCategoryError;
        }

        categoryId = newCategory.category_id;
      }
    }

    // Get account currency if not provided
    let currency = transaction.currency;
    if (!currency && transaction.account_id) {
      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .select('currency')
        .eq('account_id', transaction.account_id)
        .single();
      
      if (accountError) {
        console.error('Error fetching account currency:', accountError);
        throw accountError;
      }
      
      currency = accountData.currency;
    }

    // Prepare transaction data with required fields
    const transactionData = {
      user_id: userId,
      account_id: transaction.account_id,
      type: (transaction.type || 'expense').toLowerCase() as 'income' | 'expense' | 'transfer', // Default to expense if not specified
      amount: transaction.amount,
      currency: currency || 'USD', // Default to USD if not specified
      description: transaction.description || '',
      date: transaction.date || new Date().toISOString(),
      category_id: categoryId,
      notes: transaction.notes || '',
      name: transaction.name || transaction.description || ''
    };
    
    // If no category_name was provided but we have a description, use the description as the category name
    if (!transaction.category_name && transaction.description && !categoryId) {
      // Create a new category using the description as the name
      const { data: newCategory, error: insertCategoryError } = await supabase
        .from('categories')
        .insert({
          name: transaction.description,
          user_id: userId,
          type: (transaction.type?.toLowerCase() || 'expense') as 'income' | 'expense' | 'transfer'
        })
        .select()
        .single();

      if (insertCategoryError) {
        console.error('Category creation error:', insertCategoryError);
        throw insertCategoryError;
      }

      transactionData.category_id = newCategory.category_id;
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert(transactionData)
      .select()
      .single();

    if (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }

    return data;
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
    
    // Handle category updates if needed
    let categoryId = updates.category_id;
    
    if (updates.category_name && !categoryId) {
      const { data: existingCategory, error: categoryError } = await supabase
        .from('categories')
        .select('category_id')
        .eq('name', updates.category_name)
        .eq('user_id', userId)
        .eq('type', (updates.type || 'expense').toLowerCase())
        .maybeSingle();

      if (categoryError) {
        console.error('Category lookup error:', categoryError);
        throw categoryError;
      }

      if (existingCategory) {
        categoryId = existingCategory.category_id;
      } else {
        // Create a new category
        const { data: newCategory, error: insertCategoryError } = await supabase
          .from('categories')
          .insert({
            name: updates.category_name,
            user_id: userId,
            type: updates.type?.toLowerCase() || 'expense'
          })
          .select()
          .single();

        if (insertCategoryError) {
          console.error('Category creation error:', insertCategoryError);
          throw insertCategoryError;
        }

        categoryId = newCategory.category_id;
      }
    }

    // Prepare update data
    const updateData: any = {};
    
    // Only include fields that are in the new schema
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.amount !== undefined) updateData.amount = updates.amount;
    if (updates.currency !== undefined) updateData.currency = updates.currency;
    if (updates.description !== undefined) {
      updateData.description = updates.description;
      
      // If description is updated but no category_name is provided, use description as category_name
      if (!updates.category_name && !categoryId) {
        updates.category_name = updates.description;
        
        // Create or find a category with the same name as the description
        const { data: existingCategory, error: categoryError } = await supabase
          .from('categories')
          .select('category_id')
          .eq('name', updates.description)
          .eq('user_id', userId)
          .eq('type', (updates.type || 'expense').toLowerCase())
          .maybeSingle();

        if (categoryError) {
          console.error('Category lookup error:', categoryError);
          throw categoryError;
        }

        if (existingCategory) {
          categoryId = existingCategory.category_id;
        } else {
          // Create a new category
          const { data: newCategory, error: insertCategoryError } = await supabase
            .from('categories')
            .insert({
              name: updates.description,
              user_id: userId,
              type: updates.type?.toLowerCase() || 'expense'
            })
            .select()
            .single();

          if (insertCategoryError) {
            console.error('Category creation error:', insertCategoryError);
            throw insertCategoryError;
          }

          categoryId = newCategory.category_id;
        }
      }
    }
    if (updates.date !== undefined) updateData.date = updates.date;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (categoryId !== undefined) updateData.category_id = categoryId;
    if (updates.account_id !== undefined) updateData.account_id = updates.account_id;

    const { data, error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('transaction_id', transactionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error in updateTransaction:", error);
    throw error;
  }
};
