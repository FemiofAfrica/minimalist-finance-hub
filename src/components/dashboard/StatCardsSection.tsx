
import { Activity, CreditCard, Calendar, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import StatCard from "./StatCard";
import { formatCurrency, useCurrency } from "@/contexts/CurrencyContext";
import { supabase } from "@/integrations/supabase/client";

interface StatCardsSectionProps {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
}

const StatCardsSection = ({ totalBalance, totalIncome, totalExpense }: StatCardsSectionProps) => {
  const [monthlyTransactionCount, setMonthlyTransactionCount] = useState(0);
  const { currentCurrency } = useCurrency();

  const fetchMonthlyTransactionCount = async () => {
    try {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const today = now.toISOString();

      const { count, error } = await supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .gte('date', firstDayOfMonth)
        .lte('date', today);

      if (error) throw error;
      setMonthlyTransactionCount(count || 0);
    } catch (error) {
      console.error('Error fetching monthly transaction count:', error);
    }
  };

  useEffect(() => {
    fetchMonthlyTransactionCount();
    
    const handleRefresh = () => {
      fetchMonthlyTransactionCount();
    };
    
    document.addEventListener('refresh', handleRefresh);
    
    return () => {
      document.removeEventListener('refresh', handleRefresh);
    };
  }, []);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <StatCard
        title="Total Balance"
        value={formatCurrency(totalBalance, currentCurrency)}
        trend={2.5}
        icon={<Wallet className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
        iconBgClass="bg-blue-100 dark:bg-blue-900/20"
        iconTextClass="text-blue-600 dark:text-blue-400"
      />

      <StatCard
        title="Monthly Revenue"
        value={formatCurrency(totalIncome, currentCurrency)}
        trend={-4.3}
        icon={<Activity className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />}
        iconBgClass="bg-emerald-100 dark:bg-emerald-900/20"
        iconTextClass="text-emerald-600 dark:text-emerald-400"
      />

      <StatCard
        title="Total Expenses"
        value={formatCurrency(totalExpense, currentCurrency)}
        trend={1.8}
        icon={<CreditCard className="w-6 h-6 text-rose-600 dark:text-rose-400" />}
        iconBgClass="bg-rose-100 dark:bg-rose-900/20"
        iconTextClass="text-rose-600 dark:text-rose-400"
      />

      <StatCard
        title="Monthly Transaction Count"
        value={monthlyTransactionCount.toString()}
        trend={0}
        icon={<Calendar className="w-6 h-6 text-violet-600 dark:text-violet-400" />}
        iconBgClass="bg-violet-100 dark:bg-violet-900/20"
        iconTextClass="text-violet-600 dark:text-violet-400"
      />
    </div>
  );
};

export default StatCardsSection;
