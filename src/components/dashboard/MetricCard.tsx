import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { TrendBadge } from "@/components/ui/TrendBadge";
import { cn } from "@/lib/utils";
import { useResponsive } from "@/hooks/useResponsive";
import { isValidNumber, sanitizeNumber } from "@/utils/dataValidation";
import { formatCurrencySafe, formatPercentageSafe } from "@/utils/currencyUtils";
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
  /** Raw numeric value for validation */
  rawValue?: number;
  /** Currency code for formatting */
  currency?: string;
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
  showDetailed = false,
  rawValue,
  currency = 'NGN'
}) => {
  const { isMobile, isTablet, getResponsiveSpacing } = useResponsive();
  const spacing = getResponsiveSpacing();

  // Validate and sanitize inputs
  const sanitizedPercentage = sanitizeNumber(percentage, 0);
  const isValidData = dataAvailable && isValidNumber(sanitizedPercentage);
  
  // Handle edge cases in value display
  const getDisplayValue = (): string => {
    // If raw value is provided, validate it and use safe formatting
    if (rawValue !== undefined) {
      if (!isValidNumber(rawValue)) {
        return 'N/A';
      }
      // Use safe currency formatting to prevent "NGNNaN"
      return formatCurrencySafe(rawValue, currency);
    }
    
    // Check if the provided value contains NaN or invalid patterns
    if (value.includes('NaN') || value.includes('Infinity') || value === 'undefined') {
      return 'N/A';
    }
    
    return value;
  };

  // Get safe percentage for display
  const getDisplayPercentage = (): number => {
    if (!isValidNumber(percentage)) {
      return 0;
    }
    
    // Cap extreme percentages for display
    const MAX_DISPLAY_PERCENTAGE = 999999;
    const MIN_DISPLAY_PERCENTAGE = -999999;
    
    if (percentage > MAX_DISPLAY_PERCENTAGE) return MAX_DISPLAY_PERCENTAGE;
    if (percentage < MIN_DISPLAY_PERCENTAGE) return MIN_DISPLAY_PERCENTAGE;
    
    return percentage;
  };

  const displayValue = getDisplayValue();
  const displayPercentage = getDisplayPercentage();

  // Determine if the trend is positive for this context
  const isPositiveTrend = (trend: TrendDirection, context: string): boolean => {
    switch (context) {
      case 'income':
        return trend.direction === 'up'; // More income is good
      case 'expenses':
        return trend.direction === 'down'; // Less expenses is good
      case 'balance':
        return trend.direction === 'up'; // Higher balance is good
      default:
        return trend.direction === 'up';
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

  // Accessibility: Create descriptive text for screen readers
  const getAccessibilityDescription = () => {
    const trendText = trend.direction === 'up' ? 'increased' : trend.direction === 'down' ? 'decreased' : 'remained stable';
    const contextText = context === 'income' ? 'income' : context === 'expenses' ? 'expenses' : 'balance';
    const statusText = isPositive ? 'which is good' : 'which needs attention';
    
    return `${contextText} ${trendText} by ${Math.abs(displayPercentage).toFixed(1)}% ${periodDisplay.toLowerCase()}, ${statusText}`;
  };

  return (
    <Card 
      className={cn(
        "relative overflow-hidden transition-all duration-200 hover:shadow-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2",
        `border-l-4 ${styling.borderColor}`,
        // Responsive padding
        isMobile ? "p-0" : "",
        className
      )}
      role="article"
      aria-label={`${title} metric card`}
    >
      <CardContent className={cn(
        "space-y-3",
        // Responsive padding
        isMobile ? "p-3" : isTablet ? "p-3.5" : "p-4"
      )}>
        {/* Screen reader only description */}
        <div className="sr-only">
          {getAccessibilityDescription()}
        </div>

        {/* Header */}
        <div className={cn(
          "flex items-start justify-between",
          // Stack on mobile for better readability
          isMobile ? "flex-col gap-2" : "flex-row"
        )}>
          <div className="space-y-1 flex-1 min-w-0">
            <h4 
              className={cn(
                "font-medium text-muted-foreground",
                // Responsive font size
                isMobile ? "text-xs" : "text-sm"
              )}
              id={`metric-title-${context}`}
            >
              {title}
            </h4>
            <Badge 
              variant="outline" 
              className={cn(
                "font-medium",
                isMobile ? "text-xs px-2 py-0.5" : "text-xs"
              )}
            >
              {periodDisplay}
            </Badge>
          </div>
          
          {/* Data availability indicator */}
          {!dataAvailable && (
            <div 
              className={cn(
                "flex items-center gap-1 text-amber-600 dark:text-amber-400",
                // Ensure minimum touch target on mobile
                isMobile ? "min-h-[44px] items-center" : ""
              )}
              role="alert"
              aria-label="Limited data available for this metric"
            >
              <AlertTriangle 
                className={cn(
                  isMobile ? "w-4 h-4" : "w-3 h-3"
                )} 
                aria-hidden="true"
              />
              <span className={cn(
                isMobile ? "text-xs" : "text-xs"
              )}>
                Limited data
              </span>
            </div>
          )}
        </div>

        {/* Value */}
        <div className="space-y-2">
          <div 
            className={cn(
              "font-bold tracking-tight",
              // Responsive font size
              isMobile ? "text-xl" : isTablet ? "text-2xl" : "text-2xl"
            )}
            aria-describedby={`metric-title-${context}`}
          >
            {displayValue}
          </div>
          
          {/* Trend indicator */}
          <div className={cn(
            "flex items-center",
            // Stack on mobile for better touch targets
            isMobile ? "flex-col gap-2 items-start" : "flex-row justify-between"
          )}>
            <TrendBadge
              percentage={displayPercentage}
              trend={trend}
              context={context}
              variant="subtle"
              size={isMobile ? "sm" : "sm"}
              showLabel={false}
              aria-label={`Trend: ${trend.direction} by ${Math.abs(displayPercentage).toFixed(1)}%`}
            />
            
            {/* Positive/Negative indicator */}
            <div 
              className={cn(
                "font-medium rounded-full",
                // Responsive sizing and touch targets
                isMobile 
                  ? "text-xs px-3 py-2 min-h-[44px] flex items-center" 
                  : "text-xs px-2 py-1",
                isPositive 
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                  : "bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400"
              )}
              role="status"
              aria-label={isPositive ? "Status: Good" : "Status: Needs attention"}
            >
              {isPositive ? 'Good' : 'Attention'}
            </div>
          </div>
        </div>

        {/* Detailed breakdown */}
        {showDetailed && dataAvailable && (
          <div className="pt-2 border-t border-border/50">
            <div 
              className={cn(
                "text-muted-foreground space-y-1",
                isMobile ? "text-xs" : "text-xs"
              )}
              role="region"
              aria-label="Detailed breakdown"
            >
              <div className="flex justify-between">
                <span>Change:</span>
                <span className="font-medium">{displayValue}</span>
              </div>
              <div className="flex justify-between">
                <span>Percentage:</span>
                <span className="font-medium">
                  {displayPercentage > 0 ? '+' : ''}{displayPercentage.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Trend:</span>
                <span className="font-medium capitalize">{trend.direction}</span>
              </div>
            </div>
          </div>
        )}

        {/* Limited data notice */}
        {!dataAvailable && (
          <div className="pt-2 border-t border-border/50">
            <div 
              className={cn(
                "text-muted-foreground",
                isMobile ? "text-xs" : "text-xs"
              )}
              role="note"
              aria-label="Data limitation notice"
            >
              Comparison limited due to insufficient historical data
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricCard; 