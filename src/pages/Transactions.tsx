import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PaginatedTransactionsTable from "@/components/transactions/PaginatedTransactionsTable";
import { ArrowDownRight, ArrowUpRight, DollarSign } from "lucide-react";
import { Transaction } from "@/types/transaction"; // Keep transaction type if needed elsewhere, maybe remove if only table uses it
import { formatCurrency } from "@/lib/utils"; // Assuming a utility for formatting

// Define props based on loader data
interface TransactionsPageProps {
  userId: string;
  initialTransactions: Transaction[];
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
}

// Remove internal state and useEffect for fetching
// const Transactions = () => { ...
const TransactionsPage: React.FC<TransactionsPageProps> = ({ 
  userId, 
  initialTransactions, 
  totalIncome, 
  totalExpenses, 
  netBalance 
}) => {

  // Remove the redundant DashboardLayout wrapper here
  // return (
  //   <DashboardLayout>
  //     ...
  //   </DashboardLayout>
  // );

  // Directly return the content structure
  return (
    <div className="flex flex-col gap-8">
      {/* Summary Cards using props from loader */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <ArrowUpRight className="w-5 h-5 mr-2 text-emerald-500" />
              {/* Use formatCurrency util or keep formatNaira if specific */}
              <div className="text-2xl font-bold">{formatCurrency(totalIncome)}</div> 
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <ArrowDownRight className="w-5 h-5 mr-2 text-red-500" />
              <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-primary" />
              <div className="text-2xl font-bold">{formatCurrency(netBalance)}</div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Transactions Table Section */}
      <div> 
        <h2 className="text-xl font-bold mb-4">All Transactions</h2>
        {/* Pass userId and initialTransactions to the table */}
        <PaginatedTransactionsTable 
          userId={userId} 
          initialTransactions={initialTransactions} 
        />
      </div>
    </div>
  );
};

export default TransactionsPage;
