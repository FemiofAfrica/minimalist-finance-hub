import { supabase, getCurrentUserId } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/database.types"; // Assuming types are generated
import { Category } from "@/types/category";
import { Transaction, TransactionInput } from "@/types/transaction";

// Define the specific type for inserting into the transactions table using generated types
// Adjust 'public' if your schema is different
type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];
// Define the type for a row returned from the transactions table
type TransactionRow = Database['public']['Tables']['transactions']['Row'];

// Type for the structure returned by SELECT with joins
type TransactionWithRelations = TransactionRow & {
  accounts: Pick<Database['public']['Tables']['accounts']['Row'], 'name'> | null;
  categories: Pick<Database['public']['Tables']['categories']['Row'], 'category_name' | 'category_type'> | null;
};

// Work around TypeScript's deep instantiation error by casting supabase to any for specific operations
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAny = supabase as any;

// Helper function to get user ID safely
async function getUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("User not authenticated.");
  }
  return userId;
}

// --- Helper Function to Map Supabase Data to Application Type ---
function mapSupabaseDataToTransaction(dbData: Record<string, unknown>): Transaction {
    if (!dbData || typeof dbData !== 'object') {
        console.error("Invalid data received for mapping:", dbData);
        throw new Error("Invalid data structure received from database query.");
    }
    const accountsData = dbData.accounts as { name: string } | null;
    const categoriesData = dbData.categories as { 
      category_name?: string; 
      category_type?: string;
    } | null;
    
    // For transfer transactions, use "Transfer" as the category name instead of "Uncategorized"
    const isTransfer = dbData.type === 'transfer';
    const categoryName = isTransfer ? 'Transfer' : (categoriesData?.category_name ?? 'Uncategorized');
    
    // Also set the category type appropriately for transfers
    const categoryType = isTransfer 
      ? 'TRANSFER' 
      : (categoriesData?.category_type?.toUpperCase() as Transaction['category_type'] ?? 
         (dbData.type === 'income' ? 'INCOME' : 'EXPENSE'));
         
    const accountName = accountsData?.name ?? null;
    const amount = typeof dbData.amount === 'number' ? dbData.amount : parseFloat(String(dbData.amount ?? 0));

    return {
        transaction_id: dbData.transaction_id as string,
        user_id: dbData.user_id as string,
        account_id: dbData.account_id as string,
        category_id: dbData.category_id as string | null,
        description: dbData.description as string ?? '',
        amount: isNaN(amount) ? 0 : amount,
        currency: dbData.currency as string,
        date: dbData.date as string,
        type: dbData.type as 'income' | 'expense' | 'transfer',
        notes: dbData.notes as string | null,
        created_at: dbData.created_at as string,
        updated_at: dbData.updated_at as string,
        account_name: accountName,
        category_name: categoryName,
        category_type: categoryType,
    };
}


// --- Fetching Functions ---
export const fetchTransactions = async (limit?: number): Promise<{ transactions: Transaction[], totalIncome: number, totalExpenses: number, netBalance: number }> => {
  try {
    const userId = await getUserId();
    if (!userId) {
      throw new Error('User must be authenticated to fetch transactions');
    }

    // Build the query with proper joins and filters
    let query = supabase
      .from('transactions')
      .select(`
        *,
        accounts (name),
        categories (category_name, category_type)
      `)
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    // Apply limit if specified
    if (limit) {
      query = query.limit(limit);
    }

    // Use explicit type assertion instead of @ts-expect-error
    const result = await query as unknown as {
      data: TransactionWithRelations[] | null;
      error: Error | null;
    };
    
    const { data, error } = result;

    if (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }

    const transactions = (data || []).map(mapSupabaseDataToTransaction);

    // Calculate totals
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const netBalance = totalIncome - totalExpenses;

    return { transactions, totalIncome, totalExpenses, netBalance };
  } catch (error) {
    console.error('Error in fetchTransactions:', error);
    throw error;
  }
};

