import React, { useEffect, useState, useMemo, useCallback, memo } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, Area, ComposedChart } from "recharts";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { format } from "date-fns";
import { chartDataService } from "@/services/chartDataService";
import type { IncomeExpenseChartData } from "@/types/chartData";
import { useResponsive } from "@/hooks/useResponsive";
import { usePerformanceMetrics } from "@/utils/performance";

interface IncomeExpenseAnalysis {
  avgIncome: number;
  avgExpenses: number;
  monthsInSurplus: number;
  monthsInDeficit: number;
  biggestGap: number;
  totalNetIncome: number;
}

interface IncomeExpenseChartProps {
  timePeriod: number;
  showNetArea?: boolean;
  showAverageLines?: boolean;
  height?: number;
  onPeriodAnalysis?: (data: IncomeExpenseAnalysis) => void;
  className?: string;
}

const PROPS_BASE_CURRENCY = "NGN";

const IncomeExpenseChart = memo(({
  timePeriod,
  showNetArea = false,
  showAverageLines = false,
  height = 350,
  onPeriodAnalysis,
  className = ""
}: IncomeExpenseChartProps) => {
  const [data, setData] = useState<IncomeExpenseChartData[]>([]);
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

  const convertNgnToUsd = useCallback((amountNgn: number): number | null => {
    const ngnRate = exchangeRates?.[PROPS_BASE_CURRENCY];
    if (ngnRate && typeof ngnRate === 'number' && ngnRate > 0) {
      return amountNgn / ngnRate;
    }
    return null;
  }, [exchangeRates]);

  // Calculate analysis metrics
  const analysis = useMemo(() => {
    if (data.length === 0) return null;

    const totalIncome = data.reduce((sum, item) => sum + item.income, 0);
    const totalExpenses = data.reduce((sum, item) => sum + item.expenses, 0);
    const avgIncome = totalIncome / data.length;
    const avgExpenses = totalExpenses / data.length;
    
    const monthsInSurplus = data.filter(item => item.income > item.expenses).length;
    const monthsInDeficit = data.filter(item => item.expenses > item.income).length;
    
    const gaps = data.map(item => Math.abs(item.income - item.expenses));
    const biggestGap = Math.max(...gaps);
    
    const totalNetIncome = totalIncome - totalExpenses;

    return {
      avgIncome,
      avgExpenses,
      monthsInSurplus,
      monthsInDeficit,
      biggestGap,
      totalNetIncome
    };
  }, [data]);

  // Notify parent component of analysis
  useEffect(() => {
    if (analysis && onPeriodAnalysis) {
      onPeriodAnalysis(analysis);
    }
  }, [analysis, onPeriodAnalysis]);

  const loadIncomeExpenseData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Start performance measurement
      startMeasurement(`income-expense-chart-load-${timePeriod}`);
      
      const incomeExpenseData = await chartDataService.getIncomeExpenseComparisonData(timePeriod);
      
      // End load measurement
      const loadTime = endMeasurement(`income-expense-chart-load-${timePeriod}`) || 0;
      
      setData(incomeExpenseData);
      
      // Record performance metrics
      recordChartPerformance({
        component: 'IncomeExpenseChart',
        loadTime,
        renderTime: 0,
        dataPoints: incomeExpenseData.length,
        timePeriod
      });
    } catch (error) {
      console.error("Failed to load income vs expense data:", error);
      setError("Failed to load income and expense data");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [timePeriod, startMeasurement, endMeasurement, recordChartPerformance]);

  useEffect(() => {
    loadIncomeExpenseData();
    
    const handleRefresh = () => {
      loadIncomeExpenseData();
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
      <div 
        className={`flex items-center justify-center ${className}`}
        style={{ height: responsiveHeight }}
      >
        <Loader2 className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} animate-spin text-muted-foreground`} />
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className={`flex items-center justify-center ${className}`}
        style={{ height: responsiveHeight }}
      >
        <div className="text-center px-4">
          <p className={`text-red-500 ${isMobile ? 'text-xs' : 'text-sm'}`}>{error}</p>
          <button 
            onClick={loadIncomeExpenseData}
            className={`mt-2 ${isMobile ? 'text-xs' : 'text-sm'} text-blue-500 hover:text-blue-700 underline touch-manipulation`}
            style={{ minHeight: isTouchDevice ? '44px' : 'auto' }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div 
        className={`flex items-center justify-center ${className}`}
        style={{ height: responsiveHeight }}
      >
        <div className="text-center px-4">
          <p className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
            No income or expense data available for this period
          </p>
          <p className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-xs'} mt-1`}>
            Add some transactions to see your income vs expense trends
          </p>
        </div>
      </div>
    );
  }

  // Prepare data with net income calculation
  const chartData = data.map(item => ({
    ...item,
    netIncome: item.income - item.expenses,
    // For area chart - only show positive net income
    positiveNet: item.income > item.expenses ? item.income - item.expenses : 0,
    negativeNet: item.expenses > item.income ? item.expenses - item.income : 0
  }));

  return (
    <div className={className} data-testid="income-expense-chart">
      {/* Analysis Summary */}
      {analysis && (
        <div className={`mb-4 grid ${
          isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'
        } gap-${isMobile ? '2' : '4'} ${isMobile ? 'text-xs' : 'text-sm'}`}>
          <div className="flex items-center gap-2">
            <TrendingUp className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-green-600`} />
            <div>
              <p className="text-muted-foreground">Avg Income</p>
              <p className={`font-semibold text-green-600 ${isMobile ? 'text-xs' : ''}`}>
                {convertNgnToUsd(analysis.avgIncome) !== null 
                  ? formatPossiblyConvertedCurrency(convertNgnToUsd(analysis.avgIncome)!) 
                  : "N/A"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-red-600`} />
            <div>
              <p className="text-muted-foreground">Avg Expenses</p>
              <p className={`font-semibold text-red-600 ${isMobile ? 'text-xs' : ''}`}>
                {convertNgnToUsd(analysis.avgExpenses) !== null 
                  ? formatPossiblyConvertedCurrency(convertNgnToUsd(analysis.avgExpenses)!) 
                  : "N/A"}
              </p>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground">Surplus Months</p>
            <p className={`font-semibold text-green-600 ${isMobile ? 'text-xs' : ''}`}>
              {analysis.monthsInSurplus}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Deficit Months</p>
            <p className={`font-semibold text-red-600 ${isMobile ? 'text-xs' : ''}`}>
              {analysis.monthsInDeficit}
            </p>
          </div>
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="positiveNetGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="negativeNetGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          
          <XAxis
            dataKey="month"
            stroke="#94a3b8"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => {
              try {
                const date = new Date(value + '-01');
                return format(date, 'MMM yy');
              } catch {
                return value;
              }
            }}
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
                const netUsd = convertNgnToUsd(data.netIncome);
                
                // Format the month for display
                let displayMonth = label;
                try {
                  const date = new Date(label + '-01');
                  displayMonth = format(date, 'MMMM yyyy');
                } catch {
                  // Keep original value if parsing fails
                }

                return (
                  <div className="rounded-lg border bg-background p-3 shadow-md">
                    <p className="text-[0.70rem] uppercase text-muted-foreground mb-2">
                      {displayMonth}
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-green-600 font-medium">Income:</span>
                        <span className="font-bold text-green-600">
                          {incomeUsd !== null ? formatPossiblyConvertedCurrency(incomeUsd) : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-red-600 font-medium">Expenses:</span>
                        <span className="font-bold text-red-600">
                          {expensesUsd !== null ? formatPossiblyConvertedCurrency(expensesUsd) : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-t pt-2">
                        <span className="text-muted-foreground font-medium">Net:</span>
                        <span className={`font-bold ${data.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {netUsd !== null ? formatPossiblyConvertedCurrency(netUsd) : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
            formatter={(value, entry) => (
              <span style={{ color: entry.color, fontWeight: 500 }}>
                {value}
              </span>
            )}
          />

          {/* Net income area fill (optional) */}
          {showNetArea && (
            <>
              <Area
                type="monotone"
                dataKey="positiveNet"
                stackId="net"
                stroke="none"
                fill="url(#positiveNetGradient)"
              />
              <Area
                type="monotone"
                dataKey="negativeNet"
                stackId="net"
                stroke="none"
                fill="url(#negativeNetGradient)"
              />
            </>
          )}

          {/* Average lines (optional) */}
          {showAverageLines && analysis && (
            <>
              <Line
                type="monotone"
                dataKey={() => analysis.avgIncome}
                stroke="#22c55e"
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                name="Avg Income"
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey={() => analysis.avgExpenses}
                stroke="#ef4444"
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                name="Avg Expenses"
                connectNulls={false}
              />
            </>
          )}

          {/* Main income and expense lines */}
          <Line
            type="monotone"
            dataKey="income"
            stroke="#22c55e"
            strokeWidth={3}
            dot={{ r: 5, stroke: "#22c55e", strokeWidth: 2, fill: "white" }}
            activeDot={{ r: 7, stroke: "#22c55e", strokeWidth: 3, fill: "white" }}
            name="Income"
          />
          
          <Line
            type="monotone"
            dataKey="expenses"
            stroke="#ef4444"
            strokeWidth={3}
            dot={{ r: 5, stroke: "#ef4444", strokeWidth: 2, fill: "white" }}
            activeDot={{ r: 7, stroke: "#ef4444", strokeWidth: 3, fill: "white" }}
            name="Expenses"
          />
          
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
});

IncomeExpenseChart.displayName = 'IncomeExpenseChart';

export default IncomeExpenseChart; 