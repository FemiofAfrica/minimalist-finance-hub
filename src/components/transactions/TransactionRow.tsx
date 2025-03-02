
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Transaction } from "@/types/transaction";
import { formatNaira } from "@/utils/formatters";

interface TransactionRowProps {
  transaction: Transaction;
}

const TransactionRow = ({ transaction }: TransactionRowProps) => {
  return (
    <TableRow key={transaction.transaction_id}>
      <TableCell className="font-medium">
        <div className="flex items-center space-x-2">
          {transaction.category_type === "EXPENSE" ? (
            <ArrowDownRight className="w-4 h-4 text-red-500" />
          ) : (
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
          )}
          <span>{transaction.description}</span>
        </div>
      </TableCell>
      <TableCell>{transaction.category_name || 'Uncategorized'}</TableCell>
      <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
      <TableCell className="text-right">
        <span
          className={
            transaction.category_type === "EXPENSE"
              ? "text-red-500"
              : "text-emerald-500"
          }
        >
          {transaction.category_type === "EXPENSE" ? "-" : "+"}
          {formatNaira(transaction.amount)}
        </span>
      </TableCell>
    </TableRow>
  );
};

export default TransactionRow;
