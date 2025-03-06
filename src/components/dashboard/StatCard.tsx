
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
    <Card className="p-4 lg:p-6 hover:shadow-lg transition-shadow duration-200 w-full">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground/80 truncate">{title}</p>
          <h3 className="text-xl lg:text-2xl font-bold tracking-tight break-words overflow-hidden">{value}</h3>
          {trend !== 0 && (
            <div className={`text-sm flex items-center ${isTrendPositive ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}>
              {isTrendPositive ? 
                <ArrowUpRight className="w-4 h-4 mr-1 flex-shrink-0" /> : 
                <ArrowDownRight className="w-4 h-4 mr-1 flex-shrink-0" />
              }
              <span className="truncate">{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
        <div className={`${iconBgClass} p-3 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm`}>
          {icon}
        </div>
      </div>
    </Card>
  );
};

export default StatCard;
