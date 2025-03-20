
import { supabase } from "@/integrations/supabase/client";
import { Transaction } from "@/types/transaction";
import logger from "@/utils/logger";

export const fetchTransactions = async (signal?: AbortSignal): Promise<Transaction[]> => {
  // Check if the request has been aborted before starting
  if (signal?.aborted) {
    logger.debug("Request was aborted before starting");
    // Return empty array instead of throwing error for aborted requests
    return [];
  }

  try {
    logger.info("Fetching transactions...");
    
    // Check if Supabase client is properly initialized
    if (!supabase) {
      logger.error("Supabase client is not initialized");
      return [];
    }
    
    // Step 1: Fetch all transactions
    // Sort by created_at to include time information, falling back to date if created_at is not available
    const { data: transactionsData, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .order('date', { ascending: false })
      .abortSignal(signal as AbortSignal);

    // Check if the request was aborted during the fetch
    if (signal?.aborted) {
      logger.debug("Request was aborted during fetch");
      // Return empty array instead of throwing error for aborted requests
      return [];
    }

    if (transactionsError) {
      logger.error('Error fetching transactions:', transactionsError);
      throw new Error(transactionsError.message);
    }

    if (!transactionsData) {
      logger.error("No transactions data received from Supabase");
      throw new Error("Failed to fetch transactions data");
    }

    logger.info("Transactions data from Supabase - count:", transactionsData.length);
    if (transactionsData.length > 0) {
      // Log a sample transaction to help with debugging
      const sampleTransaction = transactionsData[0];
      logger.debug("Sample transaction:", {
        id: sampleTransaction.transaction_id,
        description: sampleTransaction.description,
        amount: sampleTransaction.amount,
        date: sampleTransaction.date,
        created_at: sampleTransaction.created_at,
        category_id: sampleTransaction.category_id,
        category_type: sampleTransaction.category_type
      });
    } else {
      logger.info("No transactions found in database");
      return [];
    }

    // Step 2: Extract all category IDs and fetch categories in a separate query
    const categoryIds = transactionsData
      .map(transaction => transaction.category_id)
      .filter((id): id is string => id !== null && id !== undefined);
    
    let categoriesMap = new Map();
    
    if (categoryIds.length > 0 && !signal?.aborted) {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .in('category_id', categoryIds)
        .abortSignal(signal as AbortSignal); // Add abort signal to categories fetch as well
      
      // Check if the request was aborted during categories fetch
      if (signal?.aborted) {
        logger.debug("Request was aborted during categories fetch");
        // Return what we have so far instead of throwing error
        return transactionsData.map(transaction => ({
          ...transaction,
          category_name: transaction.category_name || 'Uncategorized'
        })) as Transaction[];
      }
      
      if (categoriesError) {
        logger.error('Error fetching categories:', categoriesError);
        // Continue with what we have instead of failing completely
      } else if (categoriesData) {
        logger.debug("Categories data from Supabase:", categoriesData);
        // Create a map of category_id to category object for faster lookups
        categoriesData.forEach(category => {
          categoriesMap.set(category.category_id, category);
        });
      }
    }

    // Step 3: Combine transaction data with category data
    const enrichedTransactions = transactionsData.map(transaction => {
      const category = transaction.category_id ? categoriesMap.get(transaction.category_id) : null;
      
      // Ensure date is properly formatted - this is the critical part that needs fixing
      let formattedDate = transaction.date;
      if (formattedDate) {
        try {
          // Make sure we have a valid date string in ISO format
          // This helps standardize the date format for consistent filtering
          if (typeof formattedDate === 'string') {
            // First, ensure we're working with just the date part (YYYY-MM-DD)
            // This handles both ISO strings and date-only strings
            const dateStr = formattedDate.split('T')[0];
            // Create a date object at noon to avoid timezone issues
            const dateObj = new Date(`${dateStr}T12:00:00Z`);
            
            if (!isNaN(dateObj.getTime())) {
              // Store the full ISO string to preserve time information
              formattedDate = dateObj.toISOString();
            }
          } else if (typeof formattedDate === 'object' && formattedDate !== null && 'getTime' in formattedDate) {
            // Handle Date objects
            const dateObj = formattedDate as Date;
            if (!isNaN(dateObj.getTime())) {
              formattedDate = dateObj.toISOString();
            }
          } else {
            // Handle other types (like timestamps)
            const dateObj = new Date(String(formattedDate));
            if (!isNaN(dateObj.getTime())) {
              formattedDate = dateObj.toISOString();
            }
          }
        } catch (error) {
          logger.warn(`Error formatting date for transaction ${transaction.transaction_id}:`, error);
          // Keep the original date value if formatting fails
        }
      }
      
      return {
        ...transaction,
        date: formattedDate,
        category_name: category ? category.category_name : (transaction.category_name || 'Uncategorized')
      } as Transaction;
    });
    
    logger.info("Processed transactions count:", enrichedTransactions.length);
    // If we have no transactions, log a more specific message to help with debugging
    if (enrichedTransactions.length === 0) {
      logger.info("No transactions found after processing. This could be due to filtering or no data in the database.");
    }
    return enrichedTransactions;
  } catch (error) {
    // Handle abort errors gracefully
    if (error instanceof Error && (error.name === 'AbortError' || error.message === 'Request aborted')) {
      logger.debug("Fetch aborted:", error.message);
      return []; // Return empty array for aborted requests instead of throwing
    }
    
    logger.error("Error in fetchTransactions:", error);
    throw error; // Only rethrow non-abort errors to be handled by the component
  }
};

export const fetchTransactionsByAccount = async (accountId: string): Promise<Transaction[]> => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, categories:category_id(category_name, category_type)')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .order('date', { ascending: false });

    if (error) {
      logger.error('Error fetching transactions by account:', error);
      throw error;
    }

    return (data || []) as Transaction[];
  } catch (error) {
    logger.error("Error in fetchTransactionsByAccount:", error);
    throw error;
  }
};

export const fetchTransactionsByCard = async (cardId: string): Promise<Transaction[]> => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, categories:category_id(category_name, category_type)')
      .eq('card_id', cardId)
      .order('created_at', { ascending: false })
      .order('date', { ascending: false });

    if (error) {
      logger.error('Error fetching transactions by card:', error);
      throw error;
    }

    return (data || []) as Transaction[];
  } catch (error) {
    logger.error("Error in fetchTransactionsByCard:", error);
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
        logger.error('Category lookup error:', categoryError);
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
          logger.error('Category creation error:', insertCategoryError);
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
      logger.error('Error creating transaction:', error);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error("Error in createTransaction:", error);
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
        logger.error('Category lookup error:', categoryError);
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
          logger.error('Category creation error:', insertCategoryError);
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
      logger.error('Error updating transaction:', error);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error("Error in updateTransaction:", error);
    throw error;
  }
};

export const deleteTransaction = async (transactionId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('transaction_id', transactionId);

    if (error) {
      logger.error('Error deleting transaction:', error);
      throw error;
    }
  } catch (error) {
    logger.error("Error in deleteTransaction:", error);
    throw error;
  }
};
