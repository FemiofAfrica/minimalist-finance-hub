import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Target } from "lucide-react";

const Reports = () => {
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8 container mx-auto px-4 pb-8 max-w-7xl">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            Get detailed insights into your financial activities.
          </p>
        </div>

        <Card className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
          <Target className="w-16 h-16 text-primary mb-6" />
          <h2 className="text-2xl font-semibold mb-4">Coming Soon!</h2>
          <p className="text-muted-foreground max-w-md">
            We're working hard to bring you comprehensive financial reports and analytics.
            Stay tuned for powerful insights into your financial journey.
          </p>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Reports;