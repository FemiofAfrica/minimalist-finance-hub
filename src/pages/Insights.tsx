import { Target } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

const Insights = () => {
  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="mb-6">
          <Target className="w-12 h-12 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold mb-4">Coming Soon!</h2>
          <p className="text-muted-foreground max-w-md">
            We're working hard to bring you comprehensive financial insights and analytics.
            Stay tuned for powerful insights into your financial journey.
          </p>
          <p className="text-muted-foreground max-w-md mt-4 text-sm">
            Let us know what insights you want from your financial life. Email us at phermmodynamic@gmail.com
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Insights; 