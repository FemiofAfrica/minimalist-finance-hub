import { useEffect, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useCurrency } from "@/contexts/CurrencyContext";
import { format } from "date-fns";
import { fetchRevenueData, RevenueChartData as FetchedRevenueData } from "@/services/revenueChartService";

export type TimePeriod = "7days" | "30days" | "90days";

interface RevenueChartDataPoint {
  date: string;
  revenue: number;
}

interface RevenueChartProps {
  period: TimePeriod;
}

const PROPS_BASE_CURRENCY = "NGN";

const RevenueChart = ({ period }: RevenueChartProps) => {
  const [data, setData] = useState<RevenueChartDataPoint[]>([]);
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
        const fetchedData: FetchedRevenueData[] = await fetchRevenueData(period);
        
        const chartData: RevenueChartDataPoint[] = fetchedData.map(item => ({
          date: item.month,
          revenue: item.revenue
        }));

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
              const pointData = payload[0].payload as RevenueChartDataPoint;
              const valueNgn = pointData.revenue;
              const valueUsd = convertNgnToUsd(valueNgn);

              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <div className="grid grid-cols-1 gap-1">
                    <div className="flex flex-col">
                      <span className="text-[0.70rem] uppercase text-muted-foreground">
                        Revenue ({pointData.date})
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
