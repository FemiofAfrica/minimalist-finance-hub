/**
 * Example of migrating a page component from Remix to Vite SPA
 * This shows how to convert from Remix's useLoaderData to standard React hooks with API calls
 */

import { useEffect, useState } from "react";
import axios from "axios"; // Added axios for API calls
import { User } from "../contexts/AuthContextTypes";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatCardsSection from "@/components/dashboard/StatCardsSection";
import TransactionsSection from "@/components/dashboard/TransactionsSection";
import ChartsSection from "@/components/dashboard/ChartsSection";
import { DashboardAnalytics } from "@/services/dashboardService";
import { Transaction } from "@/types/transaction";
import { useAuth } from "@/contexts/useAuth"; // Added to get user from context

// No longer need IndexPageProps as we'll get user from context
const Index = () => {
  // Get user from auth context instead of props
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

  // Fetch dashboard data from API
  useEffect(() => {
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
        
        // Fetch dashboard analytics from API
        const response = await axios.get('/api/dashboard-analytics', {
          params: { userId: user.id }
        });
        
        setDashboardData(response.data);
        
        // Fetch initial transactions
        const transactionsResponse = await axios.get('/api/transactions', {
          params: { userId: user.id, limit: 10 }
        });
        
        setTransactions(transactionsResponse.data.transactions || []);
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
  }, [user]); // Only depend on user

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