
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import TransactionsTable from "@/components/TransactionsTable";
import { ArrowDownRight, ArrowUpRight, Calendar, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardSidebar from "@/components/DashboardSidebar";

// Define the Transaction types
type TransactionType = "EXPENSE" | "INCOME";

interface Transaction {
  transaction_id: string;
  description: string;
  amount: number;
  type: TransactionType;
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

        // Process the data to ensure proper typing
        const typedTransactions: Transaction[] = data.map(transaction => ({
          ...transaction,
          // Ensure type is either "EXPENSE" or "INCOME"
          type: (transaction.type === "EXPENSE" || transaction.type === "INCOME") 
            ? transaction.type as TransactionType 
            : "EXPENSE"
        }));

        // Set the transactions state
        setTransactions(typedTransactions);

        // Calculate totals
        let incomeTotal = 0;
        let expenseTotal = 0;

        typedTransactions.forEach((transaction) => {
          if (transaction.type === "INCOME") {
            incomeTotal += Number(transaction.amount);
          } else if (transaction.type === "EXPENSE") {
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
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Transactions</h1>
          <p className="text-muted-foreground">Manage and review all your financial transactions.</p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <ArrowUpRight className="w-5 h-5 mr-2 text-emerald-500" />
                <div className="text-2xl font-bold">{formatNaira(totalIncome)}</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <ArrowDownRight className="w-5 h-5 mr-2 text-red-500" />
                <div className="text-2xl font-bold">{formatNaira(totalExpense)}</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Net Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-primary" />
                <div className="text-2xl font-bold">{formatNaira(totalIncome - totalExpense)}</div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">Loading transactions...</div>
            ) : recentTransactions.length > 0 ? (
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.transaction_id} className="flex items-center justify-between pb-4 border-b">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                        transaction.type === "EXPENSE" ? "bg-red-100" : "bg-emerald-100"
                      }`}>
                        {transaction.type === "EXPENSE" ? (
                          <ArrowDownRight className="w-4 h-4 text-red-500" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{transaction.description}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(transaction.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <span className={transaction.type === "EXPENSE" ? "text-red-500" : "text-emerald-500"}>
                      {transaction.type === "EXPENSE" ? "-" : "+"}
                      {formatNaira(transaction.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                No recent transactions found.
              </div>
            )}
          </CardContent>
        </Card>
        
        <div>
          <h2 className="text-xl font-bold mb-4">All Transactions</h2>
          <TransactionsTable />
        </div>
      </div>
    </div>
  );
};

export default Transactions;
