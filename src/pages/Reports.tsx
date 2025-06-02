import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Target, Calendar, TrendingUp } from "lucide-react";
import MonthlyHistoryViewer from "@/components/dashboard/MonthlyHistoryViewer";
import { hasMultipleMonthsOfData } from "@/services/monthlySnapshotService";
import { Skeleton } from "@/components/ui/skeleton";

const Reports = () => {
  const [hasMultipleMonths, setHasMultipleMonths] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        <div className="flex flex-col gap-8 container mx-auto px-4 pb-8 max-w-7xl">
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8 container mx-auto px-4 pb-8 max-w-7xl">
        {hasMultipleMonths ? (
          <div className="space-y-8">
            {/* Monthly History Section */}
            <div className="space-y-4">
              <p className="text-muted-foreground">
                View your financial performance across different months with detailed breakdowns and trends.
              </p>
              <MonthlyHistoryViewer />
            </div>

            {/* Future Reports Section */}
            <Card className="flex flex-col items-center justify-center p-12 text-center">
              <TrendingUp className="w-16 h-16 text-primary mb-6" />
              <h2 className="text-2xl font-semibold mb-4">More Reports Coming Soon!</h2>
              <p className="text-muted-foreground max-w-md">
                We're working on additional comprehensive financial reports and analytics.
                Stay tuned for more powerful insights into your financial journey.
              </p>
            </Card>
          </div>
        ) : (
          <Card className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
            <Target className="w-16 h-16 text-primary mb-6" />
            <h2 className="text-2xl font-semibold mb-4">Build Your Financial History</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              To unlock detailed reports and historical insights, you need to have transaction data 
              spanning multiple months. Start adding transactions to your account, and come back 
              next month to see your financial trends!
            </p>
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">Reports become available when you have:</p>
              <ul className="text-left max-w-xs mx-auto space-y-1">
                <li>• Transactions from at least 2 different months</li>
                <li>• Consistent financial activity tracking</li>
                <li>• Monthly balance history</li>
              </ul>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Reports;