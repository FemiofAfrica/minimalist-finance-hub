import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatCardsSection from "@/components/dashboard/StatCardsSection";
import TransactionsSection from "@/components/dashboard/TransactionsSection";
import ChartsSection from "@/components/dashboard/ChartsSection";
import { fetchDashboardAnalytics, DashboardAnalytics } from "@/services/dashboardService.axios";
import { fetchTransactions } from "@/services/transactionService.axios";
import { Transaction } from "@/types/transaction";
import { useAuth } from "@/contexts";

const Index = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardAnalytics>({
    totalBalance: 0,
    totalIncome: 0,
    totalExpense: 0,
    monthlyTransactionCount: 0,
    incomeChange: 0,
    expenseChange: 0,
    balanceChange: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.id) {
        console.error("User ID not available, cannot fetch dashboard data.");
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        const [analytics, transactionsData] = await Promise.all([
          fetchDashboardAnalytics(user.id),
          fetchTransactions(user.id, 10) // Fetch latest 10 transactions
        ]);
        
        setDashboardData(analytics);
        setTransactions(transactionsData.transactions);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        // Set default values in case of error
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
  
    if (user) {
      fetchDashboardData();
      
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
  }, [user]);

  // Extract firstName and userId
  const firstName = user?.user_metadata?.first_name || 'User';
  const userId = user?.id;
  
  return (
    <DashboardLayout firstName={firstName}>
      <div className="flex flex-col gap-8 pb-8">
        {/* Stats Cards */}
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
        
        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Transactions Section */}
          <TransactionsSection 
            userId={userId || ''} 
            initialTransactions={transactions}
            onTransactionAdded={(newTransaction) => {
              setTransactions(prev => [newTransaction, ...prev]);
              // Trigger a refresh of dashboard data
              document.dispatchEvent(new Event('refresh'));
            }}
          />
          
          {/* Charts Section */}
          {userId && <ChartsSection userId={userId} />}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;