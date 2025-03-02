
import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Define the Transaction types
type TransactionType = "EXPENSE" | "INCOME";

interface Transaction {
  transaction_id: string;
  description: string;
  amount: number;
  category_type: string;
  category_id?: string | null;
  category_name?: string | null;  // Added for joining with categories table
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

const TransactionsTable = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTransactions = async () => {
    try {
      console.log("Fetching transactions...");
      
      // Step 1: Fetch all transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (transactionsError) {
        console.error('Error fetching transactions:', transactionsError);
        throw transactionsError;
      }

      console.log("Transactions data from Supabase:", transactionsData);

      if (!transactionsData || transactionsData.length === 0) {
        console.log("No transactions found in database");
        setTransactions([]);
        setLoading(false);
        return;
      }

      // Step 2: Extract all category IDs and fetch categories in a separate query
      const categoryIds = transactionsData
        .map(transaction => transaction.category_id)
        .filter(id => id !== null && id !== undefined);
      
      let categoriesMap = new Map();
      
      if (categoryIds.length > 0) {
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*')
          .in('category_id', categoryIds);
        
        if (categoriesError) {
          console.error('Error fetching categories:', categoriesError);
        } else if (categoriesData) {
          // Create a map of category_id to category object for faster lookups
          categoriesData.forEach(category => {
            categoriesMap.set(category.category_id, category);
          });
        }
      }

      // Step 3: Combine transaction data with category data
      const enrichedTransactions = transactionsData.map(transaction => {
        const category = transaction.category_id ? categoriesMap.get(transaction.category_id) : null;
        
        return {
          ...transaction,
          category_name: category ? category.category_name : 'Uncategorized'
        } as Transaction;
      });
      
      console.log("Processed transactions:", enrichedTransactions);
      setTransactions(enrichedTransactions);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch transactions",
        variant: "destructive",
      });
      console.error('Error in fetchTransactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    
    // Set up event listener for the custom refresh event
    const handleRefresh = () => {
      console.log("Refresh event triggered in TransactionsTable");
      fetchTransactions();
    };

    document.addEventListener('refresh', handleRefresh);
    
    // Clean up the event listener when component unmounts
    return () => {
      document.removeEventListener('refresh', handleRefresh);
    };
  }, []);

  if (loading) {
    return <div className="text-center py-4">Loading transactions...</div>;
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        No transactions found. Add your first transaction to get started!
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Transaction</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((transaction) => (
          <TableRow key={transaction.transaction_id}>
            <TableCell className="font-medium">
              <div className="flex items-center space-x-2">
                {transaction.category_type === "EXPENSE" ? (
                  <ArrowDownRight className="w-4 h-4 text-red-500" />
                ) : (
                  <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                )}
                <span>{transaction.description}</span>
              </div>
            </TableCell>
            <TableCell>{transaction.category_name || 'Uncategorized'}</TableCell>
            <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
            <TableCell className="text-right">
              <span
                className={
                  transaction.category_type === "EXPENSE"
                    ? "text-red-500"
                    : "text-emerald-500"
                }
              >
                {transaction.category_type === "EXPENSE" ? "-" : "+"}
                {formatNaira(transaction.amount)}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default TransactionsTable;
