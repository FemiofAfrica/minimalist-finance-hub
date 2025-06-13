import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { TrendBadge } from "@/components/ui/TrendBadge";
import { cn } from "@/lib/utils";
import type { TrendDirection } from '@/types/comparativeData';

interface MetricCardProps {
  /** Title of the metric */
  title: string;
  /** Formatted value to display */
  value: string;
  /** Percentage change */
  percentage: number;
  /** Trend direction */
  trend: TrendDirection;
  /** Context for color theming (income, expenses, balance) */
  context: 'income' | 'expenses' | 'balance';
  /** Time period for the comparison */
  period: 'month-over-month' | 'year-over-year';
  /** Whether data is available for comparison */
  dataAvailable: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show detailed breakdown */
  showDetailed?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  percentage,
  trend,
  context,
  period,
  dataAvailable,
  className = '',
  showDetailed = false
}) => {
  // Determine if the trend is positive for this context
  const isPositiveTrend = (trend: TrendDirection, context: string): boolean => {
    switch (context) {
      case 'income':
        return trend === 'up'; // More income is good
      case 'expenses':
        return trend === 'down'; // Less expenses is good
      case 'balance':
        return trend === 'up'; // Higher balance is good
      default:
        return trend === 'up';
    }
  };

  // Get context-specific styling
  const getContextStyling = (context: string) => {
    switch (context) {
      case 'income':
        return {
          borderColor: 'border-l-emerald-500',
          iconBg: 'bg-emerald-100 dark:bg-emerald-900/20',
          iconColor: 'text-emerald-600 dark:text-emerald-400'
        };
      case 'expenses':
        return {
          borderColor: 'border-l-rose-500',
          iconBg: 'bg-rose-100 dark:bg-rose-900/20',
          iconColor: 'text-rose-600 dark:text-rose-400'
        };
      case 'balance':
        return {
          borderColor: 'border-l-blue-500',
          iconBg: 'bg-blue-100 dark:bg-blue-900/20',
          iconColor: 'text-blue-600 dark:text-blue-400'
        };
      default:
        return {
          borderColor: 'border-l-gray-500',
          iconBg: 'bg-gray-100 dark:bg-gray-900/20',
          iconColor: 'text-gray-600 dark:text-gray-400'
        };
    }
  };

  const styling = getContextStyling(context);
  const isPositive = isPositiveTrend(trend, context);

  // Format period display
  const periodDisplay = period === 'month-over-month' ? 'vs Last Month' : 'vs Last Year';

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-200 hover:shadow-md",
      `border-l-4 ${styling.borderColor}`,
      className
    )}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground">
                {title}
              </h4>
              <Badge variant="outline" className="text-xs">
                {periodDisplay}
              </Badge>
            </div>
            
            {/* Data availability indicator */}
            {!dataAvailable && (
              <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-3 h-3" />
                <span className="text-xs">Limited data</span>
              </div>
            )}
          </div>

          {/* Value */}
          <div className="space-y-2">
            <div className="text-2xl font-bold tracking-tight">
              {value}
            </div>
            
            {/* Trend indicator */}
            <div className="flex items-center justify-between">
              <TrendBadge
                percentage={percentage}
                trend={trend}
                context={context}
                variant="subtle"
                size="sm"
                showLabel={false}
              />
              
              {/* Positive/Negative indicator */}
              <div className={cn(
                "text-xs font-medium px-2 py-1 rounded-full",
                isPositive 
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                  : "bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400"
              )}>
                {isPositive ? 'Good' : 'Attention'}
              </div>
            </div>
          </div>

          {/* Detailed breakdown */}
          {showDetailed && dataAvailable && (
            <div className="pt-2 border-t border-border/50">
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Change:</span>
                  <span className="font-medium">{value}</span>
                </div>
                <div className="flex justify-between">
                  <span>Percentage:</span>
                  <span className="font-medium">
                    {percentage > 0 ? '+' : ''}{percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Trend:</span>
                  <span className="font-medium capitalize">{trend}</span>
                </div>
              </div>
            </div>
          )}

          {/* Limited data notice */}
          {!dataAvailable && (
            <div className="pt-2 border-t border-border/50">
              <div className="text-xs text-muted-foreground">
                Comparison limited due to insufficient historical data
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MetricCard; 