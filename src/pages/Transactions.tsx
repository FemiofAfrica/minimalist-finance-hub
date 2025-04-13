import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PaginatedTransactionsTable from "@/components/transactions/PaginatedTransactionsTable";
import { ArrowDownRight, ArrowUpRight, DollarSign } from "lucide-react";
import { Transaction } from "@/types/transaction";
import { formatCurrency } from "@/lib/utils";
import { fetchTransactions } from "@/services/transactionService.axios";
import { useAuth } from "@/contexts";
import { Skeleton } from "@/components/ui/skeleton";

const TransactionsPage = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [netBalance, setNetBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadTransactions = async () => {
      if (!user?.id) {
        console.error("User ID not available, cannot fetch transactions.");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const data = await fetchTransactions(user.id);
        setTransactions(data.transactions);
        setTotalIncome(data.totalIncome);
        setTotalExpenses(data.totalExpenses);
        setNetBalance(data.netBalance);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTransactions();

    // Set up event listener for transaction updates
    const handleRefresh = () => {
      loadTransactions();
    };

    document.addEventListener('refresh', handleRefresh);
    document.addEventListener('refresh-transactions', handleRefresh);

    return () => {
      document.removeEventListener('refresh', handleRefresh);
      document.removeEventListener('refresh-transactions', handleRefresh);
    };
  }, [user]);

  return (
    <div className="flex flex-col gap-8">
      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="flex items-center">
                <ArrowUpRight className="w-5 h-5 mr-2 text-emerald-500" />
                <div className="text-2xl font-bold">{formatCurrency(totalIncome)}</div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="flex items-center">
                <ArrowDownRight className="w-5 h-5 mr-2 text-red-500" />
                <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Balance</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-primary" />
                <div className="text-2xl font-bold">{formatCurrency(netBalance)}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Transactions Table Section */}
      <div> 
        <h2 className="text-xl font-bold mb-4">All Transactions</h2>
        {user?.id && (
          <PaginatedTransactionsTable 
            userId={user.id} 
            initialTransactions={transactions} 
          />
        )}
      </div>
    </div>
  );
};

export default TransactionsPage;
