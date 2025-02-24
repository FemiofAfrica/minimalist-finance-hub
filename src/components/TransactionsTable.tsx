
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

interface Transaction {
  transaction_id: string;
  description: string;
  amount: number;
  type: string;
  category_id: string | null;
  date: string;
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
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      setTransactions(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch transactions",
        variant: "destructive",
      });
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Add event listener for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      fetchTransactions();
    };

    document.addEventListener('refresh', handleRefresh);
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
                {transaction.type === "expense" ? (
                  <ArrowDownRight className="w-4 h-4 text-red-500" />
                ) : (
                  <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                )}
                <span>{transaction.description}</span>
              </div>
            </TableCell>
            <TableCell>{transaction.category_id || 'Uncategorized'}</TableCell>
            <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
            <TableCell className="text-right">
              <span
                className={
                  transaction.type === "expense"
                    ? "text-red-500"
                    : "text-emerald-500"
                }
              >
                {transaction.type === "expense" ? "-" : "+"}
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
