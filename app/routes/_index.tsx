import { redirect, type LoaderFunctionArgs, json, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { createServerClient, type User } from "@supabase/auth-helpers-remix";
import { fetchTransactions, createTransaction } from "@/services/transactionService"; // Import fetchTransactions and createTransaction
import { TransactionInput } from "@/types/transaction"; // Import TransactionInput type

import IndexPage from "@/pages/Index";

// Loader function runs on the server before rendering
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const response = new Response();
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { request, response }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    // No need to set headers on redirect response
    throw redirect("/login"); 
  }

  // Fetch transactions AFTER getting the user successfully
  let transactionsData = { transactions: [], totalIncome: 0, totalExpenses: 0, netBalance: 0 };
  try {
    // Pass the authenticated user ID
    transactionsData = await fetchTransactions(user.id, 10); // Example: fetch latest 10
  } catch (error) {
    console.error("Error fetching transactions in loader:", error);
    // Handle error appropriately - maybe return empty or show error state
    // For now, return empty data
  }

  // Return user data AND transaction data
  return json({ user, transactionsData }, { headers: response.headers });
};

// Action to handle Transaction Creation
export const action = async ({ request }: ActionFunctionArgs) => {
  const response = new Response();
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { request, response }
  );

  // Get current user ID server-side
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return json({ error: "User not authenticated" }, { status: 401, headers: response.headers });
  }

  const formData = await request.formData();
  const intent = String(formData.get("intent"));

  if (intent === "createTransaction") {
    try {
      // Extract and type-check form data
      const transactionInput: TransactionInput = {
        account_id: String(formData.get("account_id")),
        amount: parseFloat(String(formData.get("amount") || "0")),
        type: formData.get("type") as 'income' | 'expense',
        date: String(formData.get("date")),
        description: String(formData.get("description") || ""),
        category_name: String(formData.get("category_name") || ""), // Use category name
        currency: String(formData.get("currency") || ""), // Include currency if available
        notes: String(formData.get("notes") || "")
        // category_id is handled by createTransaction based on name
      };

      // Basic Validation (add more as needed)
      if (!transactionInput.account_id || !transactionInput.amount || !transactionInput.type || !transactionInput.date) {
         return json({ error: "Missing required transaction fields." }, { status: 400, headers: response.headers });
      }

      // Call the service function WITH the userId
      const newTransaction = await createTransaction(user.id, transactionInput);
      console.log("✅ Transaction created successfully via action:", newTransaction.transaction_id);
      return json({ success: true, transactionId: newTransaction.transaction_id }, { headers: response.headers });

    } catch (error: any) {
      console.error("❌ Error creating transaction via action:", error);
      return json({ error: error.message || "Failed to create transaction." }, { status: 500, headers: response.headers });
    }
  }

  // Handle other intents if needed
  return json({ error: "Invalid intent" }, { status: 400, headers: response.headers });
};

export default function IndexRoute() {
  // Get user and transactions data from the loader
  const { user, transactionsData } = useLoaderData<typeof loader>();

  // Pass the data to the page component
  return <IndexPage user={user} initialTransactionsData={transactionsData} />;
} 