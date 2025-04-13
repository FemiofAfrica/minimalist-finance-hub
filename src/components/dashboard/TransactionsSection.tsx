
import { Card } from "@/components/ui/card";
import TransactionsTable from "@/components/TransactionsTable";
import { useNavigate } from "react-router-dom";
import TransactionInput from "@/components/dashboard/TransactionInput";
import { Transaction } from "@/types/transaction";

interface TransactionsSectionProps {
  userId: string;
  initialTransactions?: Transaction[];
  onTransactionAdded?: (transaction: Transaction) => void;
}

const TransactionsSection = ({ userId, initialTransactions = [], onTransactionAdded }: TransactionsSectionProps) => {
  const navigate = useNavigate();
  
  return (
    <Card className="p-6 h-full min-h-[600px] flex flex-col">
      <TransactionInput onTransactionAdded={onTransactionAdded} />
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Recent Transactions</h3>
        <button 
          className="text-sm text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
          onClick={() => navigate('/transactions')}
        >
          View All Transactions
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <TransactionsTable initialTransactions={initialTransactions.slice(0, 10)} />
      </div>
    </Card>
  );
};

export default TransactionsSection;
