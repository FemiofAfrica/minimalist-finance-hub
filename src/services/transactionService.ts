
import { supabase } from "@/integrations/supabase/client";
import { Transaction } from "@/types/transaction";

export const fetchTransactions = async (): Promise<Transaction[]> => {
  try {
    console.log("Fetching transactions...");
    
    // Step 1: Fetch all transactions
    const { data: transactionsData, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });

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
      const category = transaction.category_id ? categoriesMap.get(transaction.category_id) : null;
      
      return {
        ...transaction,
        category_name: category ? category.category_name : (transaction.category_name || 'Uncategorized')
      } as Transaction;
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
    const { data, error } = await supabase
      .from('transactions')
      .select('*, categories:category_id(category_name, category_type)')
      .eq('account_id', accountId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching transactions by account:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error in fetchTransactionsByAccount:", error);
    throw error;
  }
};

export const fetchTransactionsByCard = async (cardId: string): Promise<Transaction[]> => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, categories:category_id(category_name, category_type)')
      .eq('card_id', cardId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching transactions by card:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error in fetchTransactionsByCard:", error);
    throw error;
  }
};

export const createTransaction = async (transaction: Omit<Transaction, 'transaction_id'>): Promise<Transaction> => {
  try {
    // Check if the category exists
    let categoryId = transaction.category_id;
    
    if (transaction.category_name && !categoryId) {
      const { data: existingCategory, error: categoryError } = await supabase
        .from('categories')
        .select('category_id')
        .eq('category_name', transaction.category_name)
        .eq('category_type', transaction.category_type || 'EXPENSE')
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
            category_name: transaction.category_name,
            category_type: transaction.category_type || 'EXPENSE'
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

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        ...transaction,
        category_id: categoryId
      })
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
  updates: Partial<Transaction>
): Promise<Transaction> => {
  try {
    // Handle category updates if needed
    let categoryId = updates.category_id;
    
    if (updates.category_name && !categoryId) {
      const { data: existingCategory, error: categoryError } = await supabase
        .from('categories')
        .select('category_id')
        .eq('category_name', updates.category_name)
        .eq('category_type', updates.category_type || 'EXPENSE')
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
            category_name: updates.category_name,
            category_type: updates.category_type || 'EXPENSE'
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

    const { data, error } = await supabase
      .from('transactions')
      .update({
        ...updates,
        category_id: categoryId
      })
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
