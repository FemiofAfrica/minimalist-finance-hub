
import { useEffect, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, subDays, format } from "date-fns";

type DataPoint = {
  date: string;
  revenue: number;
};

const RevenueChart = ({ timeRange = 7 }: { timeRange?: number }) => {
  const [data, setData] = useState<DataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRevenueData = async () => {
      setIsLoading(true);
      try {
        const today = startOfDay(new Date());
        const startDate = subDays(today, timeRange);
        
        // Fetch income transactions for the specified period
        const { data: transactions, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('category_type', 'INCOME')
          .gte('date', startDate.toISOString())
          .order('date', { ascending: true });

        if (error) throw error;

        // Create a mapping of dates to aggregated revenue values
        const revenueByDate = new Map<string, number>();
        
        // Initialize with zero values for all days in the range
        for (let i = 0; i < timeRange; i++) {
          const date = subDays(today, i);
          const formattedDate = format(date, 'MMM dd');
          revenueByDate.set(formattedDate, 0);
        }
        
        // Aggregate transaction amounts by date
        transactions?.forEach(transaction => {
          const transactionDate = new Date(transaction.date);
          const formattedDate = format(transactionDate, 'MMM dd');
          
          const currentRevenue = revenueByDate.get(formattedDate) || 0;
          revenueByDate.set(formattedDate, currentRevenue + Number(transaction.amount));
        });
        
        // Convert the map to an array suitable for the chart
        const chartData = Array.from(revenueByDate.entries())
          .map(([date, revenue]) => ({ date, revenue }))
          .sort((a, b) => {
            // Sort by date to ensure proper chronological order
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateA.getTime() - dateB.getTime();
          });
        
        setData(chartData);
      } catch (error) {
        console.error("Error fetching revenue data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRevenueData();
  }, [timeRange]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <p className="text-muted-foreground">Loading chart data...</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <XAxis
          dataKey="date"
          stroke="#94a3b8"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#94a3b8"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${value}`}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                      <span className="text-[0.70rem] uppercase text-muted-foreground">
                        Revenue
                      </span>
                      <span className="font-bold text-muted-foreground">
                        ${payload[0].value}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="#2563eb"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default RevenueChart;
