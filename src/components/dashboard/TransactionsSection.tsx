
import { Card } from "@/components/ui/card";
import ChatInput from "@/components/ChatInput";
import TransactionsTable from "@/components/TransactionsTable";
import { useNavigate } from "react-router-dom";

interface TransactionsSectionProps {
  onTransactionAdded: () => void;
}

const TransactionsSection = ({ onTransactionAdded }: TransactionsSectionProps) => {
  const navigate = useNavigate();
  
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Recent Transactions</h3>
        <button 
          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          onClick={() => navigate('/transactions')}
        >
          View All
        </button>
      </div>
      <ChatInput onTransactionAdded={onTransactionAdded} />
      <div className="mt-6">
        <TransactionsTable />
      </div>
    </Card>
  );
};

export default TransactionsSection;
