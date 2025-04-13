import { Card } from "@/components/ui/card";
import ChatInput from "@/components/ChatInput";
import AddTransactionDialog from "@/components/AddTransactionDialog";
import { Transaction } from "@/types/transaction";

interface TransactionInputProps {
  onTransactionAdded?: (transaction: Transaction) => void;
}

const TransactionInput = ({ onTransactionAdded }: TransactionInputProps) => {
  return (
    <Card className="p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Add Transaction</h3>
        <AddTransactionDialog onTransactionAdded={onTransactionAdded} />
      </div>
      <ChatInput onTransactionAdded={onTransactionAdded} />
    </Card>
  );
};

export default TransactionInput;