
import { Activity, CreditCard, Users, Wallet } from "lucide-react";
import StatCard from "./StatCard";
import { formatNaira } from "@/utils/formatters";

interface StatCardsSectionProps {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
}

const StatCardsSection = ({ totalBalance, totalIncome, totalExpense }: StatCardsSectionProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Balance"
        value={formatNaira(totalBalance)}
        trend={2.5}
        icon={<Wallet className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
        iconBgClass="bg-blue-100 dark:bg-blue-900/20"
        iconTextClass="text-blue-600 dark:text-blue-400"
      />

      <StatCard
        title="Monthly Revenue"
        value={formatNaira(totalIncome)}
        trend={-4.3}
        icon={<Activity className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />}
        iconBgClass="bg-emerald-100 dark:bg-emerald-900/20"
        iconTextClass="text-emerald-600 dark:text-emerald-400"
      />

      <StatCard
        title="Total Expenses"
        value={formatNaira(totalExpense)}
        trend={1.8}
        icon={<CreditCard className="w-6 h-6 text-rose-600 dark:text-rose-400" />}
        iconBgClass="bg-rose-100 dark:bg-rose-900/20"
        iconTextClass="text-rose-600 dark:text-rose-400"
      />

      <StatCard
        title="Active Users"
        value="1,249"
        trend={3.2}
        icon={<Users className="w-6 h-6 text-violet-600 dark:text-violet-400" />}
        iconBgClass="bg-violet-100 dark:bg-violet-900/20"
        iconTextClass="text-violet-600 dark:text-violet-400"
      />
    </div>
  );
};

export default StatCardsSection;
