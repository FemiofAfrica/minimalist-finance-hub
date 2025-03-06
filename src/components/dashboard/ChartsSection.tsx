
import { Card } from "@/components/ui/card";
import RevenueChart from "@/components/RevenueChart";
import ExpensesPieChart from "@/components/ExpensesPieChart";

const ChartsSection = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
      <Card className="lg:col-span-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Revenue Overview</h3>
          <select className="px-3 py-2 border rounded-lg text-sm bg-transparent">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
          </select>
        </div>
        <RevenueChart />
      </Card>

      <Card className="lg:col-span-2 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Expenses by Category</h3>
        </div>
        <div className="h-[300px] flex items-center justify-center">
          <ExpensesPieChart />
        </div>
      </Card>
    </div>
  );
};

export default ChartsSection;
