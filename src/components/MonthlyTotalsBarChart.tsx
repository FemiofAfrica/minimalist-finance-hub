import React, { useEffect, useState, useMemo, useCallback, memo } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, Cell } from "recharts";
import { Loader2, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { format } from "date-fns";
import { chartDataService } from "@/services/chartDataService";
import type { MonthlyTotalsChartData } from "@/types/chartData";
import { useResponsive } from "@/hooks/useResponsive";
import { usePerformanceMetrics } from "@/utils/performance";

interface MonthlyTotalData {
  month: string;
  income: number;
  expenses: number;
  net: number;
  incomePercentage: number;
  expensePercentage: number;
}

interface MonthlyTotalsBarChartProps {
  timePeriod: number;
  showNetIndicators?: boolean;
  showPercentages?: boolean;
  height?: number;
  onMonthClick?: (monthData: MonthlyTotalData) => void;
  className?: string;
}

const PROPS_BASE_CURRENCY = "NGN";

const MonthlyTotalsBarChart = memo(({
  timePeriod,
  showNetIndicators = true,
  showPercentages = false,
  height = 400,
  onMonthClick,
  className = ""
}: MonthlyTotalsBarChartProps) => {
  const [data, setData] = useState<MonthlyTotalsChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { formatPossiblyConvertedCurrency, exchangeRates } = useCurrency();
  
  // Responsive and performance hooks
  const { isMobile, getChartHeight, getResponsiveSpacing, getResponsiveFontSizes, isTouchDevice } = useResponsive();
  const { startMeasurement, endMeasurement, recordChartPerformance } = usePerformanceMetrics();
  
  // Get responsive height and spacing
  const responsiveHeight = useMemo(() => getChartHeight(height), [getChartHeight, height]);
  const spacing = useMemo(() => getResponsiveSpacing(), [getResponsiveSpacing]);
  const fontSizes = useMemo(() => getResponsiveFontSizes(), [getResponsiveFontSizes]);

  const convertNgnToUsd = (amountNgn: number): number | null => {
    const ngnRate = exchangeRates?.[PROPS_BASE_CURRENCY];
    if (ngnRate && typeof ngnRate === 'number' && ngnRate > 0) {
      return amountNgn / ngnRate;
    }
    return null;
  };

  // Process data for enhanced visualization
  const processedData = useMemo(() => {
    return data.map(item => {
      const total = item.income + item.expenses;
      const net = item.income - item.expenses;
      const incomePercentage = total > 0 ? (item.income / total) * 100 : 0;
      const expensePercentage = total > 0 ? (item.expenses / total) * 100 : 0;
      
      return {
        ...item,
        net,
        incomePercentage,
        expensePercentage,
        isDeficit: item.expenses > item.income,
        displayMonth: (() => {
          try {
            const date = new Date(item.month + '-01');
            return format(date, 'MMM yy');
          } catch {
            return item.month;
          }
        })()
      };
    });
  }, [data]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (processedData.length === 0) return null;

    const totalIncome = processedData.reduce((sum, item) => sum + item.income, 0);
    const totalExpenses = processedData.reduce((sum, item) => sum + item.expenses, 0);
    const deficitMonths = processedData.filter(item => item.isDeficit).length;
    const avgMonthlyIncome = totalIncome / processedData.length;
    const avgMonthlyExpenses = totalExpenses / processedData.length;

    return {
      totalIncome,
      totalExpenses,
      netTotal: totalIncome - totalExpenses,
      deficitMonths,
      avgMonthlyIncome,
      avgMonthlyExpenses
    };
  }, [processedData]);

  const loadMonthlyTotalsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const monthlyTotalsData = await chartDataService.getMonthlyTotalsData(timePeriod);
      
      setData(monthlyTotalsData);
    } catch (error) {
      console.error("Failed to load monthly totals data:", error);
      setError("Failed to load monthly totals data");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonthlyTotalsData();
    
    const handleRefresh = () => {
      loadMonthlyTotalsData();
    };
    
    // Listen for refresh events from the transaction table
    document.addEventListener('refresh', handleRefresh);
    document.addEventListener('refresh-transactions', handleRefresh);
    
    return () => {
      document.removeEventListener('refresh', handleRefresh);
      document.removeEventListener('refresh-transactions', handleRefresh);
    };
  }, [timePeriod]);

  if (loading) {
    return (
      <div className={`h-[${height}px] flex items-center justify-center ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`h-[${height}px] flex items-center justify-center ${className}`}>
        <div className="text-center">
          <p className="text-red-500 text-sm">{error}</p>
          <button 
            onClick={loadMonthlyTotalsData}
            className="mt-2 text-xs text-blue-500 hover:text-blue-700 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`h-[${height}px] flex items-center justify-center ${className}`}>
        <div className="text-center">
          <p className="text-muted-foreground text-sm">No monthly data available for this period</p>
          <p className="text-muted-foreground text-xs mt-1">
            Add some transactions to see your monthly totals
          </p>
        </div>
      </div>
    );
  }

  const handleBarClick = (data: any, index: number) => {
    if (onMonthClick && processedData[index]) {
      const monthData: MonthlyTotalData = {
        month: processedData[index].month,
        income: processedData[index].income,
        expenses: processedData[index].expenses,
        net: processedData[index].net,
        incomePercentage: processedData[index].incomePercentage,
        expensePercentage: processedData[index].expensePercentage
      };
      onMonthClick(monthData);
    }
  };

  return (
    <div className={className} data-testid="monthly-totals-chart">
      {/* Summary Statistics */}
      {summaryStats && (
        <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <p className="text-green-800 font-medium">Total Income</p>
            </div>
            <p className="text-green-900 font-bold text-lg">
              {convertNgnToUsd(summaryStats.totalIncome) !== null 
                ? formatPossiblyConvertedCurrency(convertNgnToUsd(summaryStats.totalIncome)!) 
                : "N/A"}
            </p>
          </div>
          
          <div className="bg-red-50 p-3 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <p className="text-red-800 font-medium">Total Expenses</p>
            </div>
            <p className="text-red-900 font-bold text-lg">
              {convertNgnToUsd(summaryStats.totalExpenses) !== null 
                ? formatPossiblyConvertedCurrency(convertNgnToUsd(summaryStats.totalExpenses)!) 
                : "N/A"}
            </p>
          </div>
          
          <div className={`p-3 rounded-lg border ${summaryStats.netTotal >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className={`h-4 w-4 ${summaryStats.netTotal >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              <p className={`font-medium ${summaryStats.netTotal >= 0 ? 'text-green-800' : 'text-red-800'}`}>Net Total</p>
            </div>
            <p className={`font-bold text-lg ${summaryStats.netTotal >= 0 ? 'text-green-900' : 'text-red-900'}`}>
              {convertNgnToUsd(summaryStats.netTotal) !== null 
                ? formatPossiblyConvertedCurrency(convertNgnToUsd(summaryStats.netTotal)!) 
                : "N/A"}
            </p>
          </div>
          
          <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <p className="text-orange-800 font-medium">Deficit Months</p>
            </div>
            <p className="text-orange-900 font-bold text-lg">
              {summaryStats.deficitMonths}
            </p>
          </div>
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <BarChart 
          data={processedData} 
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          barCategoryGap="20%"
        >
          <XAxis
            dataKey="displayMonth"
            stroke="#94a3b8"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          
          <YAxis
            stroke="#94a3b8"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(valueNgn) => {
              const valueUsd = convertNgnToUsd(valueNgn);
              if (valueUsd !== null) {
                // Shorten large numbers for axis
                if (Math.abs(valueUsd) >= 1000) {
                  return `${Math.sign(valueUsd) * Math.round(Math.abs(valueUsd) / 100) / 10}K`;
                }
                return formatPossiblyConvertedCurrency(valueUsd);
              }
              return "";
            }}
          />
          
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                const incomeUsd = convertNgnToUsd(data.income);
                const expensesUsd = convertNgnToUsd(data.expenses);
                const netUsd = convertNgnToUsd(data.net);
                
                // Format the month for display
                let displayMonth = label;
                try {
                  const date = new Date(data.month + '-01');
                  displayMonth = format(date, 'MMMM yyyy');
                } catch {
                  // Keep original value if parsing fails
                }

                return (
                  <div className="rounded-lg border bg-background p-4 shadow-md min-w-[200px]">
                    <p className="text-[0.70rem] uppercase text-muted-foreground mb-3 font-semibold">
                      {displayMonth}
                    </p>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded"></div>
                          <span className="text-sm font-medium">Income:</span>
                        </div>
                        <span className="font-bold text-green-600">
                          {incomeUsd !== null ? formatPossiblyConvertedCurrency(incomeUsd) : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded"></div>
                          <span className="text-sm font-medium">Expenses:</span>
                        </div>
                        <span className="font-bold text-red-600">
                          {expensesUsd !== null ? formatPossiblyConvertedCurrency(expensesUsd) : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-t pt-2">
                        <span className="text-sm font-medium">Net:</span>
                        <span className={`font-bold ${data.net >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                          {netUsd !== null ? formatPossiblyConvertedCurrency(netUsd) : "N/A"}
                        </span>
                      </div>
                      {showPercentages && (
                        <div className="text-xs text-muted-foreground border-t pt-2">
                          Income {data.incomePercentage.toFixed(1)}%, Expenses {data.expensePercentage.toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="rect"
            formatter={(value, entry) => (
              <span style={{ color: entry.color, fontWeight: 500 }}>
                {value}
              </span>
            )}
          />

          <Bar 
            dataKey="income" 
            name="Income"
            fill="#22c55e"
            radius={[2, 2, 0, 0]}
            onClick={handleBarClick}
            cursor="pointer"
          >
            {processedData.map((entry, index) => (
              <Cell 
                key={`income-${index}`} 
                fill={entry.isDeficit ? "#16a34a" : "#22c55e"}
              />
            ))}
          </Bar>
          
          <Bar 
            dataKey="expenses" 
            name="Expenses"
            fill="#ef4444"
            radius={[2, 2, 0, 0]}
            onClick={handleBarClick}
            cursor="pointer"
          >
            {processedData.map((entry, index) => (
              <Cell 
                key={`expenses-${index}`} 
                fill={entry.isDeficit ? "#dc2626" : "#ef4444"}
              />
            ))}
          </Bar>

          {/* Net indicators as bars (optional) */}
          {showNetIndicators && (
            <Bar 
              dataKey="net" 
              name="Net"
              fill="#8b5cf6"
              radius={[2, 2, 0, 0]}
              opacity={0.7}
            >
              {processedData.map((entry, index) => (
                <Cell 
                  key={`net-${index}`} 
                  fill={entry.net >= 0 ? "#8b5cf6" : "#ef4444"}
                />
              ))}
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

MonthlyTotalsBarChart.displayName = 'MonthlyTotalsBarChart';

export default MonthlyTotalsBarChart; 