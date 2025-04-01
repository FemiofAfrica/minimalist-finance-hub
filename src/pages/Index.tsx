
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import StatCardsSection from "@/components/dashboard/StatCardsSection";
import TransactionsSection from "@/components/dashboard/TransactionsSection";
import ChartsSection from "@/components/dashboard/ChartsSection";
import { fetchDashboardAnalytics, DashboardAnalytics } from "@/services/dashboardService";

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

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const analytics = await fetchDashboardAnalytics();
      setDashboardData(analytics);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Set up event listeners for transaction updates
    const handleRefresh = () => {
      fetchDashboardData();
    };
    
    // Listen for both refresh and refresh-transactions events
    document.addEventListener('refresh', handleRefresh);
    document.addEventListener('refresh-transactions', handleRefresh);
    
    return () => {
      document.removeEventListener('refresh', handleRefresh);
      document.removeEventListener('refresh-transactions', handleRefresh);
    };
  }, []);

  const handleTransactionAdded = () => {
    fetchDashboardData();
    
    // Dispatch refresh event for other components
    const refreshEvent = new Event('refresh');
    document.dispatchEvent(refreshEvent);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8 pb-8">
        <DashboardHeader userEmail={user?.email} />
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
            <TransactionsSection onTransactionAdded={handleTransactionAdded} />
          </div>
          <div className="w-full min-h-[500px]">
            <ChartsSection />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
