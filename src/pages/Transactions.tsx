import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import TransactionsTable from "@/components/TransactionsTable";
import { ArrowDownRight, ArrowUpRight, Calendar, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PageLayout from "@/components/dashboard/PageLayout";

// Define the Transaction interface
interface Transaction {
  transaction_id: string;
  description: string;
  amount: number;
  category_type: string; // Changed from type to category_type
  category_id?: string | null;
  date: string;
  created_at?: string;
  updated_at?: string;
  notes?: string | null;
  source?: string | null;
  user_id?: string | null;
}

// Format number to Nigerian Naira
const formatNaira = (amount: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(amount);
};

const Transactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchTransactionsAndCalculateTotals = async () => {
      try {
        console.log("Fetching transactions for calculations...");
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .order('date', { ascending: false });

        if (error) {
          console.error('Error fetching transactions:', error);
          throw error;
        }

        console.log("Transactions data for calculations:", data);

        if (!data || data.length === 0) {
          console.log("No transactions found for calculations");
          setTransactions([]);
          setTotalIncome(0);
          setTotalExpense(0);
          setLoading(false);
          return;
        }

        // Cast the data as Transaction[]
        const typedTransactions = data as Transaction[];
        
        // Set the transactions state
        setTransactions(typedTransactions);

        // Calculate totals
        let incomeTotal = 0;
        let expenseTotal = 0;

        typedTransactions.forEach((transaction) => {
          if (transaction.category_type === "INCOME") {
            incomeTotal += Number(transaction.amount);
          } else if (transaction.category_type === "EXPENSE") {
            expenseTotal += Number(transaction.amount);
          }
        });

        console.log("Calculated totals:", { incomeTotal, expenseTotal });
        setTotalIncome(incomeTotal);
        setTotalExpense(expenseTotal);
      } catch (error) {
        console.error('Error fetching transactions:', error);
        toast({
          title: "Error",
          description: "Failed to fetch transactions",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTransactionsAndCalculateTotals();
    
    // Set up refresh event listener
    const handleRefresh = () => {
      console.log("Refresh event triggered in Transactions page");
      fetchTransactionsAndCalculateTotals();
    };

    document.addEventListener('refresh', handleRefresh);
    return () => {
      document.removeEventListener('refresh', handleRefresh);
    };
  }, [toast]);

  const recentTransactions = transactions.slice(0, 5);
  
  return (
    <PageLayout>
      <div className="flex flex-col gap-4 mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">Transactions</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">Manage and review all your financial transactions.</p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-3 mb-10">
        <Card className="border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-700 dark:text-slate-300">Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatNaira(totalIncome)}</div>
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-700 dark:text-slate-300">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatNaira(totalExpense)}</div>
              <div className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
                <ArrowDownRight className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-700 dark:text-slate-300">Net Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatNaira(totalIncome - totalExpense)}</div>
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="mb-10">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white mb-6">All Transactions</h2>
        <TransactionsTable />
      </div>
    </PageLayout>
  );
};

export default Transactions;
