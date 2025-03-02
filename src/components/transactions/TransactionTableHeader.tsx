
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";

const TransactionTableHeader = () => {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Transaction</TableHead>
        <TableHead>Category</TableHead>
        <TableHead>Date</TableHead>
        <TableHead className="text-right">Amount</TableHead>
      </TableRow>
    </TableHeader>
  );
};

export default TransactionTableHeader;
