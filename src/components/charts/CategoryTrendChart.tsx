import React, { useMemo, memo, useState } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useResponsive } from '@/hooks/useResponsive';
import type { CategoryTrendSeries } from '@/types/analytics';

// Define the original base currency of the incoming chart data  
const PROPS_BASE_CURRENCY = "NGN";

// Chart mode toggle options
type ChartMode = 'line' | 'area';

interface CategoryTrendChartProps {
  /** Array of category trend series to display */
  series: CategoryTrendSeries[];
  /** Chart mode - line or stacked area */
  mode?: ChartMode;
  /** Chart height in pixels */
  height?: number;
  /** Optional className for styling */
  className?: string;
  /** Show percentage change in tooltip */
  showPercentageChange?: boolean;
  /** Enable chart mode toggle */
  enableModeToggle?: boolean;
  /** Callback when a data point is clicked */
  onDataPointClick?: (data: any, series: CategoryTrendSeries) => void;
}

const CategoryTrendChart = memo(({
  series,
  mode = 'line',
  height = 400,
  className = '',
  showPercentageChange = true,
  enableModeToggle = true,
  onDataPointClick
}: CategoryTrendChartProps) => {
  const [chartMode, setChartMode] = useState<ChartMode>(mode);
  const { formatPossiblyConvertedCurrency, exchangeRates } = useCurrency();
  const { isMobile, getChartHeight, getResponsiveSpacing, getResponsiveFontSizes } = useResponsive();
  
  // Get responsive dimensions
  const responsiveHeight = useMemo(() => getChartHeight(height), [getChartHeight, height]);
  const spacing = useMemo(() => getResponsiveSpacing(), [getResponsiveSpacing]);
  const fontSizes = useMemo(() => getResponsiveFontSizes(), [getResponsiveFontSizes]);

  // Helper function to convert NGN to USD for currency display
  const convertNgnToUsd = (amountNgn: number): number | null => {
    const ngnRate = exchangeRates?.[PROPS_BASE_CURRENCY];
    if (ngnRate && typeof ngnRate === 'number' && ngnRate > 0) {
      return amountNgn / ngnRate;
    }
    return null;
  };

  // Process and merge data from all series into chart format
  const chartData = useMemo(() => {
    if (!series || series.length === 0) return [];

    // Get all unique months from all series
    const allMonths = new Set<string>();
    series.forEach(s => {
      s.data.forEach(point => allMonths.add(point.month));
    });

    // Sort months chronologically
    const sortedMonths = Array.from(allMonths).sort();

    // Create data points for each month with all series data
    return sortedMonths.map(month => {
      const dataPoint: any = {
        month,
        displayMonth: (() => {
          try {
            const date = new Date(month + '-01');
            return format(date, 'MMM yy');
          } catch {
            return month;
          }
        })()
      };

      // Add data for each series
      series.forEach(s => {
        const point = s.data.find(p => p.month === month);
        dataPoint[s.categoryId] = point?.amount || 0;
        dataPoint[`${s.categoryId}_percentageChange`] = point?.percentageChange || 0;
        dataPoint[`${s.categoryId}_name`] = s.categoryName;
      });

      return dataPoint;
    });
  }, [series]);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length > 0) {
      const month = payload[0]?.payload?.month;
      
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="text-sm font-medium text-gray-900 mb-2">
            {label}
          </p>
          {payload.map((entry: any, index: number) => {
            const seriesData = series.find(s => s.categoryId === entry.dataKey);
            if (!seriesData) return null;

            const valueNgn = entry.value;
            const valueUsd = convertNgnToUsd(valueNgn);
            const percentageChange = entry.payload[`${entry.dataKey}_percentageChange`];
            
            return (
              <div key={index} className="flex items-center gap-2 mb-1">
                <div 
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: entry.color }}
                />
                <div className="flex-1">
                  <p className="text-sm text-gray-900">
                    {seriesData.categoryName}
                  </p>
                  <p className="text-sm text-gray-600">
                    {valueUsd !== null ? formatPossiblyConvertedCurrency(valueUsd) : 'N/A'}
                  </p>
                  {showPercentageChange && percentageChange !== 0 && (
                    <p className={`text-xs ${percentageChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {percentageChange > 0 ? '+' : ''}{percentageChange.toFixed(1)}% vs prev month
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Handle data point clicks
  const handleClick = (data: any) => {
    if (onDataPointClick && data && data.activePayload) {
      const clickedData = data.activePayload[0];
      const seriesData = series.find(s => s.categoryId === clickedData.dataKey);
      if (seriesData) {
        onDataPointClick(data, seriesData);
      }
    }
  };

  // Mode toggle handler
  const toggleMode = () => {
    setChartMode(prev => prev === 'line' ? 'area' : 'line');
  };

  // Empty state
  if (!series || series.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height: responsiveHeight }}>
        <div className="text-center">
          <p className="text-muted-foreground text-sm">No trend data available</p>
          <p className="text-muted-foreground text-xs mt-1">
            Add some transactions to see category trends over time
          </p>
        </div>
      </div>
    );
  }

  // No data points
  if (chartData.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height: responsiveHeight }}>
        <div className="text-center">
          <p className="text-muted-foreground text-sm">No trend data points available</p>
          <p className="text-muted-foreground text-xs mt-1">
            Data needs at least one month of transactions
          </p>
        </div>
      </div>
    );
  }

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      onClick: handleClick,
      margin: {
        top: spacing.top,
        right: spacing.right,
        left: spacing.left,
        bottom: spacing.bottom
      }
    };

    if (chartMode === 'area') {
      return (
        <AreaChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="displayMonth"
            tick={{ fontSize: fontSizes.small }}
            angle={isMobile ? -45 : 0}
            textAnchor={isMobile ? 'end' : 'middle'}
            height={isMobile ? 80 : 60}
          />
          <YAxis 
            tick={{ fontSize: fontSizes.small }}
            tickFormatter={(value) => {
              const valueUsd = convertNgnToUsd(value);
              return valueUsd !== null 
                ? formatPossiblyConvertedCurrency(valueUsd, { compact: true })
                : 'N/A';
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ fontSize: fontSizes.small }}
            formatter={(value) => {
              const seriesData = series.find(s => s.categoryId === value);
              return seriesData?.categoryName || value;
            }}
          />
          {series.map((s, index) => (
            <Area
              key={s.categoryId}
              type="monotone"
              dataKey={s.categoryId}
              stackId="1"
              stroke={s.color}
              fill={s.color}
              fillOpacity={0.6}
              strokeWidth={2}
              dot={{ r: 4, fill: s.color }}
              activeDot={{ r: 6, stroke: s.color, strokeWidth: 2 }}
            />
          ))}
        </AreaChart>
      );
    }

    return (
      <LineChart {...commonProps}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="displayMonth"
          tick={{ fontSize: fontSizes.small }}
          angle={isMobile ? -45 : 0}
          textAnchor={isMobile ? 'end' : 'middle'}
          height={isMobile ? 80 : 60}
        />
        <YAxis 
          tick={{ fontSize: fontSizes.small }}
          tickFormatter={(value) => {
            const valueUsd = convertNgnToUsd(value);
            return valueUsd !== null 
              ? formatPossiblyConvertedCurrency(valueUsd, { compact: true })
              : 'N/A';
          }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          wrapperStyle={{ fontSize: fontSizes.small }}
          formatter={(value) => {
            const seriesData = series.find(s => s.categoryId === value);
            return seriesData?.categoryName || value;
          }}
        />
        {series.map((s, index) => (
          <Line
            key={s.categoryId}
            type="monotone"
            dataKey={s.categoryId}
            stroke={s.color}
            strokeWidth={2}
            dot={{ r: 4, fill: s.color }}
            activeDot={{ r: 6, stroke: s.color, strokeWidth: 2 }}
          />
        ))}
      </LineChart>
    );
  };

  return (
    <div className={className} data-testid="category-trend-chart">
      {/* Chart Mode Toggle */}
      {enableModeToggle && (
        <div className="flex items-center justify-end mb-4">
          <div className="bg-gray-100 rounded-lg p-1 flex">
            <button
              onClick={() => setChartMode('line')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                chartMode === 'line' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Line
            </button>
            <button
              onClick={() => setChartMode('area')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                chartMode === 'area' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Area
            </button>
          </div>
        </div>
      )}

      {/* Chart Container */}
      <ResponsiveContainer width="100%" height={responsiveHeight}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
});

CategoryTrendChart.displayName = 'CategoryTrendChart';

export default CategoryTrendChart; 