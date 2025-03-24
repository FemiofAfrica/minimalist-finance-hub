import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import PaginatedTransactionsTable from "@/components/transactions/PaginatedTransactionsTable";
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
  const [isCalculating, setIsCalculating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;
    const fetchTransactionsAndCalculateTotals = async () => {
      if (isCalculating) return;
      setIsCalculating(true);
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .order('date', { ascending: false });

        if (error) {
          console.error('Error fetching transactions:', error);
          throw error;
        }

        if (!isMounted) return;

        if (!data || data.length === 0) {
          setTransactions([]);
          setTotalIncome(0);
          setTotalExpense(0);
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

        if (isMounted) {
          setTotalIncome(incomeTotal);
          setTotalExpense(expenseTotal);
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
        toast({
          title: "Error",
          description: "Failed to fetch transactions",
          variant: "destructive",
        });
      } finally {
        if (isMounted) {
          setLoading(false);
          setIsCalculating(false);
        }
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
      isMounted = false;
      document.removeEventListener('refresh', handleRefresh);
    };
  }, [toast]);
  
  return (
    <PageLayout>
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
      
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">All Transactions</h2>
        <PaginatedTransactionsTable />
      </div>
    </PageLayout>
  );
};

export default Transactions;
