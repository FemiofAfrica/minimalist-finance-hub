import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Target, Calendar, TrendingUp } from "lucide-react";
import MonthlyHistoryViewer from "@/components/dashboard/MonthlyHistoryViewer";
import { hasMultipleMonthsOfData } from "@/services/monthlySnapshotService";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

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
      <div className="container mx-auto px-4 py-6 md:py-8">
        {hasMultipleMonths ? (
          <div className="space-y-6 md:space-y-8">
            <MonthlyHistoryViewer />
            
            {/* Future Reports Section */}
            <Card className="p-6 md:p-8 text-center">
              <h3 className="text-lg font-semibold mb-2 md:mb-4">More Reports Coming Soon!</h3>
              <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">
                We're working on additional comprehensive financial reports and analytics.
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Have suggestions for reports you'd like to see?{' '}
                <a 
                  href="mailto:hello@kpege.com?subject=Report%20Suggestions" 
                  className="text-green-600 hover:text-green-700 underline"
                >
                  Send them to hello@kpege.com
                </a>
              </p>
            </Card>
          </div>
        ) : (
          <Card className="p-6 md:p-8 text-center">
            <div className="max-w-md mx-auto">
              <Calendar className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 md:mb-6 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2 md:mb-4">No Historical Data Yet</h3>
              <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">
                You need at least one completed month of transactions to view historical reports. 
                Current month data is available on your Dashboard.
              </p>
              <div className="space-y-3">
                <Link to="/dashboard">
                  <Button className="w-full sm:w-auto text-sm md:text-base">
                    View Current Month Data
                  </Button>
                </Link>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Come back after you've completed your first month!
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Reports;