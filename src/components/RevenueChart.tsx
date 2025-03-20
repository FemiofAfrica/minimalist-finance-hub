
import { useEffect, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency, formatCurrency } from "@/contexts/CurrencyContext";
import { format } from "date-fns";
import { Transaction } from "@/types/transaction";

export type TimePeriod = "7days" | "30days" | "90days";

interface BalanceChartData {
  date: string;
  balance: number;
}

interface RevenueChartProps {
  period: TimePeriod;
}

const RevenueChart = ({ period }: RevenueChartProps) => {
  const [data, setData] = useState<BalanceChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentCurrency } = useCurrency();

  useEffect(() => {
    const fetchBalanceData = async () => {
      setLoading(true);
      try {
        const now = new Date();
        let startDate = new Date();

        if (period === "7days") {
          startDate.setDate(now.getDate() - 7);
        } else if (period === "30days") {
          startDate.setDate(now.getDate() - 30);
        } else if (period === "90days") {
          startDate.setDate(now.getDate() - 90);
        }

        const { data: transactions, error } = await supabase
          .from('transactions')
          .select('*')
          .gte('date', startDate.toISOString())
          .order('date', { ascending: true });

        if (error) throw error;

        const dailyBalances = new Map<string, number>();
        let runningBalance = 0;

        transactions?.forEach((transaction: Transaction) => {
          const date = format(new Date(transaction.date), 'MMM d');
          const amount = Number(transaction.amount);
          
          if (transaction.category_type === 'INCOME') {
            runningBalance += amount;
          } else if (transaction.category_type === 'EXPENSE') {
            runningBalance -= amount;
          }

          dailyBalances.set(date, runningBalance);
        });

        const chartData: BalanceChartData[] = Array.from(dailyBalances.entries())
          .map(([date, balance]) => ({
            date,
            balance
          }));

        setData(chartData);
      } catch (error) {
        console.error("Failed to load balance data:", error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBalanceData();
  }, [period]);

  if (loading) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <p className="text-gray-500">Loading data...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <p className="text-gray-500">No balance data available for this period</p>
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
          tickFormatter={(value) => formatCurrency(value, currentCurrency)}
        />
        <Tooltip
          content={({ active, payload }: { active?: boolean; payload?: Array<{ value: string | number }> }) => {
            if (active && payload && payload.length) {
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                      <span className="text-[0.70rem] uppercase text-muted-foreground">
                        Balance
                      </span>
                      <span className="font-bold text-muted-foreground">
                        {formatCurrency(Number(payload[0].value), currentCurrency)}
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
          dataKey="balance"
          stroke="hsl(151, 55%, 41.5%)"
          strokeWidth={2}
          dot={false}
          activeDot={{
            r: 4,
            style: { fill: "hsl(151, 55%, 41.5%)", strokeWidth: 0 }
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default RevenueChart;
