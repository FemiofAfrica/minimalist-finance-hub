
import { Loader2 } from "lucide-react";

const TransactionLoading = () => {
  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-4">
      <Loader2 className="h-8 w-8 text-primary animate-spin" />
      <div className="text-lg font-medium text-muted-foreground">
        Loading transactions...
      </div>
    </div>
  );
};

export default TransactionLoading;