export const fetchTransactionsByAccount = async (accountId: string): Promise<Transaction[]> => {
  try {
    const userId = await getUserId();
    if (!userId) {
      throw new Error('User must be authenticated to fetch transactions');
    }

    // Use explicit type assertion instead of relying on TypeScript inference
    const result = await supabase
      .from('transactions')
      .select(`
        *,
        accounts (name),
        categories (category_name, category_type)
      `)
      .eq('user_id', userId)
      .eq('account_id', accountId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }) as unknown as {
        data: TransactionWithRelations[] | null;
        error: Error | null;
      };
    
    const { data, error } = result;

    if (error) {
      console.error('Error fetching transactions by account:', error);
      throw error;
    }

    return (data || []).map(mapSupabaseDataToTransaction);
  } catch (error) {
    console.error('Error in fetchTransactionsByAccount:', error);
    throw error;
  }
};

export const fetchTransactionsByCard = async (cardId: string): Promise<Transaction[]> => {
  try {
    const userId = await getUserId();
    if (!userId) {
      throw new Error('User must be authenticated to fetch transactions');
    }

    // Use supabaseAny to bypass TypeScript's deep instantiation checks
    const { data, error } = await supabaseAny
      .from('transactions')
      .select(`
        *,
        accounts (name),
        categories (category_name, category_type)
      `)
      .eq('user_id', userId)
      .eq('card_id', cardId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching transactions by card:', error);
      throw error;
    }

    return (data || []).map(mapSupabaseDataToTransaction);
  } catch (error) {
    console.error('Error in fetchTransactionsByCard:', error);
    throw error;
  }
};


// --- createTransaction (Corrected) ---
export const createTransaction = async (transaction: TransactionInput): Promise<Transaction> => {
  try {
    const userId = await getUserId();

    // --- Validate required inputs ---
    // Ensure essential fields from the input are present before proceeding
    if (transaction.account_id == null) { // Check for null or undefined
        throw new Error("Account ID is required to create a transaction.");
    }
     if (transaction.amount == null) { // Check for null or undefined
        throw new Error("Amount is required to create a transaction.");
    }
    // Add checks for other absolutely essential inputs if necessary

    // --- Category Handling ---
    let categoryId = transaction.category_id;

    // Ensure we use category_name and category_type consistently here
    if (transaction.category_name && !categoryId) {
        // Get category type from transaction type if not provided
        const categoryType = transaction.type === 'income' ? 'INCOME' : 'EXPENSE';
        
        // @ts-expect-error - TypeScript has issues with deep type instantiation for Supabase queries
        const { data: existingCategory, error: findCatError } = await supabase
            .from('categories')
            .select('category_id')
            .eq('category_name', transaction.category_name)
            .eq('user_id', userId)
            .eq('category_type', categoryType)
            .maybeSingle();

        if (findCatError) {
            console.error("Error finding category:", findCatError);
            throw findCatError; // Rethrow
        }

        if (existingCategory) {
            categoryId = existingCategory.category_id;
        } else {
            // Create category using category_name and category_type
            console.log(`Creating category: ${transaction.category_name} (${categoryType})`);
            const { data: newCategory, error: insertCatError } = await supabase
                .from('categories')
                .insert({ 
                    name: transaction.category_name, // Categories table uses 'name' not 'category_name'
                    user_id: userId, 
                    category_type: categoryType
                })
                .select('category_id')
                .single();
                
            if (insertCatError) { 
                console.error("Error creating category:", insertCatError);
                throw insertCatError; // Rethrow
            } 
            // Check if newCategory is null which indicates insert failed unexpectedly
            if (!newCategory) { 
               throw new Error("Category creation did not return expected data.");
            }
            categoryId = newCategory.category_id;
        }
    }

    // --- Currency Handling ---
    let determinedCurrency = transaction.currency;
    if (!determinedCurrency && transaction.account_id) {
       const { data: accountData, error: accountError } = await supabase
         .from('accounts')
         .select('currency')
         .eq('account_id', transaction.account_id)
         .maybeSingle();
       if (accountError) throw accountError;
       determinedCurrency = accountData?.currency ?? 'NGN'; // Default if account/currency is missing
    } else if (!determinedCurrency) {
        determinedCurrency = 'NGN'; // Overall default
    }
    // Ensure currency is not null/undefined before insertion if it's required
     if (!determinedCurrency) {
         throw new Error("Could not determine currency for the transaction.");
     }

    // --- Insert and Update Operations ---
    try {
      // --- Prepare Data for DB Insertion (Build Object Conditionally) ---
      const insertData: TransactionInsert = {
          user_id: userId,
          account_id: transaction.account_id,
          category_id: categoryId || null,
          description: transaction.description || null,
          amount: transaction.amount,
          currency: determinedCurrency,
          date: transaction.date, // Assume this is properly formatted by the client
          type: transaction.type, 
          notes: transaction.notes || null
      };

      // --- Begin transaction with Supabase (need to manage this manually) ---
      await supabaseAny.rpc('begin_transaction');

      // Perform the actual insert
      // Use explicit type assertion instead of @ts-expect-error
      const result = await supabase
          .from('transactions')
          .insert(insertData)
          .select(`
              *,
              accounts (name),
              categories (category_name, category_type)
          `)
          .single() as unknown as {
            data: TransactionWithRelations | null;
            error: Error | null;
          };
      
      const { data, error } = result;

      if (error) {
          console.error("Error inserting transaction:", error);
          throw error;
      }

      if (!data) {
          throw new Error("Transaction creation did not return expected data.");
      }

      // --- Update Account Balance ---
      let balanceChange = transaction.amount;
      if (transaction.type === 'expense') {
          balanceChange = -transaction.amount; // Negate for expenses
      }
      // For transfers, we'll handle the destination account separately

      // Get current account balance
      const { data: accountData, error: accountError } = await supabase
          .from('accounts')
          .select('balance')
          .eq('account_id', transaction.account_id)
          .single();

      if (accountError) {
          throw accountError;
      }

      // Calculate new balance
      const newBalance = (accountData.balance || 0) + balanceChange;

      // Update the source account balance
      const { error: updateError } = await supabase
          .from('accounts')
          .update({ 
              balance: newBalance,
              updated_at: new Date().toISOString()
          })
          .eq('account_id', transaction.account_id);

      if (updateError) {
          throw updateError;
      }

      // --- Commit transaction ---
      await supabaseAny.rpc('commit_transaction');

      // Map the result to the application type and return
      return mapSupabaseDataToTransaction(data);
    } catch (error) {
      // Rollback transaction on any error
      await supabaseAny.rpc('rollback_transaction');
      throw error;
    }
  } catch (error) {
    console.error("Error in createTransaction:", error);
    throw error;
  }
};


