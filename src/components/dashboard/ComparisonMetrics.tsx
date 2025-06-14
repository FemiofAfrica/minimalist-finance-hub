import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Calendar, TrendingUp } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useResponsive } from "@/hooks/useResponsive";
import { cn } from "@/lib/utils";
import { getMonthlySnapshotWithComparative } from '@/services/monthlySnapshotService';
import { explanationService, createExplanationContext } from '@/services/explanationService';
import { isValidNumber, sanitizeNumber, validateComparativeData } from '@/utils/dataValidation';
import { formatCurrencySafe, formatPercentageSafe } from '@/utils/currencyUtils';
import type { MonthlySnapshotWithComparative, FinancialExplanation } from '@/types/chartData';
import type { ComparativeInsights } from '@/types/comparativeData';
import MetricCard from './MetricCard';
import ComparisonPeriod from './ComparisonPeriod';
import DataAvailability from './DataAvailability';
import ExplanationCard from './ExplanationCard';

interface ComparisonMetricsProps {
  /** Year to display comparative metrics for */
  year?: number;
  /** Month to display comparative metrics for (1-12) */
  month?: number;
  /** Whether to show current month data (overrides year/month) */
  showCurrentMonth?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show detailed breakdown */
  showDetailed?: boolean;
  /** Whether to show explanations */
  showExplanations?: boolean;
}

