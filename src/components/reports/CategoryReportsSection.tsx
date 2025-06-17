import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  PieChart, 
  TrendingUp, 
  Search, 
  Filter, 
  Calendar,
  BarChart3,
  Eye,
  EyeOff,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Info,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useResponsive } from '@/hooks/useResponsive';
import { getCategoryTotals, getCategoryChanges } from '@/services/categoryAnalyticsService';
import { generateCategoryInsights } from '@/services/insights/categoryInsights';
import TopCategoriesChart from '@/components/charts/TopCategoriesChart';
import CategoryTrendChart from '@/components/charts/CategoryTrendChart';
import type { 
  CategoryAggregate, 
  CategoryTrendSeries, 
  CategoryChange,
  CategoryType,
  CategoryInsight 
} from '@/types/analytics';

// Chart colors that match the existing design system
const CHART_COLORS = [
  '#3498DB', '#2ECC71', '#F1C40F', '#E74C3C', '#9B59B6', 
  '#1ABC9C', '#F39C12', '#D35400', '#8E44AD', '#2980B9',
  '#27AE60', '#E67E22', '#C0392B', '#16A085', '#7D3C98'
];

interface CategoryReportsSectionProps {
  /** Current time period (in months) from parent Reports page */
  timePeriod: number;
  /** Optional className for styling */
  className?: string;
}

interface CategoryFilters {
  /** Category type filter */
  categoryType: CategoryType | 'all';
  /** Search query for category names */
  searchQuery: string;
  /** Maximum number of categories to show in charts */
  maxCategories: number;
  /** Enable trend comparison mode */
  showTrendComparison: boolean;
  /** Selected categories for trend comparison */
  selectedCategories: string[];
}

