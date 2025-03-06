
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";

const TransactionTableHeader = () => {
  return (
    <TableHeader className="bg-muted/50">
      <TableRow className="hover:bg-muted/70">
        <TableHead className="w-[30%] font-semibold text-foreground">Transaction</TableHead>
        <TableHead className="w-[20%] font-semibold text-foreground">Category</TableHead>
        <TableHead className="w-[20%] font-semibold text-foreground">Date</TableHead>
        <TableHead className="w-[20%] font-semibold text-foreground">Amount</TableHead>
        <TableHead className="w-[10%] font-semibold text-foreground">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
};

export default TransactionTableHeader;
