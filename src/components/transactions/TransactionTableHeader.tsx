
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";

const TransactionTableHeader = () => {
  return (
    <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
      <TableRow className="hover:bg-slate-100 dark:hover:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <TableHead className="w-[30%] font-semibold text-slate-700 dark:text-slate-300 py-4 text-base">
          Transaction
        </TableHead>
        <TableHead className="w-[20%] font-semibold text-slate-700 dark:text-slate-300 py-4 text-base">
          Category
        </TableHead>
        <TableHead className="w-[20%] font-semibold text-slate-700 dark:text-slate-300 py-4 text-base">
          Date
        </TableHead>
        <TableHead className="w-[20%] font-semibold text-slate-700 dark:text-slate-300 py-4 text-base">
          Amount
        </TableHead>
        <TableHead className="w-[10%] font-semibold text-slate-700 dark:text-slate-300 py-4 text-base">
          Actions
        </TableHead>
      </TableRow>
    </TableHeader>
  );
};

export default TransactionTableHeader;