const ComparisonMetrics: React.FC<ComparisonMetricsProps> = ({
  year,
  month,
  showCurrentMonth = true,
  className = '',
  showDetailed = true,
  showExplanations = true
}) => {
  const [data, setData] = useState<MonthlySnapshotWithComparative | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [explanations, setExplanations] = useState<FinancialExplanation[]>([]);
  const { formatPossiblyConvertedCurrency } = useCurrency();
  const { isMobile, isTablet } = useResponsive();

  // Determine target year and month
  const targetDate = useMemo(() => {
    if (showCurrentMonth) {
      const now = new Date();
      return { year: now.getFullYear(), month: now.getMonth() + 1 };
    }
    return { 
      year: year || new Date().getFullYear(), 
      month: month || new Date().getMonth() + 1 
    };
  }, [showCurrentMonth, year, month]);

  // Generate month names for context
  const getMonthName = (year: number, month: number) => {
    return new Date(year, month - 1).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  // Fetch comparative data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const snapshot = await getMonthlySnapshotWithComparative(
          targetDate.year, 
          targetDate.month
        );
        
        setData(snapshot);

        // Generate explanations if comparative data is available
        if (snapshot?.comparative && showExplanations) {
          const currentMonth = getMonthName(targetDate.year, targetDate.month);
          const previousMonth = getMonthName(
            targetDate.month === 1 ? targetDate.year - 1 : targetDate.year,
            targetDate.month === 1 ? 12 : targetDate.month - 1
          );

          // Create explanation context
          const context = createExplanationContext(
            currentMonth,
            previousMonth,
            6 // Assume 6 months of data for now - could be made dynamic
          );

          // Generate explanations
          const generatedExplanations = explanationService.generateExplanations(
            snapshot.comparative,
            context
          );

          setExplanations(generatedExplanations);
        } else {
          setExplanations([]);
        }
      } catch (err) {
        console.error('Failed to fetch comparative metrics:', err);
        setError('Failed to load comparative insights. Please try again.');
        setExplanations([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [targetDate.year, targetDate.month, showExplanations]);

  // Loading state
  if (isLoading) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            <CardTitle>Comparative Insights</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          {showExplanations && <Skeleton className="h-40 w-full" />}
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            <CardTitle>Comparative Insights</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // No data state
  if (!data) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            <CardTitle>Comparative Insights</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <DataAvailability 
            message="No data available for the selected period"
            suggestion="Try selecting a different month or ensure transactions have been recorded"
          />
        </CardContent>
      </Card>
    );
  }

  const comparative = data.comparative;

  // No comparative data available
  if (!comparative) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            <CardTitle>Comparative Insights</CardTitle>
          </div>
          <ComparisonPeriod year={targetDate.year} month={targetDate.month} />
        </CardHeader>
        <CardContent>
          <DataAvailability 
            message="Comparative insights not available"
            suggestion="Historical data is needed to generate comparisons. This feature will be available after you have at least 2 months of transaction data."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          <CardTitle>Comparative Insights</CardTitle>
        </div>
        <ComparisonPeriod year={targetDate.year} month={targetDate.month} />
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Explanations Section */}
        {showExplanations && explanations.length > 0 && (
          <ExplanationCard
            explanations={explanations}
            title="What This Means"
            defaultExpanded={false}
            showConfidence={false}
            maxVisible={2}
            className="mb-6"
          />
        )}

        {/* Month-over-Month Comparisons */}
        {comparative.monthOverMonth && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2" id="month-over-month-heading">
              <Calendar className="w-4 h-4" aria-hidden="true" />
              Month-over-Month Changes
            </h3>
            <div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              role="region"
              aria-labelledby="month-over-month-heading"
            >
              <MetricCard
                title="Income Change"
                value={formatPossiblyConvertedCurrency(comparative.monthOverMonth.income.absoluteDifference)}
                percentage={comparative.monthOverMonth.income.percentageChange}
                trend={comparative.monthOverMonth.income.trend}
                context="income"
                period="month-over-month"
                dataAvailable={comparative.monthOverMonth.income.dataAvailable}
              />
              <MetricCard
                title="Expense Change"
                value={formatPossiblyConvertedCurrency(comparative.monthOverMonth.expenses.absoluteDifference)}
                percentage={comparative.monthOverMonth.expenses.percentageChange}
                trend={comparative.monthOverMonth.expenses.trend}
                context="expenses"
                period="month-over-month"
                dataAvailable={comparative.monthOverMonth.expenses.dataAvailable}
              />
              <MetricCard
                title="Balance Change"
                value={formatPossiblyConvertedCurrency(comparative.monthOverMonth.balance.absoluteDifference)}
                percentage={comparative.monthOverMonth.balance.percentageChange}
                trend={comparative.monthOverMonth.balance.trend}
                context="balance"
                period="month-over-month"
                dataAvailable={comparative.monthOverMonth.balance.dataAvailable}
              />
            </div>
          </div>
        )}

        {/* Year-over-Year Comparisons */}
        {comparative.yearOverYear && showDetailed && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Year-over-Year Changes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <MetricCard
                title="Income Change"
                value={formatPossiblyConvertedCurrency(comparative.yearOverYear.income.absoluteDifference)}
                percentage={comparative.yearOverYear.income.percentageChange}
                trend={comparative.yearOverYear.income.trend}
                context="income"
                period="year-over-year"
                dataAvailable={comparative.yearOverYear.income.dataAvailable}
              />
              <MetricCard
                title="Expense Change"
                value={formatPossiblyConvertedCurrency(comparative.yearOverYear.expenses.absoluteDifference)}
                percentage={comparative.yearOverYear.expenses.percentageChange}
                trend={comparative.yearOverYear.expenses.trend}
                context="expenses"
                period="year-over-year"
                dataAvailable={comparative.yearOverYear.expenses.dataAvailable}
              />
              <MetricCard
                title="Balance Change"
                value={formatPossiblyConvertedCurrency(comparative.yearOverYear.balance.absoluteDifference)}
                percentage={comparative.yearOverYear.balance.percentageChange}
                trend={comparative.yearOverYear.balance.trend}
                context="balance"
                period="year-over-year"
                dataAvailable={comparative.yearOverYear.balance.dataAvailable}
              />
            </div>
          </div>
        )}

        {/* Data Availability Notice */}
        {(!comparative.monthOverMonth?.income.dataAvailable || 
          !comparative.yearOverYear?.income.dataAvailable) && (
          <DataAvailability 
            message="Some comparative data is limited"
            suggestion="More historical data will improve the accuracy of these insights"
            variant="info"
          />
        )}
      </CardContent>
    </Card>
  );
};

export default ComparisonMetrics; 