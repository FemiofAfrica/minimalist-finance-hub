import React, { useMemo, memo } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend
} from 'recharts';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useResponsive } from '@/hooks/useResponsive';
import type { CategoryAggregate } from '@/types/analytics';

// Maximum number of categories to display
const MAX_CATEGORIES = 10;

// Consistent color palette from design system
const COLORS = [
  '#3498DB', '#2ECC71', '#F1C40F', '#E74C3C', '#9B59B6', 
  '#1ABC9C', '#F39C12', '#D35400', '#8E44AD', '#2980B9',
  '#27AE60', '#E67E22', '#C0392B', '#16A085', '#7D3C98'
];

// Define the original base currency of the incoming chart data  
const PROPS_BASE_CURRENCY = "NGN";

interface TopCategoriesChartProps {
  /** Array of category aggregates to display */
  data: CategoryAggregate[];
  /** Chart variant - bar or pie display */
  variant: 'bar' | 'pie';
  /** Maximum number of categories to display (defaults to 10) */
  maxCategories?: number;
  /** Chart height in pixels */
  height?: number;
  /** Optional className for styling */
  className?: string;
  /** Callback when a category is clicked */
  onCategoryClick?: (category: CategoryAggregate) => void;
}

const TopCategoriesChart = memo(({
  data,
  variant = 'bar',
  maxCategories = MAX_CATEGORIES,
  height = 400,
  className = '',
  onCategoryClick
}: TopCategoriesChartProps) => {
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

  // Process and limit data to top categories
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Sort by total (highest first) and take top N categories
    const sortedData = [...data]
      .sort((a, b) => b.total - a.total)
      .slice(0, maxCategories);
    
    // Add colors and formatted data for charts
    return sortedData.map((category, index) => ({
      ...category,
      color: COLORS[index % COLORS.length],
      // Shortened name for better display in charts
      displayName: category.categoryName.length > 15 
        ? category.categoryName.substring(0, 12) + '...'
        : category.categoryName,
      // Use total as value for chart data key
      value: category.total
    }));
  }, [data, maxCategories]);

  // Handle click events
  const handleClick = (data: any, index?: number) => {
    if (onCategoryClick && processedData[index || 0]) {
      onCategoryClick(processedData[index || 0]);
    }
  };

  // Custom tooltip for both chart types
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0];
      const valueNgn = data.value;
      const valueUsd = convertNgnToUsd(valueNgn);
      const percentage = data.payload.percentage;
      
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="text-sm font-medium text-gray-900">
            {data.payload.categoryName}
          </p>
          <p className="text-sm text-gray-600">
            Amount: {valueUsd !== null ? formatPossiblyConvertedCurrency(valueUsd) : 'N/A'}
          </p>
          <p className="text-sm text-gray-600">
            Share: {percentage?.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  // Empty state
  if (!processedData || processedData.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height: responsiveHeight }}>
        <div className="text-center">
          <p className="text-muted-foreground text-sm">No category data available</p>
          <p className="text-muted-foreground text-xs mt-1">
            Add some transactions to see your top categories
          </p>
        </div>
      </div>
    );
  }

  // Bar Chart Variant
  if (variant === 'bar') {
    return (
      <div className={className} data-testid="top-categories-bar-chart">
        <ResponsiveContainer width="100%" height={responsiveHeight}>
          <BarChart
            data={processedData}
            margin={{
              top: spacing.top,
              right: spacing.right,
              left: spacing.left,
              bottom: spacing.bottom
            }}
          >
            <XAxis 
              dataKey="displayName"
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
            <Bar 
              dataKey="value"
              onClick={handleClick}
              cursor="pointer"
              radius={[4, 4, 0, 0]}
            >
              {processedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Pie Chart Variant
  return (
    <div className={className} data-testid="top-categories-pie-chart">
      <ResponsiveContainer width="100%" height={responsiveHeight}>
        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Pie
            data={processedData}
            cx={isMobile ? "50%" : "40%"}
            cy="50%"
            labelLine={false}
            label={false}
            outerRadius={isMobile ? 70 : 80}
            innerRadius={isMobile ? 25 : 30}
            fill="#8884d8"
            dataKey="value"
            paddingAngle={2}
            onClick={handleClick}
          >
            {processedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            layout={isMobile ? "horizontal" : "vertical"}
            verticalAlign={isMobile ? "bottom" : "middle"}
            align={isMobile ? "center" : "right"}
            wrapperStyle={{
              paddingLeft: isMobile ? "0" : "30px",
              fontSize: fontSizes.small,
              right: 0,
              width: isMobile ? "100%" : "40%",
              paddingTop: isMobile ? "20px" : "0"
            }}
            formatter={(value, entry: any) => {
              const percentage = entry.payload?.percentage || 0;
              return `${value}: ${percentage.toFixed(1)}%`;
            }}
            iconType="circle"
            iconSize={8}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
});

TopCategoriesChart.displayName = 'TopCategoriesChart';

export default TopCategoriesChart; 