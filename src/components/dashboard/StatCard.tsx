
import { ReactNode } from 'react';
import { Card } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  trend: number;
  icon: ReactNode;
  iconBgClass: string;
  iconTextClass: string;
}

const StatCard = ({ title, value, trend, icon, iconBgClass, iconTextClass }: StatCardProps) => {
  const isTrendPositive = trend >= 0;
  
  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <h3 className="text-2xl font-semibold mt-1">{value}</h3>
          <p className={`text-sm flex items-center mt-1 ${isTrendPositive ? 'text-emerald-600' : 'text-destructive'}`}>
            {isTrendPositive ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
            {Math.abs(trend)}%
          </p>
        </div>
        <div className={`${iconBgClass} p-3 rounded-lg`}>
          {icon}
        </div>
      </div>
    </Card>
  );
};

export default StatCard;
