import { Activity, CreditCard, Calendar, Wallet } from "lucide-react";
import StatCard from "./StatCard";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardsSectionProps {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  monthlyTransactionCount: number;
  balanceChange: number;
  incomeChange: number;
  expenseChange: number;
  isLoading?: boolean;
}

const PROPS_BASE_CURRENCY = "NGN";

const StatCardsSection = ({ 
  totalBalance, 
  totalIncome, 
  totalExpense, 
  monthlyTransactionCount,
  balanceChange,
  incomeChange,
  expenseChange,
  isLoading = false 
}: StatCardsSectionProps) => {
  const { formatPossiblyConvertedCurrency } = useCurrency();

  // Use the values directly from the backend without conversion
  // This ensures consistency between frontend and backend data
  const formattedTotalBalance = totalBalance;
  const formattedTotalIncome = totalIncome;
  const formattedTotalExpense = totalExpense;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <StatCard
          title="Total Balance"
          value={formatPossiblyConvertedCurrency(formattedTotalBalance)}
          trend={balanceChange}
          icon={<Wallet className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
          iconBgClass="bg-blue-100 dark:bg-blue-900/20"
          iconTextClass="text-blue-600 dark:text-blue-400"
        />
      )}

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <StatCard
          title="Monthly Revenue"
          value={formatPossiblyConvertedCurrency(formattedTotalIncome)}
          trend={incomeChange}
          icon={<Activity className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />}
          iconBgClass="bg-emerald-100 dark:bg-emerald-900/20"
          iconTextClass="text-emerald-600 dark:text-emerald-400"
        />
      )}

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <StatCard
          title="Total Expenses"
          value={formatPossiblyConvertedCurrency(formattedTotalExpense)}
          trend={expenseChange}
          icon={<CreditCard className="w-6 h-6 text-rose-600 dark:text-rose-400" />}
          iconBgClass="bg-rose-100 dark:bg-rose-900/20"
          iconTextClass="text-rose-600 dark:text-rose-400"
        />
      )}

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <StatCard
          title="Monthly Transaction Count"
          value={monthlyTransactionCount !== undefined ? monthlyTransactionCount.toString() : '0'}
          trend={0}
          icon={<Calendar className="w-6 h-6 text-violet-600 dark:text-violet-400" />}
          iconBgClass="bg-violet-100 dark:bg-violet-900/20"
          iconTextClass="text-violet-600 dark:text-violet-400"
        />
      )}
    </div>
  );
};

export default StatCardsSection;
