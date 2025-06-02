import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { getHistoricalMonthlySnapshots, MonthlySnapshot, initializeSnapshotsForExistingData } from '@/services/monthlySnapshotService';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type TimePeriod = '1' | '3' | '6' | '12' | '24';

const PERIOD_OPTIONS = [
  { value: '1', label: 'Last 1 Month', description: 'Previous completed month' },
  { value: '3', label: 'Last 3 Months', description: 'Recent completed months' },
  { value: '6', label: 'Last 6 Months', description: 'Half year completed data' },
  { value: '12', label: 'Last 12 Months', description: 'Full year completed data' },
  { value: '24', label: 'Last 24 Months', description: 'Two years completed data' },
];

const MonthlyHistoryViewer = () => {
  const [snapshots, setSnapshots] = useState<MonthlySnapshot[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('3');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { formatPossiblyConvertedCurrency, exchangeRates } = useCurrency();
  const { toast } = useToast();

  const PROPS_BASE_CURRENCY = "NGN";

  const convertNgnToUsd = (amountNgn: number): number | null => {
    const ngnRate = exchangeRates?.[PROPS_BASE_CURRENCY];
    if (ngnRate && typeof ngnRate === 'number' && ngnRate > 0) {
      return amountNgn / ngnRate;
    }
    return null;
  };

  const fetchSnapshots = async (showRefreshToast = false) => {
    try {
      setIsLoading(!showRefreshToast);
      setIsRefreshing(showRefreshToast);
      
      // First, initialize snapshots for existing data
      await initializeSnapshotsForExistingData();
      
      // Then fetch the historical snapshots (excluding current month)
      const periodLimit = parseInt(selectedPeriod);
      const data = await getHistoricalMonthlySnapshots(periodLimit);
      setSnapshots(data);
      
      // Reset to first page when period changes
      setCurrentIndex(0);
      
      if (showRefreshToast && data.length > 0) {
        toast({
          title: 'Success',
          description: `Updated ${data.length} monthly snapshots`,
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Error fetching monthly snapshots:', error);
      toast({
        title: 'Error',
        description: 'Failed to load monthly history',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSnapshots();
  }, [selectedPeriod]); // Re-fetch when period changes

  const handleRefresh = () => {
    fetchSnapshots(true);
  };

  const handlePeriodChange = (value: TimePeriod) => {
    setSelectedPeriod(value);
  };

  const getMonthName = (month: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  };

  const calculateChange = (current: number, previous: number): { value: number; isPositive: boolean; isNeutral: boolean } => {
    if (previous === 0) {
      return { value: current > 0 ? 100 : 0, isPositive: current > 0, isNeutral: current === 0 };
    }
    const change = Math.round(((current - previous) / previous) * 100);
    return { value: Math.abs(change), isPositive: change > 0, isNeutral: change === 0 };
  };

  // Calculate how many months to show at once based on selected period
  const getMonthsToShow = () => {
    const period = parseInt(selectedPeriod);
    if (period === 1) return 1;
    if (period <= 3) return Math.min(period, 3);
    if (period <= 6) return 3; // Show 3 at a time for 6 months
    return 3; // Always show 3 at a time for larger periods
  };

  const monthsToShow = getMonthsToShow();

  const goToPrevious = () => {
    if (currentIndex < snapshots.length - monthsToShow) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToNext = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Monthly History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (snapshots.length === 0) {
    return (
      <Card className="p-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl md:text-2xl font-bold">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
              Monthly History
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-32 sm:w-36 md:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span className="text-sm md:text-base">{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline text-xs sm:text-sm">{isRefreshing ? 'Updating...' : 'Refresh'}</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 md:py-8">
            <div className="text-sm md:text-base text-muted-foreground mb-3 md:mb-4">
              No completed monthly data available for the selected period yet. This could mean:
            </div>
            <ul className="text-xs sm:text-sm text-muted-foreground mb-4 md:mb-6 text-left max-w-md mx-auto space-y-1">
              <li>• You haven't completed a full month of transactions yet</li>
              <li>• No transactions exist for the selected completed months</li>
              <li>• Monthly snapshots need to be generated</li>
              <li>• Data is still being processed</li>
            </ul>
            <p className="text-xs sm:text-sm text-muted-foreground mb-3 md:mb-4">
              <strong>Note:</strong> Historical data only shows completed months. Current month data is available on the Dashboard.
            </p>
            <Button onClick={handleRefresh} disabled={isRefreshing} className="text-sm md:text-base">
              {isRefreshing ? 'Processing...' : 'Generate Monthly History'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show exactly monthsToShow months at a time
  const visibleSnapshots = snapshots.slice(currentIndex, currentIndex + monthsToShow);
  const hasNext = currentIndex > 0;
  const hasPrevious = currentIndex < snapshots.length - monthsToShow;

  return (
    <Card className="p-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl md:text-2xl font-bold">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            Monthly History
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-32 sm:w-36 md:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span className="text-sm md:text-base">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline text-xs sm:text-sm">{isRefreshing ? 'Updating...' : 'Refresh'}</span>
            </Button>
            {snapshots.length > monthsToShow && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPrevious}
                  disabled={!hasPrevious}
                >
                  <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNext}
                  disabled={!hasNext}
                >
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className={`grid grid-cols-1 ${monthsToShow === 1 ? 'md:grid-cols-1' : monthsToShow === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4`}>
          {visibleSnapshots.map((snapshot, index) => {
            const actualIndex = currentIndex + index;
            const previousSnapshot = snapshots[actualIndex + 1];
            
            const closingBalanceUsd = convertNgnToUsd(snapshot.closing_balance);
            const totalIncomeUsd = convertNgnToUsd(snapshot.total_income);
            const totalExpensesUsd = convertNgnToUsd(snapshot.total_expenses);

            const balanceChange = previousSnapshot 
              ? calculateChange(snapshot.closing_balance, previousSnapshot.closing_balance)
              : { value: 0, isPositive: false, isNeutral: true };

            const incomeChange = previousSnapshot 
              ? calculateChange(snapshot.total_income, previousSnapshot.total_income)
              : { value: 0, isPositive: false, isNeutral: true };

            const expenseChange = previousSnapshot 
              ? calculateChange(snapshot.total_expenses, previousSnapshot.total_expenses)
              : { value: 0, isPositive: false, isNeutral: true };

            return (
              <Card 
                key={snapshot.snapshot_id} 
                className="border-2 hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-2 md:pb-3">
                  <CardTitle className="text-base sm:text-lg md:text-xl font-bold">
                    {getMonthName(snapshot.month)} {snapshot.year}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4">
                  {/* Closing Balance */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm text-muted-foreground">Final Balance</span>
                      <div className={`flex items-center gap-1 text-xs ${
                        balanceChange.isNeutral 
                          ? 'text-gray-500' 
                          : balanceChange.isPositive 
                            ? 'text-emerald-600' 
                            : 'text-red-600'
                      }`}>
                        {balanceChange.isNeutral ? (
                          <span>-</span>
                        ) : balanceChange.isPositive ? (
                          <TrendingUp className="w-2 h-2 sm:w-3 sm:h-3" />
                        ) : (
                          <TrendingDown className="w-2 h-2 sm:w-3 sm:h-3" />
                        )}
                        <span className="text-xs">{balanceChange.value}%</span>
                      </div>
                    </div>
                    <div className="text-sm sm:text-base md:text-lg font-semibold">
                      {closingBalanceUsd !== null 
                        ? formatPossiblyConvertedCurrency(closingBalanceUsd)
                        : `₦${snapshot.closing_balance.toLocaleString()}`
                      }
                    </div>
                  </div>

                  {/* Income */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm text-muted-foreground">Income</span>
                      <div className={`flex items-center gap-1 text-xs ${
                        incomeChange.isNeutral 
                          ? 'text-gray-500' 
                          : incomeChange.isPositive 
                            ? 'text-emerald-600' 
                            : 'text-red-600'
                      }`}>
                        {incomeChange.isNeutral ? (
                          <span>-</span>
                        ) : incomeChange.isPositive ? (
                          <TrendingUp className="w-2 h-2 sm:w-3 sm:h-3" />
                        ) : (
                          <TrendingDown className="w-2 h-2 sm:w-3 sm:h-3" />
                        )}
                        <span className="text-xs">{incomeChange.value}%</span>
                      </div>
                    </div>
                    <div className="text-sm sm:text-base font-medium text-emerald-600">
                      {totalIncomeUsd !== null 
                        ? formatPossiblyConvertedCurrency(totalIncomeUsd)
                        : `₦${snapshot.total_income.toLocaleString()}`
                      }
                    </div>
                  </div>

                  {/* Expenses */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm text-muted-foreground">Expenses</span>
                      <div className={`flex items-center gap-1 text-xs ${
                        expenseChange.isNeutral 
                          ? 'text-gray-500' 
                          : expenseChange.isPositive 
                            ? 'text-red-600' 
                            : 'text-emerald-600'
                      }`}>
                        {expenseChange.isNeutral ? (
                          <span>-</span>
                        ) : expenseChange.isPositive ? (
                          <TrendingUp className="w-2 h-2 sm:w-3 sm:h-3" />
                        ) : (
                          <TrendingDown className="w-2 h-2 sm:w-3 sm:h-3" />
                        )}
                        <span className="text-xs">{expenseChange.value}%</span>
                      </div>
                    </div>
                    <div className="text-sm sm:text-base font-medium text-red-600">
                      {totalExpensesUsd !== null 
                        ? formatPossiblyConvertedCurrency(totalExpensesUsd)
                        : `₦${snapshot.total_expenses.toLocaleString()}`
                      }
                    </div>
                  </div>

                  {/* Transaction Count */}
                  <div className="space-y-1">
                    <span className="text-xs sm:text-sm text-muted-foreground">Transactions</span>
                    <div className="text-sm sm:text-base md:text-lg font-medium">{snapshot.transaction_count}</div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {snapshots.length > monthsToShow && (
          <div className="text-center mt-4 text-sm text-muted-foreground">
            Showing {Math.min(monthsToShow, snapshots.length)} of {snapshots.length} completed months
            {currentIndex > 0 && ` (${currentIndex + 1}-${Math.min(currentIndex + monthsToShow, snapshots.length)})`}
          </div>
        )}
        
        {/* Summary Section */}
        {snapshots.length > 1 && (
          <div className="mt-6 md:mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 p-4 md:p-6 bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className="text-xs sm:text-sm text-muted-foreground">Completed Months</div>
              <div className="text-lg sm:text-xl md:text-2xl font-bold">{snapshots.length}</div>
            </div>
            
            <div className="text-center">
              <div className="text-xs sm:text-sm text-muted-foreground">Avg Income</div>
              <div className="text-base sm:text-lg md:text-xl font-bold text-emerald-600">
                {(() => {
                  const avgIncome = snapshots.length > 0 
                    ? snapshots.reduce((sum, s) => sum + s.total_income, 0) / snapshots.length
                    : 0;
                  const avgIncomeUsd = convertNgnToUsd(avgIncome);
                  return avgIncomeUsd !== null 
                    ? formatPossiblyConvertedCurrency(avgIncomeUsd)
                    : `₦${Math.round(avgIncome).toLocaleString()}`;
                })()}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-xs sm:text-sm text-muted-foreground">Avg Expenses</div>
              <div className="text-base sm:text-lg md:text-xl font-bold text-red-600">
                {(() => {
                  const avgExpenses = snapshots.length > 0 
                    ? snapshots.reduce((sum, s) => sum + s.total_expenses, 0) / snapshots.length
                    : 0;
                  const avgExpensesUsd = convertNgnToUsd(avgExpenses);
                  return avgExpensesUsd !== null 
                    ? formatPossiblyConvertedCurrency(avgExpensesUsd)
                    : `₦${Math.round(avgExpenses).toLocaleString()}`;
                })()}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-xs sm:text-sm text-muted-foreground">Total Transactions</div>
              <div className="text-lg sm:text-xl md:text-2xl font-bold">{snapshots.reduce((sum, s) => sum + s.transaction_count, 0)}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MonthlyHistoryViewer; 