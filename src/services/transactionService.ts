
import { supabase } from "@/integrations/supabase/client";
import { Transaction } from "@/types/transaction";

export const fetchTransactions = async (): Promise<Transaction[]> => {
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
    .filter(id => id !== null && id !== undefined);
  
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
    const category = transaction.category_id ? categoriesMap.get(transaction.category_id) : null;
    
    return {
      ...transaction,
      category_name: category ? category.category_name : 'Uncategorized'
    } as Transaction;
  });
  
  console.log("Processed transactions:", enrichedTransactions);
  return enrichedTransactions;
};
