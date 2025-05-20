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
  categories: Pick<Database['public']['Tables']['categories']['Row'], 'name' | 'type'> | null;
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
      name?: string; 
      type?: string;
    } | null;
    
    // For transfer transactions, use "Transfer" as the category name instead of "Uncategorized"
    const isTransfer = dbData.type === 'transfer';
    const categoryName = isTransfer ? 'Transfer' : (categoriesData?.name ?? 'Uncategorized');
    
    // Also set the category type appropriately for transfers
    const categoryType = isTransfer 
      ? 'TRANSFER' 
      : (categoriesData?.type?.toUpperCase() as Transaction['category_type'] ?? 
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
        categories (name, type)
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

    // Calculate totals with correct logic
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0);
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
        categories (name, type)
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
        categories (name, type)
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
    if (transaction.amount == null) {
        throw new Error("Amount is required to create a transaction.");
    }
    
    // Prepare transaction data
    const transactionData: any = {
      user_id: userId,
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.type,
      date: transaction.date ? transaction.date.split('T')[0] : undefined, // Ensure YYYY-MM-DD
      account_id: transaction.account_id,
      category_id: transaction.category_id,
      currency: transaction.currency || 'NGN',
      notes: transaction.notes
    };
    // Always include category_name and category_type if present
    if (transaction.category_name) {
      transactionData.category_name = transaction.category_name;
    }
    if (transaction.category_type) {
      transactionData.category_type = transaction.category_type;
    }

    // Create the transaction using Supabase RPC function
    // This ensures account balance is updated atomically with transaction creation
    const { data, error } = await supabaseAny.rpc('create_transaction', {
      transaction_data: transactionData
    });

    if (error) {
      console.error('Error creating transaction:', error);
      throw new Error(`Failed to create transaction: ${error.message}`);
    }

    if (!data || !data.transaction_id) {
      throw new Error('Transaction created but no ID returned');
    }

    // Fetch the newly created transaction with all relations
    const { data: newTransaction, error: fetchError } = await supabase
      .from('transactions')
      .select(`
        *,
        accounts (name),
        categories (name, type)
      `)
      .eq('transaction_id', data.transaction_id)
      .single();

    if (fetchError) {
      console.error('Error fetching new transaction:', fetchError);
      throw new Error(`Transaction created but could not fetch details: ${fetchError.message}`);
    }

    return mapSupabaseDataToTransaction(newTransaction);
  } catch (error) {
    console.error('Error in createTransaction:', error);
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
          categories (name, type)
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

// --- Create transfer transaction (improved version) ---
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
    
    if (!userId) {
      throw new Error("User must be authenticated to create a transfer");
    }
    
    if (!sourceAccountId || !destinationAccountId) {
      throw new Error("Source and destination accounts are required");
    }
    
    if (!amount || amount <= 0) {
      throw new Error("Transfer amount must be greater than zero");
    }
    
    console.log('Calling transfer_funds RPC with params:', {
      p_source_account_id: sourceAccountId,
      p_destination_account_id: destinationAccountId,
      p_amount: amount,
      p_date: date,
      p_description: description || 'Transfer between accounts'
    });
    
    // Use the transfer_funds RPC function to perform the entire transfer in a transaction
    // This ensures atomicity and prevents partial transfers
    // Use explicit type assertion to handle TypeScript limitations with Supabase
    const result = await supabaseAny.rpc('transfer_funds', {
      p_source_account_id: sourceAccountId,
      p_destination_account_id: destinationAccountId,
      p_amount: amount,
      p_date: date,
      p_description: description || 'Transfer between accounts',
      p_notes: notes || null
    });
    
    const { data, error } = result;
    
    if (error) {
      console.error('Error in transfer_funds RPC:', error);
      // Provide a more user-friendly error message
      if (error.message.includes('insufficient_funds')) {
        throw new Error('Insufficient funds in source account');
      }
      throw error;
    }
    
    if (!data) {
      throw new Error('Transfer failed: No data returned from server');
    }
    
    console.log("Transfer completed successfully via RPC");
    
    // The RPC returns the created transaction IDs
    const { source_transaction_id, destination_transaction_id } = data;
    
    // Fetch the created transactions to return them
    const { data: sourceTransData, error: sourceTransError } = await supabase
      .from('transactions')
      .select(`
          *,
        accounts (name),
        categories (name, type)
      `)
      .eq('transaction_id', source_transaction_id)
      .single();

    if (sourceTransError) {
      console.error('Error fetching source transaction:', sourceTransError);
      throw sourceTransError;
    }
    
    const { data: destTransData, error: destTransError } = await supabase
      .from('transactions')
      .select(`
        *,
        accounts (name),
        categories (name, type)
      `)
      .eq('transaction_id', destination_transaction_id)
      .single();
      
    if (destTransError) {
      console.error('Error fetching destination transaction:', destTransError);
      throw destTransError;
    }
    
    return {
      sourceTransaction: mapSupabaseDataToTransaction(sourceTransData),
      destinationTransaction: mapSupabaseDataToTransaction(destTransData)
    };
  } catch (error) {
    console.error('Error in createTransferTransaction:', error);
    throw error;
  }
};

// --- Delete transaction (with account balance update) ---
export const deleteTransaction = async (transactionId: string): Promise<{ success: boolean }> => {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      throw new Error("User must be authenticated to delete a transaction");
    }
    
    if (!transactionId) {
      throw new Error("Transaction ID is required");
    }
    
    // Get the transaction to check if it's a transfer
    const { data: transactionData, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('transaction_id', transactionId)
      .eq('user_id', userId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching transaction details:', fetchError);
      throw fetchError;
    }
    
    if (!transactionData) {
      throw new Error('Transaction not found or does not belong to user');
    }
    
    // Use the delete_transaction RPC to ensure account balance is updated
    const { data, error } = await supabaseAny.rpc('delete_transaction', {
      transaction_id_param: transactionId
    });
    
    if (error) {
      console.error('Error in delete_transaction RPC:', error);
      throw error;
    }
    
    if (!data || !data.success) {
      throw new Error('Failed to delete transaction: ' + (data?.error || 'Unknown error'));
    }
    
    // Dispatch refresh event to update related components
    document.dispatchEvent(new CustomEvent('refresh-transactions'));
    
    return { success: true };
  } catch (error) {
    console.error('Error in deleteTransaction:', error);
    throw error;
  }
};

// --- Delete transfer transactions ---
export const deleteTransferTransactions = async (
  sourceTransactionId: string, 
  destinationTransactionId: string
): Promise<{ success: boolean }> => {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      throw new Error("User must be authenticated to delete transfer transactions");
    }
    
    if (!sourceTransactionId || !destinationTransactionId) {
      throw new Error("Both source and destination transaction IDs are required");
    }
    
    // Use the delete_transfer_transactions RPC to handle both transactions and account updates
    const { data, error } = await supabaseAny.rpc('delete_transfer_transactions', {
      source_transaction_id: sourceTransactionId,
      destination_transaction_id: destinationTransactionId
    });
    
    if (error) {
      console.error('Error in delete_transfer_transactions RPC:', error);
      throw error;
    }
    
    if (!data || !data.success) {
      throw new Error('Failed to delete transfer transactions: ' + (data?.error || 'Unknown error'));
    }
    
    // Dispatch refresh event to update related components
    document.dispatchEvent(new CustomEvent('refresh-transactions'));
    
    return { success: true };
  } catch (error) {
    console.error('Error in deleteTransferTransactions:', error);
    throw error;
  }
};

