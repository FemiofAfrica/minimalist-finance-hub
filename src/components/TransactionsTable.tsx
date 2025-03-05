
import { useEffect, useState } from "react";
import { Table, TableBody } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Transaction } from "@/types/transaction";
import TransactionRow from "@/components/transactions/TransactionRow";
import TransactionTableHeader from "@/components/transactions/TransactionTableHeader";
import TransactionEmptyState from "@/components/transactions/TransactionEmptyState";
import TransactionLoading from "@/components/transactions/TransactionLoading";
import { fetchTransactions } from "@/services/transactionService";

const TransactionsTable = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadTransactions = async () => {
    try {
      console.log("Fetching transactions...");
      const data = await fetchTransactions();
      setTransactions(data);
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
    loadTransactions();
    
    // Set up event listener for the custom refresh event
    const handleRefresh = () => {
      console.log("Refresh event triggered in TransactionsTable");
      loadTransactions();
    };

    document.addEventListener('refresh', handleRefresh);
    
    // Clean up the event listener when component unmounts
    return () => {
      document.removeEventListener('refresh', handleRefresh);
    };
  }, []);

  const handleTransactionUpdate = () => {
    loadTransactions();
  };

  if (loading) {
    return <TransactionLoading />;
  }

  if (transactions.length === 0) {
    return <TransactionEmptyState />;
  }

  return (
    <Table>
      <TransactionTableHeader />
      <TableBody>
        {transactions.map((transaction) => (
          <TransactionRow 
            key={transaction.transaction_id} 
            transaction={transaction} 
            onTransactionUpdate={handleTransactionUpdate}
          />
        ))}
      </TableBody>
    </Table>
  );
};

export default TransactionsTable;
