import { redirect, type LoaderFunctionArgs, type ActionFunctionArgs, json, type TypedResponse } from "@remix-run/node";
import { createServerClient } from "@supabase/auth-helpers-remix";
import TransactionsPage from "@/pages/Transactions";
import { useLoaderData } from "@remix-run/react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { fetchTransactions } from "@/services/transactionService";
import { Transaction } from "@/types/transaction";
import TransactionInput from "@/components/transactions/TransactionInput";

// Define the type for the loader data
export interface TransactionsLoaderData {
  user: any; // Consider using a more specific User type
  firstName: string | null;
  initialTransactions: Transaction[];
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
}

// Loader function to enforce authentication and load initial transactions
export const loader = async ({ request }: LoaderFunctionArgs): Promise<Response | TypedResponse<TransactionsLoaderData>> => {
  const response = new Response();
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { request, response }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("Redirecting to login, user not found.");
    // Use return redirect instead of throw for type safety with TypedResponse
    return redirect("/login", { headers: response.headers }); 
  }

  try {
    // Fetch initial transactions for the logged-in user (e.g., first 10)
    // Note: fetchTransactions is likely client-side. We need a server-side equivalent or adjust it.
    // For now, let's assume fetchTransactions can run server-side or we have an equivalent.
    // If fetchTransactions *requires* the client Supabase instance, this needs refactoring.
    // We'll pass the user.id directly here.
    const { 
        transactions: initialTransactions, 
        totalIncome, 
        totalExpenses, 
        netBalance 
    } = await fetchTransactions(user.id, 10); // Fetch initial 10, adjust limit as needed

    // Return user, firstName, and initial transactions
    return json({
      user,
      firstName: user.user_metadata?.first_name || null,
      initialTransactions,
      totalIncome,
      totalExpenses,
      netBalance
    }, { headers: response.headers });

  } catch (error) {
    console.error("Error fetching initial transactions in loader:", error);
    // Handle error fetching transactions - return empty data or an error state
    return json({
      user,
      firstName: user.user_metadata?.first_name || null,
      initialTransactions: [],
      totalIncome: 0,
      totalExpenses: 0,
      netBalance: 0,
      error: "Failed to load initial transactions" // Optional error indicator
    }, { headers: response.headers, status: 500 }); // Indicate server error
  }
};

// Action function to handle transaction creation
export const action = async ({ request }: ActionFunctionArgs) => {
  const response = new Response();
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { request, response }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'createTransaction') {
    const text = formData.get('text');
    if (!text) {
      return json({ error: 'Transaction text is required' }, { status: 400 });
    }

    try {
      const { data: parsedData, error: parseError } = await supabase.functions.invoke('parse-transaction-groq', {
        body: { text: text }
      });

      if (parseError || (parsedData && parsedData.error)) {
        return json({
          error: parsedData?.error || parseError?.message || 'Failed to parse transaction'
        }, { status: 400 });
      }

      // Create the transaction in the database
      const { error: insertError } = await supabase
        .from('transactions')
        .insert([
          {
            user_id: user.id,
            ...parsedData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]);

      if (insertError) {
        return json({ error: 'Failed to create transaction' }, { status: 500 });
      }

      return json({ success: true });
    } catch (error) {
      return json({
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }, { status: 500 });
    }
  }

  return json({ error: 'Invalid intent' }, { status: 400 });
};

// Route component renders the actual page
export default function TransactionsRoute() {
  const { user, firstName, initialTransactions, totalIncome, totalExpenses, netBalance } = useLoaderData<typeof loader>();
  const userId = user?.id;

  return (
    <DashboardLayout firstName={firstName}>
      {userId ? (
        <div className="space-y-6">
          <TransactionInput />
          <TransactionsPage
            initialTransactions={initialTransactions}
            userId={userId}
            totalIncome={totalIncome}
            totalExpenses={totalExpenses}
            netBalance={netBalance}
          />
        </div>
      ) : (
        <div>Loading user data...</div>
      )}
    </DashboardLayout>
  );
}