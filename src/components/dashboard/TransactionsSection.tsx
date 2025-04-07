import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PaginatedTransactionsTable from "@/components/transactions/PaginatedTransactionsTable";
import { AddTransactionDialog } from "@/components/AddTransactionDialog";
import { Transaction } from "@/types/transaction";
import { Button } from "@/components/ui/button";

interface TransactionsSectionProps {
  initialTransactions: Transaction[];
  userId: string;
}

const TransactionsSection: React.FC<TransactionsSectionProps> = ({ initialTransactions, userId }) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const handleTransactionAdded = () => {
    document.dispatchEvent(new CustomEvent('refresh'));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Transactions</CardTitle>
        <Button onClick={() => setIsAddDialogOpen(true)}>Add Transaction</Button>
      </CardHeader>
      <CardContent>
        <PaginatedTransactionsTable userId={userId} />
      </CardContent>
      <AddTransactionDialog 
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onTransactionAdded={handleTransactionAdded}
      />
    </Card>
  );
};

export default TransactionsSection;
