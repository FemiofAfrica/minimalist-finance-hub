
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const transactions = [
  {
    id: 1,
    name: "Netflix Subscription",
    amount: -14.99,
    type: "expense",
    category: "Entertainment",
    date: "2024-02-20",
  },
  {
    id: 2,
    name: "Salary Deposit",
    amount: 5000.00,
    type: "income",
    category: "Salary",
    date: "2024-02-19",
  },
  {
    id: 3,
    name: "Grocery Shopping",
    amount: -89.47,
    type: "expense",
    category: "Food",
    date: "2024-02-18",
  },
  {
    id: 4,
    name: "Freelance Payment",
    amount: 750.00,
    type: "income",
    category: "Freelance",
    date: "2024-02-17",
  },
];

const TransactionsTable = () => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Transaction</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((transaction) => (
          <TableRow key={transaction.id} className="group">
            <TableCell className="font-medium">
              <div className="flex items-center space-x-2">
                {transaction.type === "expense" ? (
                  <ArrowDownRight className="w-4 h-4 text-red-500" />
                ) : (
                  <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                )}
                <span>{transaction.name}</span>
              </div>
            </TableCell>
            <TableCell>{transaction.category}</TableCell>
            <TableCell>{transaction.date}</TableCell>
            <TableCell className="text-right">
              <span
                className={
                  transaction.type === "expense"
                    ? "text-red-500"
                    : "text-emerald-500"
                }
              >
                {transaction.type === "expense" ? "-" : "+"}$
                {Math.abs(transaction.amount).toFixed(2)}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default TransactionsTable;
