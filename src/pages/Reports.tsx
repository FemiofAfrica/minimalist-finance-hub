import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Calendar, TrendingUp, BarChart3, LineChart } from "lucide-react";
import { hasMultipleMonthsOfData } from "@/services/monthlySnapshotService";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TimePeriodFilter } from "@/components/filters";
import BalanceTrendChart from "@/components/BalanceTrendChart";
import IncomeExpenseChart from "@/components/IncomeExpenseChart";
import MonthlyTotalsBarChart from "@/components/MonthlyTotalsBarChart";
import CategoryReportsSection from "@/components/reports/CategoryReportsSection";
import { useTimePeriodData } from "@/hooks/useTimePeriodData";
import { useResponsive } from "@/hooks/useResponsive";
import ComparisonMetrics from "@/components/dashboard/ComparisonMetrics";
import { InsightsSection } from "@/components/insights/InsightsSection";

// Constants for repeated values
const CHART_HEIGHTS = {
  mobile: {
    small: 250,
    medium: 300,
    large: 350
  },
  desktop: {
    small: 350,
    medium: 400,
    large: 400
  }
} as const;

const TOUCH_MIN_HEIGHT = '44px';
const DEFAULT_TIME_PERIOD = 2;

const Reports = () => {
  const [hasMultipleMonths, setHasMultipleMonths] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Responsive hooks
  const { isMobile, getResponsiveSpacing, isTouchDevice } = useResponsive();
  
  // Time period management
  const {
    currentPeriod,
    availableData,
    loading: periodLoading,
    setPeriod
  } = useTimePeriodData(DEFAULT_TIME_PERIOD);
  
  // Get responsive spacing
  const spacing = useMemo(() => getResponsiveSpacing(), [getResponsiveSpacing]);

  // Responsive class helpers
  const getIconSize = (mobileSize: string, desktopSize: string) => 
    isMobile ? mobileSize : desktopSize;
  
  const getTextSize = (mobileSize: string, desktopSize: string) => 
    isMobile ? mobileSize : desktopSize;

  const getMarginBottom = (mobileSize: string, desktopSize: string) => 
    `mb-${isMobile ? mobileSize : desktopSize}`;

  useEffect(() => {
    const checkMultipleMonths = async () => {
      try {
        const result = await hasMultipleMonthsOfData();
        setHasMultipleMonths(result);
      } catch (error) {
        console.error('Error checking for multiple months:', error);
        setHasMultipleMonths(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkMultipleMonths();
  }, []);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div 
          className="flex flex-col container mx-auto pb-8 max-w-7xl"
          style={{ 
            gap: spacing.cardGap,
            padding: `0 ${spacing.containerPadding} ${spacing.containerPadding}` 
          }}
        >
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  // Loading state for charts when period data is loading
  const ChartsLoadingSkeleton = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.cardGap }}>
      <Skeleton className="h-8 w-48" />
      <div 
        className={`grid grid-cols-1 ${!isMobile ? 'lg:grid-cols-2' : ''}`} 
        style={{ gap: spacing.cardGap }}
      >
        <Skeleton className={`${getIconSize('h-64', 'h-96')} w-full`} />
        <Skeleton className={`${getIconSize('h-64', 'h-96')} w-full`} />
      </div>
      <Skeleton className={`${getIconSize('h-64', 'h-96')} w-full`} />
      <Skeleton className={`${getIconSize('h-64', 'h-96')} w-full`} />
    </div>
  );

  // Basic layout for users without historical data
  const BasicReportsLayout = () => (
    <Card 
      className="text-center"
      style={{ 
        padding: `${isMobile ? '1.5rem' : '2rem'}`
      }}
    >
      <div className="max-w-md mx-auto">
        <Calendar 
          className={`${getIconSize('w-10 h-10', 'w-12 h-12 md:w-16 md:h-16')} mx-auto ${getMarginBottom('3', '4')} md:mb-6 text-muted-foreground`} 
        />
        <h3 className={`${getTextSize('text-base', 'text-lg')} font-semibold mb-2 md:mb-4`}>
          No Historical Data Yet
        </h3>
        <p className={`${getTextSize('text-xs', 'text-sm md:text-base')} text-muted-foreground mb-4 md:mb-6`}>
          You need at least one completed month of transactions to view historical reports. 
          Current month data is available on your Dashboard.
        </p>
        <div className="space-y-3">
          <Link to="/dashboard">
            <Button 
              className={`w-full sm:w-auto ${getTextSize('text-sm', 'text-sm md:text-base')}`}
              style={{ minHeight: isTouchDevice ? TOUCH_MIN_HEIGHT : 'auto' }}
            >
              View Current Month Data
            </Button>
          </Link>
          <div className={`${getTextSize('text-xs', 'text-xs sm:text-sm')} text-muted-foreground`}>
            Come back after you've completed your first month!
          </div>
        </div>
      </div>
    </Card>
  );

  // Chart card component to reduce duplication
  const ChartCard = ({ 
    icon: Icon, 
    iconColor, 
    title, 
    description, 
    children 
  }: {
    icon: any;
    iconColor: string;
    title: string;
    description: string;
    children: React.ReactNode;
  }) => (
    <Card style={{ padding: spacing.containerPadding }}>
      <CardHeader className="px-0 pt-0">
        <div className="flex items-center gap-2">
          <Icon className={`${getIconSize('h-4 w-4', 'h-5 w-5')} ${iconColor}`} />
          <CardTitle className={getTextSize('text-lg', 'text-xl')}>
            {title}
          </CardTitle>
        </div>
        <p className={`${getTextSize('text-xs', 'text-sm')} text-muted-foreground`}>
          {description}
        </p>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {children}
      </CardContent>
    </Card>
  );

  // Enhanced reports layout with all chart components
  const EnhancedReportsLayout = () => (
    <div style={{ marginBottom: spacing.cardGap }}>
      {/* Header with Time Period Filter */}
      <div 
        className={`flex ${isMobile ? 'flex-col' : 'flex-col sm:flex-row sm:items-center sm:justify-between'} gap-4`} 
        style={{ marginBottom: spacing.cardGap }}
      >
        <div>
          <h1 className={`${getTextSize('text-xl', 'text-2xl md:text-3xl')} font-bold tracking-tight`}>
            Financial Reports
          </h1>
          <p className={`text-muted-foreground mt-1 ${getTextSize('text-sm', '')}`}>
            Comprehensive visual analytics of your financial data
          </p>
        </div>
        
        {!periodLoading && availableData && (
          <TimePeriodFilter
            currentPeriod={currentPeriod}
            onPeriodChange={setPeriod}
            availableData={availableData}
            className={isMobile ? 'w-full' : 'flex-shrink-0'}
          />
        )}
      </div>

      {/* Charts Section */}
      {periodLoading ? (
        <ChartsLoadingSkeleton />
      ) : (
        <div 
          style={{ display: 'flex', flexDirection: 'column', gap: spacing.cardGap }} 
          data-testid="charts-container"
        >
          {/* Balance Trend Chart - Primary Overview */}
          <ChartCard
            icon={LineChart}
            iconColor="text-green-600"
            title="Balance Trend"
            description="Track your account balance progression over time"
          >
            <BalanceTrendChart 
              timePeriod={currentPeriod}
              height={isMobile ? CHART_HEIGHTS.mobile.small : CHART_HEIGHTS.desktop.small}
              className="w-full"
            />
          </ChartCard>

          {/* Income vs Expenses and Monthly Totals - Side by Side */}
          <div 
            className={`grid grid-cols-1 ${!isMobile ? 'xl:grid-cols-2' : ''}`} 
            style={{ gap: spacing.cardGap }}
          >
            {/* Income vs Expenses Chart */}
            <ChartCard
              icon={TrendingUp}
              iconColor="text-blue-600"
              title="Income vs Expenses"
              description="Compare income and expense trends with detailed analysis"
            >
              <IncomeExpenseChart 
                timePeriod={currentPeriod}
                height={isMobile ? CHART_HEIGHTS.mobile.medium : CHART_HEIGHTS.desktop.medium}
                showNetArea={true}
                showAverageLines={true}
                className="w-full"
              />
            </ChartCard>

            {/* Monthly Totals Bar Chart */}
            <ChartCard
              icon={BarChart3}
              iconColor="text-purple-600"
              title="Monthly Breakdown"
              description="Monthly income and expense totals with summary statistics"
            >
              <MonthlyTotalsBarChart 
                timePeriod={currentPeriod}
                height={isMobile ? CHART_HEIGHTS.mobile.medium : CHART_HEIGHTS.desktop.medium}
                showNetIndicators={true}
                showPercentages={false}
                className="w-full"
              />
            </ChartCard>
          </div>

          {/* Category Reports Section */}
          <CategoryReportsSection 
            timePeriod={currentPeriod}
            className="w-full"
          />

          {/* Comparative Insights Section */}
          <ComparisonMetrics 
            showCurrentMonth={true}
            showDetailed={!isMobile}
            className="w-full"
          />

          {/* Financial Insights Section */}
          <InsightsSection className="w-full" />
            
          {/* Future Reports Section */}
          <Card 
            className="text-center bg-gradient-to-r from-green-50 to-blue-50 border-green-200"
            style={{ 
              padding: `${isMobile ? '1.5rem' : '2rem'}` 
            }}
          >
            <div className="max-w-md mx-auto">
              <Target 
                className={`${getIconSize('w-6 h-6', 'w-8 h-8')} mx-auto ${getMarginBottom('3', '4')} text-green-600`} 
              />
              <h3 className={`${getTextSize('text-base', 'text-lg')} font-semibold mb-2 md:mb-4`}>
                More Analytics Coming Soon!
              </h3>
              <p className={`${getTextSize('text-xs', 'text-sm md:text-base')} text-muted-foreground mb-4 md:mb-6`}>
                We're developing advanced features like budget vs actual analysis, 
                predictive insights, and automated financial health scoring.
              </p>
              <p className={`${getTextSize('text-xs', 'text-xs sm:text-sm')} text-muted-foreground`}>
                Have suggestions for reports you'd like to see?{' '}
                <a 
                  href="mailto:hello@kpege.com?subject=Report%20Suggestions" 
                  className="text-green-600 hover:text-green-700 underline font-medium"
                >
                  Send them to hello@kpege.com
                </a>
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );

  return (
    <DashboardLayout>
      <div 
        className="flex flex-col container mx-auto pb-8 max-w-7xl"
        style={{ 
          gap: spacing.cardGap,
          padding: `0 ${spacing.containerPadding} ${spacing.containerPadding}` 
        }}
      >
        {hasMultipleMonths ? <EnhancedReportsLayout /> : <BasicReportsLayout />}
      </div>
    </DashboardLayout>
  );
};

export default Reports; 
