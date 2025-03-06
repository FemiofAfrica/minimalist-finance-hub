
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import RevenueChart from "@/components/RevenueChart";
import ExpensesPieChart from "@/components/ExpensesPieChart";

const ChartsSection = () => {
  const [timeRange, setTimeRange] = useState("7");
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
      <Card className="lg:col-span-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Revenue Overview</h3>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <RevenueChart timeRange={parseInt(timeRange)} />
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
