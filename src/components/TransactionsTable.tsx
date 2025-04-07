import { useEffect, useState } from "react";
import { Table, TableBody } from "@/components/ui/table";
import { Transaction } from "@/types/transaction";
import TransactionRow from "@/components/transactions/TransactionRow";
import TransactionTableHeader from "@/components/transactions/TransactionTableHeader";
import TransactionEmptyState from "@/components/transactions/TransactionEmptyState";
import TransactionLoading from "@/components/transactions/TransactionLoading";

interface TransactionsTableProps {
  initialTransactions: Transaction[];
}

const TransactionsTable = ({ initialTransactions }: TransactionsTableProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions || []);
  const [loading, setLoading] = useState(!initialTransactions);

  useEffect(() => {
    setTransactions(initialTransactions || []);
    setLoading(!initialTransactions);
  }, [initialTransactions]);

  const handleTransactionUpdate = () => {
    console.warn("Transaction update/delete refresh not implemented in Table.");
  };

  if (loading) {
    return <TransactionLoading />;
  }

  if (!Array.isArray(transactions) || transactions.length === 0) {
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
