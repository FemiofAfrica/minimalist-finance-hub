
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const TransactionEmptyState = () => {
  // Function to trigger the add transaction dialog
  const handleAddTransaction = () => {
    // Dispatch a custom event that can be listened for in the parent component
    const addTransactionEvent = new CustomEvent('add-transaction');
    document.dispatchEvent(addTransactionEvent);
  };

  return (
    <div className="text-center py-8 space-y-4">
      <div className="flex justify-center">
        <div className="bg-muted/50 p-4 rounded-full">
          <PlusCircle className="h-10 w-10 text-muted-foreground" />
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-medium">No transactions found</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          There are no transactions matching your current filters. Try adjusting your date range or category filters, or add a new transaction to get started.
        </p>
      </div>
      <Button onClick={handleAddTransaction} className="mt-4">
        Add Transaction
      </Button>
    </div>
  );
};

export default TransactionEmptyState;
