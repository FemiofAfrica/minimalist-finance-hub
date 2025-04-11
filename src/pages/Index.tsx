import { type User } from "@supabase/supabase-js";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatCardsSection from "@/components/dashboard/StatCardsSection";
import TransactionsSection from "@/components/dashboard/TransactionsSection";
import ChartsSection from "@/components/dashboard/ChartsSection";
import { DashboardAnalytics } from "@/types/dashboard";
import { Transaction } from "@/types/transaction";

type UserWithMetadata = User & {
  user_metadata: {
    first_name?: string;
    [key: string]: unknown;
  };
};

interface IndexPageProps {
  user: UserWithMetadata | null;
  initialTransactionsData: {
    transactions: Transaction[];
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
  } | null;
  dashboardData: DashboardAnalytics;
  loading: boolean;
}

const Index = ({ user, initialTransactionsData, dashboardData, loading }: IndexPageProps) => {
  const transactions: Transaction[] = initialTransactionsData?.transactions || [];

  if(loading) return <div>Loading...</div>
/*
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
     
    }
  };
*/

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
          isLoading={loading}
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
