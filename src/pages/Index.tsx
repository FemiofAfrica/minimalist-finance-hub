
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import StatCardsSection from "@/components/dashboard/StatCardsSection";
import TransactionsSection from "@/components/dashboard/TransactionsSection";
import ChartsSection from "@/components/dashboard/ChartsSection";

const Index = () => {
  const { user } = useAuth();
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);

  const fetchTransactionTotals = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*');
      
      if (error) throw error;
      
      let incomeTotal = 0;
      let expenseTotal = 0;
      
      (data || []).forEach(transaction => {
        if (transaction.category_type === "INCOME") {
          incomeTotal += Number(transaction.amount);
        } else if (transaction.category_type === "EXPENSE") {
          expenseTotal += Number(transaction.amount);
        }
      });
      
      setTotalIncome(incomeTotal);
      setTotalExpense(expenseTotal);
      setTotalBalance(incomeTotal - expenseTotal);
    } catch (error) {
      console.error("Error fetching transaction totals:", error);
    }
  };

  useEffect(() => {
    fetchTransactionTotals();
    
    const handleRefresh = () => {
      fetchTransactionTotals();
    };
    
    document.addEventListener('refresh', handleRefresh);
    
    return () => {
      document.removeEventListener('refresh', handleRefresh);
    };
  }, []);

  const handleTransactionAdded = () => {
    fetchTransactionTotals();
    
    const refreshEvent = new Event('refresh');
    document.dispatchEvent(refreshEvent);
  };

  return (
    <DashboardLayout>
      <DashboardHeader userEmail={user?.email} />
      <StatCardsSection 
        totalBalance={totalBalance} 
        totalIncome={totalIncome} 
        totalExpense={totalExpense} 
      />
      <TransactionsSection onTransactionAdded={handleTransactionAdded} />
      <ChartsSection />
    </DashboardLayout>
  );
};

export default Index;
