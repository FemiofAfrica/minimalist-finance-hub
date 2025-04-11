import {
  redirect,
  type LoaderFunctionArgs,
  json,
  type ActionFunctionArgs,
} from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Database } from "@/integrations/supabase/database.types";
import { createTransaction } from "@/services/transactionService";
import { TransactionInput } from "@/types/transaction";
import { DashboardAnalytics } from "@/types/dashboard";
import {
  BadRequestError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
} from "@/types/errors";
import IndexPage from "@/pages/Index";
import { retryWithBackoff } from "@/utils/networkUtils";
import { createServerClient } from "@supabase/auth-helpers-remix";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const response = new Response();

  // Define a type for the loader data
  type LoaderData = { user: any; transactionsData: any; dashboardData: DashboardAnalytics; initialTransactionsData: any };
  
  const {
    data: { user },
    error: userError,
  } = await retryWithBackoff(() =>
    createServerClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      { request, response }
    ).auth.getUser()
  );

  if (userError || !user) {
    throw redirect("/login");
  }

  // Function to fetch dashboard analytics
  const fetchDashboardAnalytics = async (request: Request) => {
    try {
      const serverSupabase = createServerClient<Database>(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!,
        { request, response }
      );
      const { data: { session } } = await serverSupabase.auth.getSession();
      if (!session) {
        throw new UnauthorizedError("Session not found");
      }
      const now = new Date();
      const currentMonthStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      ).toISOString();
      const currentMonthEnd = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0
      ).toISOString();
      const previousMonthStart = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1
      ).toISOString();
      const previousMonthEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        0
      ).toISOString();
      const userId = session.user.id;

      // Fetch current month transactions
      const { data: currentMonthData, error: currentMonthError } =
        await retryWithBackoff(() =>
          serverSupabase
            .from("transactions")
            .select(`amount, type`)
            .eq("user_id", userId)
            .gte("date", currentMonthStart)
            .lte("date", currentMonthEnd)
        );

      if (currentMonthError) {
        throw new InternalServerError(currentMonthError.message);
      }

      // Fetch previous month transactions for comparison
      const { data: previousMonthData, error: previousMonthError } =
        await retryWithBackoff(() =>
          serverSupabase
            .from("transactions")
            .select(`amount, type`)
            .eq("user_id", userId)
            .gte("date", previousMonthStart)
            .lte("date", previousMonthEnd)
        );

      if (previousMonthError) {
        throw new InternalServerError(previousMonthError.message);
      }

      //Fetch transactions
      const { data: transactions, error: transactionsError } = await retryWithBackoff(() =>
        serverSupabase
          .from("transactions")
          .select(
            `
            amount,
            category_id,
            categories (category_name),
            created_at,
            currency,
            date,
            description,
            notes,
            transaction_id,
            type
          `
          )
          .eq("user_id", userId) // Use userId from session
          .order("date", { ascending: false })
          .limit(10)
      );

      if (transactionsError) {
                throw new InternalServerError(transactionsError.message);

      }

      // Calculate dashboard analytics
      const dashboardData: DashboardAnalytics = calculateDashboardAnalytics(
        currentMonthData, previousMonthData
      );
      return { dashboardData, transactions };
    } catch (error) {
      console.error("Error in fetchDashboardAnalytics:", error);
      if (error instanceof BadRequestError) {
        return { dashboardData: null, transactions: null, error: { message: error.message, code: 400 } };
      } else if (error instanceof NotFoundError) {
        return {  dashboardData: null, transactions: null, error: { message: error.message, code: 404 } };
      } else if (error instanceof UnauthorizedError) {
        return {  dashboardData: null, transactions: null, error: { message: error.message, code: 401 } };
      }
      return { dashboardData: null, transactions: null, error: { message: "Error fetching dashboard data", code: 500 } };
    } finally {
      // Empty block to remove the warning
    }
  };

  const {
    dashboardData,
    transactions: initialTransactionsData,
    error,
  } = await fetchDashboardAnalytics(request);

  if (error) {
    return json(
      { error: error.message },
      { status: error.code, headers: response.headers }
    );
  }


  return json({ code: 200, user, transactionsData: initialTransactionsData, dashboardData, initialTransactionsData }, { headers: response.headers })
};

function calculateDashboardAnalytics(
  currentMonthData: any[],
  previousMonthData: any[]
): DashboardAnalytics {
  let totalIncome = 0;
  let totalExpense = 0;
  currentMonthData?.forEach((transaction: any) => {
    const amount = Number(transaction.amount);
    if (transaction.type === "income") {
      totalIncome += amount;
    } else if (transaction.type === "expense") {
      totalExpense += Math.abs(amount);
    }
  });
  const totalBalance = totalIncome - totalExpense;
  const monthlyTransactionCount = currentMonthData?.length || 0;

  let previousIncome = 0;
  let previousExpense = 0;
  previousMonthData?.forEach((transaction: any) => {
    const amount = Number(transaction.amount);
    if (transaction.type === "income") {
      previousIncome += amount;
    } else if (transaction.type === "expense") {
      previousExpense += Math.abs(amount);
    }
  });
  const previousBalance = previousIncome - previousExpense;

  const incomeChange =
    previousIncome === 0 ? 100 : ((totalIncome - previousIncome) / previousIncome) * 100;
  const expenseChange =
    previousExpense === 0 ? 100 : ((totalExpense - previousExpense) / previousExpense) * 100;
  const balanceChange =
    previousBalance === 0 ? 100 : ((totalBalance - previousBalance) / Math.abs(previousBalance)) * 100;
  return {
    totalBalance,
    totalIncome,
    totalExpense,
    monthlyTransactionCount,
    incomeChange,
    expenseChange,
    balanceChange,
  };
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
        amount: parseFloat(String(formData.get("amount") ?? "0")),
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
  const { user, transactionsData, dashboardData, initialTransactionsData } =
    useLoaderData<typeof loader>();
  
  // Pass the data to the page component
  return (
    <IndexPage
      user={user}
      initialTransactionsData={initialTransactionsData}
      dashboardData={dashboardData}
    />
  );
}