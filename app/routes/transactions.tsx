import { redirect, type LoaderFunctionArgs, json, type TypedResponse } from "@remix-run/node";
import { createServerClient } from "@supabase/auth-helpers-remix";
import TransactionsPage from "@/pages/Transactions";
import { useLoaderData } from "@remix-run/react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { fetchTransactions } from "@/services/transactionService";
import { Transaction } from "@/types/transaction";

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

// Route component renders the actual page
export default function TransactionsRoute() {
  // Use the updated loader data type
  const { user, firstName, initialTransactions } = useLoaderData<typeof loader>();
  const userId = user?.id; // Extract userId from the loader data

  return (
    <DashboardLayout firstName={firstName}>
        {/* Pass initialTransactions and userId down */}
        {userId ? (
            <TransactionsPage 
                initialTransactions={initialTransactions} 
                userId={userId} 
            />
        ) : (
            <div>Loading user data...</div> // Should not happen if loader redirects
        )}
    </DashboardLayout>
  );
} 