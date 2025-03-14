
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
    <Card className="p-6 h-full min-h-[600px] flex flex-col border border-emerald-100 dark:border-neutral-700 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Recent Transactions</h3>
        <button 
          className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium"
          onClick={() => navigate('/transactions')}
        >
          View All
        </button>
      </div>
      <ChatInput onTransactionAdded={onTransactionAdded} />
      <div className="mt-6 flex-1 overflow-auto">
        <TransactionsTable limit={10} />
      </div>
    </Card>
  );
};

export default TransactionsSection;
