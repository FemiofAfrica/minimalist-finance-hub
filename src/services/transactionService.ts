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


// Helper function to get user ID safely
async function getUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("User not authenticated.");
  }
  return userId;
}

// --- Helper Function to Map Supabase Data to Application Type ---
function mapSupabaseDataToTransaction(dbData: any): Transaction {
    if (!dbData || typeof dbData !== 'object') {
        console.error("Invalid data received for mapping:", dbData);
        throw new Error("Invalid data structure received from database query.");
    }
    const accountsData = dbData.accounts;
    const categoriesData = dbData.categories;
    const categoryName = categoriesData?.category_name ?? 'Uncategorized';
    const categoryType = categoriesData?.category_type?.toUpperCase() as Transaction['category_type'] ?? (dbData.type === 'income' ? 'INCOME' : 'EXPENSE');
    const accountName = accountsData?.name ?? null;
    const amount = typeof dbData.amount === 'number' ? dbData.amount : parseFloat(String(dbData.amount ?? 0));

    return {
        transaction_id: dbData.transaction_id,
        user_id: dbData.user_id,
        account_id: dbData.account_id,
        category_id: dbData.category_id,
        description: dbData.description ?? '',
        amount: isNaN(amount) ? 0 : amount,
        currency: dbData.currency,
        date: dbData.date,
        type: dbData.type as 'income' | 'expense' | 'transfer',
        notes: dbData.notes,
        created_at: dbData.created_at,
        updated_at: dbData.updated_at,
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
      .order('date', { ascending: false });

    // Apply limit if specified
    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

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

    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        accounts (name),
        categories (category_name, category_type)
      `)
      .eq('user_id', userId)
      .eq('account_id', accountId)
      .order('date', { ascending: false });

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

    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        accounts (name),
        categories (category_name, category_type)
      `)
      .eq('user_id', userId)
      .eq('card_id', cardId)
      .order('date', { ascending: false });

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
        // Use category_type directly from input, ensure it's INCOME or EXPENSE
        const categoryTypeUpper = (transaction.category_type ?? 'EXPENSE').toUpperCase() as 'INCOME' | 'EXPENSE';
        
        const { data: existingCategory, error: findCatError } = await supabase
            .from('categories')
            .select('category_id')
            .eq('category_name', transaction.category_name) // <<< Use category_name
            .eq('user_id', userId)
            .eq('category_type', categoryTypeUpper) // <<< Use category_type
            .maybeSingle();

        if (findCatError) {
            console.error("Error finding category:", findCatError);
            throw findCatError; // Rethrow
        }

        if (existingCategory) {
            categoryId = existingCategory.category_id;
        } else {
            // Create category using category_name and category_type
            console.log(`Creating category: ${transaction.category_name} (${categoryTypeUpper})`);
            const { data: newCategory, error: insertCatError } = await supabase
                .from('categories')
                .insert({ 
                    category_name: transaction.category_name, // <<< Use category_name
                    user_id: userId, 
                    category_type: categoryTypeUpper // <<< Use category_type
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


    // --- Prepare Data for DB Insertion (Build Object Conditionally) ---
    // Use the generated TransactionInsert type for safety
    const transactionDataToInsert: TransactionInsert = {
        // Required fields (ensure these have valid values)
        user_id: userId,
        account_id: transaction.account_id, // Already checked for null/undefined
        amount: transaction.amount, // Already checked for null/undefined
        currency: determinedCurrency, // Ensured non-null above
        type: (transaction.type ?? 'expense').toLowerCase() as 'income' | 'expense' | 'transfer', // Default applied
        date: transaction.date ?? new Date().toISOString().split('T')[0], // Default applied

        // Optional fields (only add if they have a value)
        ...(categoryId !== undefined && { category_id: categoryId }),
        ...(transaction.description && { description: transaction.description }),
        ...(transaction.notes && { notes: transaction.notes }),
        // ...(transaction.card_id && { card_id: transaction.card_id }), // Example for other optional fields
    };

    // ** REMOVED the loop that deletes undefined keys **

    console.log("Inserting transaction data:", transactionDataToInsert);

    // --- Insert Transaction ---
    const { data, error } = await supabase
      .from('transactions')
      .insert(transactionDataToInsert) // Pass the correctly typed and structured object
      .select(`
          *,
          accounts ( name ),
          categories ( category_name, category_type )
      `)
      .single();

    if (error) {
      console.error('Error creating transaction:', error);
      // Log the data that was attempted to be inserted for debugging
      console.error('Data attempted:', transactionDataToInsert);
      throw error;
    }

    // Map the result to the application's Transaction type
    return mapSupabaseDataToTransaction(data as any); // Use 'as any' for mapper flexibility

  } catch (error) {
    console.error("Error in createTransaction:", error);
    throw error;
  }
};


// --- updateTransaction ---
// [ Keep updateTransaction function from previous version here ]
export const updateTransaction = async ( /* ... */ ): Promise<Transaction> => { /* ... */ };