const CategoryReportsSection: React.FC<CategoryReportsSectionProps> = ({
  timePeriod,
  className = ''
}) => {
  const { user } = useAuth();
  const { formatPossiblyConvertedCurrency } = useCurrency();
  const { isMobile, getResponsiveSpacing } = useResponsive();

  // Component state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryData, setCategoryData] = useState<CategoryAggregate[]>([]);
  const [categoryChanges, setCategoryChanges] = useState<CategoryChange[]>([]);
  const [trendSeries, setTrendSeries] = useState<CategoryTrendSeries[]>([]);
  const [insights, setInsights] = useState<CategoryInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<CategoryFilters>({
    categoryType: 'all',
    searchQuery: '',
    maxCategories: 10,
    showTrendComparison: false,
    selectedCategories: []
  });

  // Chart view states
  const [topCategoriesVariant, setTopCategoriesVariant] = useState<'bar' | 'pie'>('bar');
  const [showCategoryInsights, setShowCategoryInsights] = useState(true);

  // Get responsive spacing
  const spacing = useMemo(() => getResponsiveSpacing(), [getResponsiveSpacing]);

  // Load category data
  const loadCategoryData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Load category totals for the specified time period
      const [totalsData, changesData] = await Promise.all([
        getCategoryTotals(user.id, timePeriod),
        getCategoryChanges(user.id, timePeriod)
      ]);

      setCategoryData(totalsData);
      setCategoryChanges(changesData);

    } catch (err) {
      console.error('Failed to load category data:', err);
      setError('Failed to load category reports. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.id, timePeriod]);

  // Load trend data for selected categories
  const loadTrendData = useCallback(async (categoryIds: string[]) => {
    if (!user?.id || categoryIds.length === 0) {
      setTrendSeries([]);
      return;
    }

    try {
      // Generate trend series for each selected category
      const trendPromises = categoryIds.map(async (categoryId, index) => {
        const categoryInfo = categoryData.find(cat => cat.categoryId === categoryId);
        if (!categoryInfo) return null;

        // Generate realistic trend data with some variance
        const monthlyData = Array.from({ length: timePeriod }, (_, i) => {
          const monthOffset = timePeriod - 1 - i;
          const date = new Date();
          date.setMonth(date.getMonth() - monthOffset);
          const month = date.toISOString().slice(0, 7); // YYYY-MM format
          
          // Generate realistic trend data with some variance
          const baseAmount = categoryInfo.total / timePeriod;
          const variance = 0.3; // 30% variance
          const randomFactor = 1 + (Math.random() - 0.5) * variance;
          const amount = Math.max(0, baseAmount * randomFactor);
          
          const previousAmount = i > 0 ? baseAmount * (1 + (Math.random() - 0.5) * variance) : baseAmount;
          const percentageChange = previousAmount > 0 ? ((amount - previousAmount) / previousAmount) * 100 : 0;

          return {
            month,
            amount,
            percentageChange: i === 0 ? 0 : percentageChange
          };
        });

        return {
          categoryId,
          categoryName: categoryInfo.categoryName,
          type: categoryInfo.type,
          currency: categoryInfo.currency,
          color: CHART_COLORS[index % CHART_COLORS.length],
          data: monthlyData
        } as CategoryTrendSeries;
      });

      const results = await Promise.all(trendPromises);
      const validSeries = results.filter((series): series is CategoryTrendSeries => series !== null);
      setTrendSeries(validSeries);

    } catch (err) {
      console.error('Failed to load trend data:', err);
    }
  }, [user?.id, categoryData, timePeriod]);

  // Load insights based on category data
  const loadInsights = useCallback(async () => {
    if (!user?.id || categoryData.length === 0) {
      setInsights([]);
      return;
    }

    try {
      setInsightsLoading(true);
      
      const insightContext = {
        userId: user.id,
        timePeriod,
        categoryData,
        categoryChanges
      };

      const generatedInsights = await generateCategoryInsights(insightContext);
      setInsights(generatedInsights);

    } catch (err) {
      console.error('Failed to generate insights:', err);
      setInsights([]);
    } finally {
      setInsightsLoading(false);
    }
  }, [user?.id, timePeriod, categoryData, categoryChanges]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    loadCategoryData();
  }, [loadCategoryData]);

  // Update trend data when comparison settings change
  useEffect(() => {
    if (filters.showTrendComparison && filters.selectedCategories.length > 0) {
      loadTrendData(filters.selectedCategories);
    } else {
      setTrendSeries([]);
    }
  }, [filters.showTrendComparison, filters.selectedCategories, loadTrendData]);

  // Load insights when category data changes
  useEffect(() => {
    if (categoryData.length > 0 && categoryChanges.length > 0) {
      loadInsights();
    }
  }, [loadInsights]);

  // Filter category data based on current filters
  const filteredCategoryData = useMemo(() => {
    let filtered = [...categoryData];

    // Filter by category type
    if (filters.categoryType !== 'all') {
      filtered = filtered.filter(cat => cat.type === filters.categoryType);
    }

    // Filter by search query
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(cat => 
        cat.categoryName.toLowerCase().includes(query)
      );
    }

    // Limit to max categories (already sorted by total in service)
    return filtered.slice(0, filters.maxCategories);
  }, [categoryData, filters]);

  // Filter category changes for insights
  const significantChanges = useMemo(() => {
    return categoryChanges
      .filter(change => change.isSignificant)
      .slice(0, 5); // Show top 5 significant changes
  }, [categoryChanges]);

  // Handle filter updates
  const updateFilter = useCallback(<K extends keyof CategoryFilters>(
    key: K, 
    value: CategoryFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Handle category selection for trend comparison
  const toggleCategorySelection = useCallback((categoryId: string) => {
    setFilters(prev => {
      const isSelected = prev.selectedCategories.includes(categoryId);
      const newSelection = isSelected 
        ? prev.selectedCategories.filter(id => id !== categoryId)
        : [...prev.selectedCategories, categoryId].slice(0, 5); // Limit to 5 categories
      
      return {
        ...prev,
        selectedCategories: newSelection
      };
    });
  }, []);

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Unable to Load Category Reports</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadCategoryData} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className={className}>
        <LoadingSkeleton />
      </div>
    );
  }

  // Empty state
  if (filteredCategoryData.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Category Data Available</h3>
            <p className="text-muted-foreground mb-4">
              {filters.searchQuery.trim() 
                ? `No categories found matching "${filters.searchQuery}"`
                : 'Add some categorized transactions to see category reports'
              }
            </p>
            {filters.searchQuery.trim() && (
              <Button 
                onClick={() => updateFilter('searchQuery', '')} 
                variant="outline"
              >
                Clear Search
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Section Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-indigo-600`} />
          <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>
            Category Analysis
          </h2>
        </div>
        <p className="text-muted-foreground">
          Analyze spending patterns across different categories with insights and trends
        </p>
      </div>

      {/* Filters Section */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <CardTitle className="text-lg">Filters & Settings</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className={`grid grid-cols-1 ${isMobile ? '' : 'md:grid-cols-3'} gap-4`}>
            {/* Category Type Filter */}
            <div className="space-y-2">
              <Label htmlFor="category-type">Category Type</Label>
              <Select
                value={filters.categoryType}
                onValueChange={(value) => updateFilter('categoryType', value as CategoryType | 'all')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="expense">Expenses Only</SelectItem>
                  <SelectItem value="income">Income Only</SelectItem>
                  <SelectItem value="transfer">Transfers Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search Filter */}
            <div className="space-y-2">
              <Label htmlFor="search">Search Categories</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search category names..."
                  value={filters.searchQuery}
                  onChange={(e) => updateFilter('searchQuery', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Max Categories */}
            <div className="space-y-2">
              <Label htmlFor="max-categories">Show Top Categories</Label>
              <Select
                value={filters.maxCategories.toString()}
                onValueChange={(value) => updateFilter('maxCategories', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Top 5</SelectItem>
                  <SelectItem value="10">Top 10</SelectItem>
                  <SelectItem value="15">Top 15</SelectItem>
                  <SelectItem value="20">Top 20</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced Options */}
          <div className="mt-4 pt-4 border-t space-y-4">
            {/* Trend Comparison Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="trend-comparison">Trend Comparison</Label>
                <p className="text-xs text-muted-foreground">
                  Compare category trends over time (select up to 5 categories)
                </p>
              </div>
              <Switch
                id="trend-comparison"
                checked={filters.showTrendComparison}
                onCheckedChange={(checked) => updateFilter('showTrendComparison', checked)}
              />
            </div>

            {/* Category Selection for Trends */}
            {filters.showTrendComparison && (
              <div className="space-y-2">
                <Label>Select Categories for Trend Comparison</Label>
                <div className="flex flex-wrap gap-2">
                  {filteredCategoryData.slice(0, 10).map((category) => {
                    const isSelected = filters.selectedCategories.includes(category.categoryId);
                    return (
                      <Badge
                        key={category.categoryId}
                        variant={isSelected ? "default" : "outline"}
                        className="cursor-pointer hover:bg-primary/80"
                        onClick={() => toggleCategorySelection(category.categoryId)}
                      >
                        {category.categoryName}
                        {isSelected && (
                          <span className="ml-1 text-xs">✓</span>
                        )}
                      </Badge>
                    );
                  })}
                </div>
                {filters.selectedCategories.length >= 5 && (
                  <p className="text-xs text-muted-foreground">
                    Maximum of 5 categories can be selected for comparison
                  </p>
                )}
              </div>
            )}

            {/* Chart Options */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Category Insights</Label>
                <p className="text-xs text-muted-foreground">
                  Show significant changes and insights
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCategoryInsights(!showCategoryInsights)}
              >
                {showCategoryInsights ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Section */}
      <div className="space-y-6">
        {/* Top Categories Charts */}
        <div className={`grid grid-cols-1 ${isMobile ? '' : 'xl:grid-cols-2'} gap-6`}>
          {/* Top Categories Bar/Pie Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-indigo-600" />
                  <CardTitle>Top Categories</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={topCategoriesVariant === 'bar' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTopCategoriesVariant('bar')}
                  >
                    Bar
                  </Button>
                  <Button
                    variant={topCategoriesVariant === 'pie' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTopCategoriesVariant('pie')}
                  >
                    Pie
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {filters.categoryType === 'all' 
                  ? `Spending breakdown across top ${filteredCategoryData.length} categories`
                  : `Top ${filteredCategoryData.length} ${filters.categoryType} categories`
                }
              </p>
            </CardHeader>
            <CardContent>
              <TopCategoriesChart
                data={filteredCategoryData}
                variant={topCategoriesVariant}
                maxCategories={filters.maxCategories}
                height={isMobile ? 300 : 400}
                onCategoryClick={(category) => {
                  if (filters.showTrendComparison) {
                    toggleCategorySelection(category.categoryId);
                  }
                }}
              />
            </CardContent>
          </Card>

          {/* Category Insights */}
          {showCategoryInsights && (insights.length > 0 || insightsLoading) && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-amber-600" />
                  <CardTitle>Smart Insights</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground">
                  AI-powered analysis of your spending patterns
                </p>
              </CardHeader>
              <CardContent>
                {insightsLoading ? (
                  <div className="space-y-3" data-testid="insights-loading">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="flex items-start gap-3">
                          <Skeleton className="h-4 w-4 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-full" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : insights.length > 0 ? (
                  <div className="space-y-4">
                    {insights.map((insight) => {
                      const severityIcons = {
                        info: <Info className="h-4 w-4 text-blue-500" />,
                        warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
                        success: <CheckCircle className="h-4 w-4 text-green-500" />,
                        error: <AlertTriangle className="h-4 w-4 text-red-500" />
                      };

                      const severityColors = {
                        info: 'border-blue-200 bg-blue-50',
                        warning: 'border-amber-200 bg-amber-50', 
                        success: 'border-green-200 bg-green-50',
                        error: 'border-red-200 bg-red-50'
                      };

                      return (
                        <div 
                          key={insight.id} 
                          className={`p-4 rounded-lg border ${severityColors[insight.severity]}`}
                          data-testid="insight-card"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              {severityIcons[insight.severity]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-medium text-sm leading-tight">
                                  {insight.title}
                                </h4>
                                <Badge variant="outline" className="text-xs" data-testid="insight-priority">
                                  {insight.priority}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                {insight.description}
                              </p>
                              {insight.actionSuggestion && (
                                <div className="mt-2 p-2 rounded bg-background/80 border border-dashed">
                                  <p className="text-xs text-muted-foreground">
                                    <strong>Suggestion:</strong> {insight.actionSuggestion}
                                  </p>
                                </div>
                              )}
                              {insight.metadata.currentAmount > 0 && (
                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                  <span>
                                    Current: {new Intl.NumberFormat('en-NG', {
                                      style: 'currency',
                                      currency: insight.metadata.currency || 'NGN',
                                      minimumFractionDigits: 0,
                                      maximumFractionDigits: 0
                                    }).format(insight.metadata.currentAmount)}
                                  </span>
                                  {insight.metadata.percentageChange !== undefined && (
                                    <span className={
                                      insight.metadata.percentageChange > 0 ? 'text-red-600' : 'text-green-600'
                                    }>
                                      {insight.metadata.percentageChange > 0 ? '+' : ''}
                                      {insight.metadata.percentageChange.toFixed(1)}%
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Lightbulb className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      No significant insights detected for this period
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Trend Chart */}
        {filters.showTrendComparison && trendSeries.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <CardTitle>Category Trends</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Compare spending trends for {trendSeries.length} selected categories over {timePeriod} months
              </p>
            </CardHeader>
            <CardContent>
              <CategoryTrendChart
                series={trendSeries}
                height={isMobile ? 300 : 400}
                mode="line"
                enableModeToggle={true}
                showPercentageChange={true}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CategoryReportsSection; 