import { ReactNode } from 'react';
import { Card } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  trend: number;
  icon: ReactNode;
  iconBgClass: string;
  iconTextClass: string;
}

const StatCard = ({ title, value, trend, icon, iconBgClass, iconTextClass }: StatCardProps) => {
  const isTrendPositive = trend > 0;
  const isTrendNeutral = trend === 0;
  
  const formatTrend = (trend: number): string => {
    // If trend is very large (over 1000%), cap it for display
    if (Math.abs(trend) > 1000) {
      return '>1000%';
    }
    return `${Math.abs(trend)}%`;
  };
  
  return (
    <Card className="p-4 lg:p-6 hover:shadow-lg transition-shadow duration-200 w-full">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground/80 truncate">{title}</p>
          <h3 className="text-xl lg:text-2xl font-bold tracking-tight break-words overflow-hidden">{value}</h3>
          <div className={`text-sm flex items-center ${
            isTrendNeutral 
              ? 'text-gray-500 dark:text-gray-400'
              : isTrendPositive 
                ? 'text-emerald-600 dark:text-emerald-500' 
                : 'text-red-600 dark:text-red-500'
          }`}>
            {isTrendNeutral ? (
              <Minus className="w-4 h-4 mr-1 flex-shrink-0" />
            ) : isTrendPositive ? (
              <ArrowUpRight className="w-4 h-4 mr-1 flex-shrink-0" />
            ) : (
              <ArrowDownRight className="w-4 h-4 mr-1 flex-shrink-0" />
            )}
            <span className="truncate">{formatTrend(trend)}</span>
          </div>
        </div>
        <div className={`${iconBgClass} p-3 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm`}>
          {icon}
        </div>
      </div>
    </Card>
  );
};

export default StatCard;
