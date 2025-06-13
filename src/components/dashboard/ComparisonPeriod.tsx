import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComparisonPeriodProps {
  /** Year for the comparison period */
  year: number;
  /** Month for the comparison period (1-12) */
  month: number;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show detailed period information */
  showDetailed?: boolean;
}

const ComparisonPeriod: React.FC<ComparisonPeriodProps> = ({
  year,
  month,
  className = '',
  showDetailed = false
}) => {
  // Format month name
  const getMonthName = (month: number): string => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || 'Unknown';
  };

  // Format short month name
  const getShortMonthName = (month: number): string => {
    const shortMonths = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return shortMonths[month - 1] || 'Unknown';
  };

  // Check if it's current month
  const isCurrentMonth = (): boolean => {
    const now = new Date();
    return year === now.getFullYear() && month === now.getMonth() + 1;
  };

  // Get previous month for comparison context
  const getPreviousMonth = () => {
    let prevMonth = month - 1;
    let prevYear = year;
    
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = year - 1;
    }
    
    return {
      month: prevMonth,
      year: prevYear,
      name: getShortMonthName(prevMonth)
    };
  };

  // Get same month previous year
  const getPreviousYear = () => {
    return {
      month,
      year: year - 1,
      name: getShortMonthName(month)
    };
  };

  const currentMonthName = getMonthName(month);
  const shortCurrentMonth = getShortMonthName(month);
  const isCurrent = isCurrentMonth();
  const prevMonth = getPreviousMonth();
  const prevYear = getPreviousYear();

  if (showDetailed) {
    return (
      <div className={cn("space-y-2", className)}>
        {/* Main period */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {currentMonthName} {year}
            {isCurrent && (
              <Badge variant="secondary" className="ml-2 text-xs">
                Current
              </Badge>
            )}
          </span>
        </div>
        
        {/* Comparison periods */}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span>vs</span>
            <Badge variant="outline" className="text-xs">
              {prevMonth.name} {prevMonth.year}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <span>vs</span>
            <Badge variant="outline" className="text-xs">
              {prevYear.name} {prevYear.year}
            </Badge>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Calendar className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">
        {shortCurrentMonth} {year}
        {isCurrent && (
          <Badge variant="secondary" className="ml-2 text-xs">
            Current
          </Badge>
        )}
      </span>
    </div>
  );
};

export default ComparisonPeriod; 