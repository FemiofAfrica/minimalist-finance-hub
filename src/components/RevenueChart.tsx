import { useEffect, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useCurrency } from "@/contexts/CurrencyContext";
import { format } from "date-fns";
import { fetchRevenueData } from "@/services/revenueChartService";

export type TimePeriod = "7days" | "30days" | "90days";

interface BalanceChartData {
  date: string;
  balance: number;
}

interface RevenueChartProps {
  period: TimePeriod;
}

const PROPS_BASE_CURRENCY = "NGN";

const RevenueChart = ({ period }: RevenueChartProps) => {
  const [data, setData] = useState<BalanceChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const { formatPossiblyConvertedCurrency, exchangeRates } = useCurrency();

  const convertNgnToUsd = (amountNgn: number): number | null => {
    const ngnRate = exchangeRates?.[PROPS_BASE_CURRENCY];
    if (ngnRate && typeof ngnRate === 'number' && ngnRate > 0) {
      return amountNgn / ngnRate;
    }
    return null;
  };

  useEffect(() => {
    const loadRevenueData = async () => {
      setLoading(true);
      try {
        const revenueData = await fetchRevenueData(period);
        
        let runningBalance = 0;
        const chartData: BalanceChartData[] = revenueData.map(item => {
          runningBalance += item.revenue;
          return {
            date: item.month,
            balance: runningBalance
          };
        });

        setData(chartData);
      } catch (error) {
        console.error("Failed to load revenue data:", error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    loadRevenueData();
    
    const handleRefresh = () => {
      loadRevenueData();
    };
    
    document.addEventListener('refresh-transactions', handleRefresh);
    
    return () => {
      document.removeEventListener('refresh-transactions', handleRefresh);
    };
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
          tickFormatter={(valueNgn) => {
            const valueUsd = convertNgnToUsd(valueNgn);
            return valueUsd !== null ? formatPossiblyConvertedCurrency(valueUsd) : "";
          }}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const valueNgn = Number(payload[0].value);
              const valueUsd = convertNgnToUsd(valueNgn);

              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                      <span className="text-[0.70rem] uppercase text-muted-foreground">
                        Balance
                      </span>
                      <span className="font-bold text-muted-foreground">
                        {valueUsd !== null ? formatPossiblyConvertedCurrency(valueUsd) : "N/A"}
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
          stroke="#2563eb"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default RevenueChart;
