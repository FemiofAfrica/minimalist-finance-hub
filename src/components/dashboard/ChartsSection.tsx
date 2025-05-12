import { useState } from "react";
import { Card } from "@/components/ui/card";
import RevenueChart from "@/components/RevenueChart";
import ExpensesPieChart from "@/components/ExpensesPieChart";
import IncomePieChart from "@/components/IncomePieChart";
import { TimePeriod } from "@/services/revenueChartService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ChartsSection = () => {
  const [period, setPeriod] = useState<TimePeriod>("7days");

  const handlePeriodChange = (value: string) => {
    setPeriod(value as TimePeriod);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:h-[600px]">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Income by Category</h3>
        </div>
        <div className="h-[300px] w-full flex items-center justify-center">
          <IncomePieChart />
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Expenses by Category</h3>
        </div>
        <div className="h-[300px] w-full flex items-center justify-center">
          <ExpensesPieChart />
        </div>
      </Card>
    </div>
  );
};

export default ChartsSection;
