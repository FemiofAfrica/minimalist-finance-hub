import { useEffect, useState } from "react";
import { type User } from "@supabase/auth-helpers-remix";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import StatCardsSection from "@/components/dashboard/StatCardsSection";
import TransactionsSection from "@/components/dashboard/TransactionsSection";
import ChartsSection from "@/components/dashboard/ChartsSection";
import { fetchDashboardAnalytics, DashboardAnalytics } from "@/services/dashboardService";
import { Transaction } from "@/types/transaction";

interface IndexPageProps {
  user: User | null;
  initialTransactionsData: {
    transactions: Transaction[];
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
  } | null;
}

const Index = ({ user, initialTransactionsData }: IndexPageProps) => {
  const [dashboardData, setDashboardData] = useState<DashboardAnalytics>({
    totalBalance: 0,
    totalIncome: 0,
    totalExpense: 0,
    monthlyTransactionCount: 0,
    incomeChange: 0,
    expenseChange: 0,
    balanceChange: 0
  });
  const [isLoading, setIsLoading] = useState(!user);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactionsData?.transactions || []);

  const fetchDashboardData = async () => {
    if (!user?.id) {
      console.error("User ID not available, cannot fetch dashboard data.");
      setDashboardData({
        totalBalance: 0,
        totalIncome: 0,
        totalExpense: 0,
        monthlyTransactionCount: 0,
        incomeChange: 0,
        expenseChange: 0,
        balanceChange: 0
      });
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const analytics = await fetchDashboardAnalytics(user.id);
      setDashboardData(analytics);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setDashboardData({
        totalBalance: 0,
        totalIncome: 0,
        totalExpense: 0,
        monthlyTransactionCount: 0,
        incomeChange: 0,
        expenseChange: 0,
        balanceChange: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      setTransactions(initialTransactionsData?.transactions || []);
      
      const handleRefresh = () => {
        fetchDashboardData();
      };
      
      document.addEventListener('refresh', handleRefresh);
      document.addEventListener('refresh-transactions', handleRefresh);
      
      return () => {
        document.removeEventListener('refresh', handleRefresh);
        document.removeEventListener('refresh-transactions', handleRefresh);
      };
    } else {
      setDashboardData({
        totalBalance: 0,
        totalIncome: 0,
        totalExpense: 0,
        monthlyTransactionCount: 0,
        incomeChange: 0,
        expenseChange: 0,
        balanceChange: 0
      });
      setTransactions([]);
      setIsLoading(false);
    }
  }, [user, initialTransactionsData]);

  // Extract firstName and userId
  const firstName = user?.user_metadata?.first_name || null;
  const userId = user?.id;

  return (
    <DashboardLayout firstName={firstName}>
      <div className="flex flex-col gap-8 pb-8">
        <StatCardsSection 
          totalBalance={dashboardData.totalBalance} 
          totalIncome={dashboardData.totalIncome} 
          totalExpense={dashboardData.totalExpense}
          monthlyTransactionCount={dashboardData.monthlyTransactionCount}
          balanceChange={dashboardData.balanceChange}
          incomeChange={dashboardData.incomeChange}
          expenseChange={dashboardData.expenseChange}
          isLoading={isLoading}
        />
        <div className="flex flex-col gap-8">
          <div className="w-full">
            {userId ? (
                <TransactionsSection 
                    initialTransactions={transactions}
                    userId={userId}
                />
            ) : (
                <div>Loading transactions...</div>
            )}
          </div>
          <div className="w-full min-h-[500px]">
            {userId ? (
                <ChartsSection userId={userId} />
            ) : (
                <div>Loading chart data...</div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
