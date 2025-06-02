import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { getMonthlySnapshots, MonthlySnapshot, initializeSnapshotsForExistingData } from '@/services/monthlySnapshotService';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

const MonthlyHistoryViewer = () => {
  const [snapshots, setSnapshots] = useState<MonthlySnapshot[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
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
      
      // Then fetch the snapshots (get more than 3 to allow navigation)
      const data = await getMonthlySnapshots(12);
      setSnapshots(data);
      
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
  }, []);

  const handleRefresh = () => {
    fetchSnapshots(true);
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

  const goToPrevious = () => {
    if (currentIndex < snapshots.length - 3) {
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
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Monthly History
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Updating...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-muted-foreground mb-4">
              No historical data available yet. This could mean:
            </div>
            <ul className="text-sm text-muted-foreground mb-6 text-left max-w-md mx-auto">
              <li>• You haven't added transactions yet</li>
              <li>• Monthly snapshots need to be generated</li>
              <li>• Data is still being processed</li>
            </ul>
            <Button onClick={handleRefresh} disabled={isRefreshing}>
              {isRefreshing ? 'Processing...' : 'Generate Monthly History'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show exactly 3 months at a time
  const visibleSnapshots = snapshots.slice(currentIndex, currentIndex + 3);
  const hasNext = currentIndex > 0;
  const hasPrevious = currentIndex < snapshots.length - 3;

  return (
    <Card className="p-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Monthly History
            <span className="text-sm font-normal text-muted-foreground">
              (Last {Math.min(snapshots.length, 3)} months)
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Updating...' : 'Refresh'}
            </Button>
            {snapshots.length > 3 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPrevious}
                  disabled={!hasPrevious}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNext}
                  disabled={!hasNext}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            const isCurrentMonth = () => {
              const now = new Date();
              return snapshot.year === now.getFullYear() && snapshot.month === (now.getMonth() + 1);
            };

            return (
              <Card 
                key={snapshot.snapshot_id} 
                className={`border-2 hover:shadow-md transition-shadow ${
                  isCurrentMonth() ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
                }`}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>{getMonthName(snapshot.month)} {snapshot.year}</span>
                    {isCurrentMonth() && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        Current
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Closing Balance */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {isCurrentMonth() ? 'Current Balance' : 'Final Balance'}
                      </span>
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
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {balanceChange.value}%
                      </div>
                    </div>
                    <div className="text-lg font-semibold">
                      {closingBalanceUsd !== null 
                        ? formatPossiblyConvertedCurrency(closingBalanceUsd)
                        : `₦${snapshot.closing_balance.toLocaleString()}`
                      }
                    </div>
                  </div>

                  {/* Income */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Income</span>
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
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {incomeChange.value}%
                      </div>
                    </div>
                    <div className="text-emerald-600 font-medium">
                      {totalIncomeUsd !== null 
                        ? formatPossiblyConvertedCurrency(totalIncomeUsd)
                        : `₦${snapshot.total_income.toLocaleString()}`
                      }
                    </div>
                  </div>

                  {/* Expenses */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Expenses</span>
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
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {expenseChange.value}%
                      </div>
                    </div>
                    <div className="text-red-600 font-medium">
                      {totalExpensesUsd !== null 
                        ? formatPossiblyConvertedCurrency(totalExpensesUsd)
                        : `₦${snapshot.total_expenses.toLocaleString()}`
                      }
                    </div>
                  </div>

                  {/* Transaction Count */}
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">Transactions</span>
                    <div className="text-lg font-medium">{snapshot.transaction_count}</div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {snapshots.length > 3 && (
          <div className="text-center mt-4 text-sm text-muted-foreground">
            Showing {Math.min(3, snapshots.length)} of {snapshots.length} months
            {currentIndex > 0 && ` (${currentIndex + 1}-${Math.min(currentIndex + 3, snapshots.length)})`}
          </div>
        )}
        
        {/* Summary stats */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-sm text-muted-foreground">Total Months</div>
              <div className="text-lg font-semibold">{snapshots.length}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Avg Income</div>
              <div className="text-lg font-semibold text-emerald-600">
                {snapshots.length > 0 
                  ? `₦${Math.round(snapshots.reduce((sum, s) => sum + s.total_income, 0) / snapshots.length).toLocaleString()}`
                  : '₦0'
                }
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Avg Expenses</div>
              <div className="text-lg font-semibold text-red-600">
                {snapshots.length > 0 
                  ? `₦${Math.round(snapshots.reduce((sum, s) => sum + s.total_expenses, 0) / snapshots.length).toLocaleString()}`
                  : '₦0'
                }
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Transactions</div>
              <div className="text-lg font-semibold">
                {snapshots.reduce((sum, s) => sum + s.transaction_count, 0)}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthlyHistoryViewer; 