// --- updateTransaction ---
export const updateTransaction = async (
  transactionId: string,
  updates: Partial<TransactionInput>
): Promise<Transaction> => { 
  try {
    const userId = await getUserId();

    // Validate required inputs
    if (!transactionId) {
      throw new Error("Transaction ID is required for update");
    }

    // Verify that this transaction belongs to the user
    const { data: existingTrans, error: checkError } = await supabase
      .from('transactions')
      .select('*')
      .eq('transaction_id', transactionId)
      .eq('user_id', userId)
      .single() as unknown as {
        data: TransactionRow | null;
        error: Error | null;
      };

    if (checkError) {
      console.error("Error checking transaction existence:", checkError);
      throw checkError;
    }

    if (!existingTrans) {
      throw new Error("Transaction not found or does not belong to user");
    }

    // Build update data
    const updateData: Partial<TransactionRow> = {
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.amount !== undefined && { amount: updates.amount }),
      ...(updates.date !== undefined && { date: updates.date }),
      ...(updates.category_id !== undefined && { category_id: updates.category_id }),
      ...(updates.notes !== undefined && { notes: updates.notes }),
      updated_at: new Date().toISOString()
    };

    // Check if amount is being updated
    const amountChanged = updates.amount !== undefined && updates.amount !== existingTrans.amount;
    
    try {
      // Begin transaction if amount is being updated
      if (amountChanged) {
        await supabaseAny.rpc('begin_transaction');
      }

      // Update the transaction
      const result = await supabase
        .from('transactions')
        .update(updateData)
        .eq('transaction_id', transactionId)
        .select(`
          *,
          accounts (name),
          categories (category_name, category_type)
        `)
        .single() as unknown as {
          data: TransactionWithRelations | null;
          error: Error | null;
        };
      
      const { data, error } = result;

      if (error) {
        console.error("Error updating transaction:", error);
        throw error;
      }

      if (!data) {
        throw new Error("Transaction update did not return expected data");
      }

      // If amount changed, update account balance as well
      if (amountChanged && updates.amount !== undefined) {
        // Get account details
        const { data: accountData, error: accountError } = await supabase
          .from('accounts')
          .select('balance')
          .eq('account_id', existingTrans.account_id)
          .single() as unknown as {
            data: { balance: number } | null;
            error: Error | null;
          };

        if (accountError) {
          throw accountError;
        }

        // Calculate balance difference
        const oldAmount = existingTrans.type === 'expense' 
          ? -existingTrans.amount 
          : existingTrans.amount;
          
        const newAmount = existingTrans.type === 'expense' 
          ? -updates.amount 
          : updates.amount;
          
        const balanceDifference = newAmount - oldAmount;

        // Update account balance
        const newBalance = (accountData?.balance || 0) + balanceDifference;
        
        const { error: updateBalanceError } = await supabase
          .from('accounts')
          .update({ 
            balance: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('account_id', existingTrans.account_id);

        if (updateBalanceError) {
          throw updateBalanceError;
        }
      }

      // Commit transaction if we started one
      if (amountChanged) {
        await supabaseAny.rpc('commit_transaction');
      }

      return mapSupabaseDataToTransaction(data);
    } catch (error) {
      // Rollback transaction on any error if we started one
      if (amountChanged) {
        await supabaseAny.rpc('rollback_transaction');
      }
      throw error;
    }
  } catch (error) {
    console.error("Error in updateTransaction:", error);
    throw error;
  }
};

/**
 * Creates a transfer transaction between two accounts
 */
export const createTransferTransaction = async (
  sourceAccountId: string,
  destinationAccountId: string,
  amount: number,
  date: string,
  description?: string,
  notes?: string
): Promise<{ sourceTransaction: Transaction; destinationTransaction: Transaction }> => {
  try {
    const userId = await getUserId();

    // Validate inputs
    if (!sourceAccountId) throw new Error("Source account ID is required");
    if (!destinationAccountId) throw new Error("Destination account ID is required");
    if (sourceAccountId === destinationAccountId) 
      throw new Error("Source and destination accounts must be different");
    if (!amount || amount <= 0) throw new Error("Transfer amount must be greater than zero");

    console.log('Calling create_transfer RPC function with params:', {
      source_account_id: sourceAccountId,
      destination_account_id: destinationAccountId,
      amount,
      date_str: date,
      description,
      notes
    });

    // Use a more direct type assertion to fix TypeScript error
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc('create_transfer', {
      source_account_id: sourceAccountId,
      destination_account_id: destinationAccountId,
      amount,
      date_str: date,
      description,
      notes
    });

    if (error) {
      console.error("Error in create_transfer RPC:", error);
      throw new Error(`Transfer failed: ${error.message}`);
    }

    if (!data) {
      throw new Error("Transfer completed but returned no data");
    }

    console.log('Transfer completed successfully:', data);

    // Fetch the created transactions to return them
    const sourceTransactionId = data.source_transaction_id;
    const destTransactionId = data.destination_transaction_id;

    // Fetch source transaction
    const { data: sourceTransData, error: sourceError } = await supabase
      .from('transactions')
      .select(`
        *,
        accounts (name),
        categories (category_name, category_type)
      `)
      .eq('transaction_id', sourceTransactionId)
      .single();

    if (sourceError) {
      console.error("Error fetching source transaction:", sourceError);
      throw new Error(`Transfer completed but could not fetch source transaction: ${sourceError.message}`);
    }

    // Fetch destination transaction
    const { data: destTransData, error: destError } = await supabase
      .from('transactions')
      .select(`
        *,
        accounts (name),
        categories (category_name, category_type)
      `)
      .eq('transaction_id', destTransactionId)
      .single();

    if (destError) {
      console.error("Error fetching destination transaction:", destError);
      throw new Error(`Transfer completed but could not fetch destination transaction: ${destError.message}`);
    }

    return {
      sourceTransaction: mapSupabaseDataToTransaction(sourceTransData),
      destinationTransaction: mapSupabaseDataToTransaction(destTransData)
    };
  } catch (error) {
    console.error("Error in createTransferTransaction:", error);
    throw error;
  }
};

