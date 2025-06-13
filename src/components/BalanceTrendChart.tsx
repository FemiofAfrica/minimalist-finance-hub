import { useEffect, useState, useMemo, useCallback, memo } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from "recharts";
import { Loader2 } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { format } from "date-fns";
import { chartDataService } from "@/services/chartDataService";
import type { BalanceChartData } from "@/types/chartData";
import { useResponsive } from "@/hooks/useResponsive";
import { usePerformanceMetrics } from "@/utils/performance";

interface BalanceTrendChartProps {
  timePeriod: number; // months to display
  onDataLoad?: (dataLength: number) => void;
  className?: string;
  height?: number;
}

const PROPS_BASE_CURRENCY = "NGN";

const BalanceTrendChart = memo(({ 
  timePeriod, 
  onDataLoad, 
  className = "", 
  height = 300 
}: BalanceTrendChartProps) => {
  const [data, setData] = useState<BalanceChartData[]>([]);
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

  const loadBalanceData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Start performance measurement
      startMeasurement(`balance-chart-load-${timePeriod}`);
      
      const balanceData = await chartDataService.getBalanceTrendData(timePeriod);
      
      // End load measurement
      const loadTime = endMeasurement(`balance-chart-load-${timePeriod}`) || 0;
      
      setData(balanceData);
      onDataLoad?.(balanceData.length);
      
      // Record performance metrics
      recordChartPerformance({
        component: 'BalanceTrendChart',
        loadTime,
        renderTime: 0, // Will be measured separately
        dataPoints: balanceData.length,
        timePeriod
      });
    } catch (error) {
      console.error("Failed to load balance trend data:", error);
      setError("Failed to load balance data");
      setData([]);
      onDataLoad?.(0);
    } finally {
      setLoading(false);
    }
  }, [timePeriod, startMeasurement, endMeasurement, recordChartPerformance, onDataLoad]);

  useEffect(() => {
    loadBalanceData();
    
    const handleRefresh = () => {
      loadBalanceData();
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
            onClick={loadBalanceData}
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
            No balance data available for this period
          </p>
          <p className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-xs'} mt-1`}>
            Add some transactions to see your balance trend
          </p>
        </div>
      </div>
    );
  }

  // Determine if we should use positive or negative styling
  const latestBalance = data[data.length - 1]?.balance || 0;
  const isPositiveTrend = latestBalance >= 0;

  return (
    <div className={className} data-testid="balance-trend-chart">
      <ResponsiveContainer width="100%" height={responsiveHeight}>
        <AreaChart data={data} margin={spacing.chartMargin}>
          <defs>
            <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop 
                offset="5%" 
                stopColor={isPositiveTrend ? "#10b981" : "#ef4444"} 
                stopOpacity={0.3}
              />
              <stop 
                offset="95%" 
                stopColor={isPositiveTrend ? "#10b981" : "#ef4444"} 
                stopOpacity={0.1}
              />
            </linearGradient>
          </defs>
          
          <XAxis
            dataKey="month"
            stroke="#94a3b8"
            fontSize={fontSizes.chartAxis}
            tickLine={false}
            axisLine={false}
            interval={isMobile ? 'preserveStartEnd' : 0}
            tickFormatter={(value) => {
              try {
                // Format as MMM YYYY (e.g., "Jan 2024")
                const date = new Date(value + '-01'); // Add day to make valid date
                return format(date, isMobile ? 'MMM' : 'MMM yy');
              } catch {
                return value;
              }
            }}
          />
          
          <YAxis
            stroke="#94a3b8"
            fontSize={fontSizes.chartAxis}
            tickLine={false}
            axisLine={false}
            width={isMobile ? 50 : 60}
            tickFormatter={(valueNgn) => {
              const valueUsd = convertNgnToUsd(valueNgn);
              if (valueUsd !== null) {
                // Format with shorter notation for axis
                const formatted = formatPossiblyConvertedCurrency(valueUsd);
                // Shorten large numbers (e.g., $1,000 -> $1K)
                if (Math.abs(valueUsd) >= 1000) {
                  return `${Math.sign(valueUsd) * Math.round(Math.abs(valueUsd) / 100) / 10}K`;
                }
                return formatted;
              }
              return "";
            }}
          />
          
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const pointData = payload[0].payload as BalanceChartData;
                const valueNgn = pointData.balance;
                const valueUsd = convertNgnToUsd(valueNgn);
                
                // Format the month for display
                let displayMonth = label;
                try {
                  const date = new Date(label + '-01');
                  displayMonth = format(date, isMobile ? 'MMM yyyy' : 'MMMM yyyy');
                } catch {
                  // Keep original value if parsing fails
                }

                return (
                  <div className={`rounded-lg border bg-background shadow-md ${
                    isMobile ? 'p-2' : 'p-3'
                  }`}>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex flex-col">
                        <span className={`uppercase text-muted-foreground ${
                          isMobile ? 'text-[0.65rem]' : 'text-[0.70rem]'
                        }`}>
                          Balance ({displayMonth})
                        </span>
                        <span 
                          className={`font-bold ${
                            isMobile ? 'text-base' : 'text-lg'
                          } ${
                            pointData.balance >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {valueUsd !== null ? formatPossiblyConvertedCurrency(valueUsd) : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          
          <Area
            type="monotone"
            dataKey="balance"
            stroke={isPositiveTrend ? "#10b981" : "#ef4444"}
            strokeWidth={3}
            fill="url(#balanceGradient)"
            dot={{ 
              r: 4, 
              stroke: isPositiveTrend ? "#10b981" : "#ef4444", 
              strokeWidth: 2, 
              fill: "white" 
            }}
            activeDot={{ 
              r: 6, 
              stroke: isPositiveTrend ? "#10b981" : "#ef4444", 
              strokeWidth: 3,
              fill: "white"
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

BalanceTrendChart.displayName = 'BalanceTrendChart';

export default BalanceTrendChart; 