import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, ChartOptions } from 'chart.js';
import { PieChart as RechartsPieChart, ResponsiveContainer } from 'recharts';

ChartJS.register(ArcElement, Tooltip, Legend);

interface ExpensesPieChartProps {
  startDate: string;
  endDate: string;
}

const ExpensesPieChart = ({ startDate, endDate }: ExpensesPieChartProps) => {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: [],
        borderWidth: 0,
      },
    ],
  });

  const chartOptions: ChartOptions<"pie"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          color: '#64748B',
          font: {
            size: 12,
          },
        },
      },
    },
  };

  useEffect(() => {
    const fetchExpensesData = async () => {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('category_name, amount, category_type')
          .eq('category_type', 'expense')
          .gte('date', startDate)
          .lte('date', endDate);

        if (error) {
          console.error('Error fetching expenses:', error);
          return;
        }

        const categoryAmounts = data.reduce((acc: any, transaction: any) => {
          const { category_name, amount } = transaction;
          acc[category_name] = (acc[category_name] || 0) + amount;
          return acc;
        }, {});

        const labels = Object.keys(categoryAmounts);
        const dataValues = Object.values(categoryAmounts);

        // Generate a dynamic color palette
        const backgroundColors = labels.map((_, index) => {
          const hue = (index * 360) / labels.length; // Distribute hues evenly
          return `hsl(${hue}, 70%, 50%)`; // HSL color with fixed saturation and lightness
        });

        setChartData({
          labels: labels,
          datasets: [
            {
              data: dataValues,
              backgroundColor: backgroundColors,
              borderWidth: 0,
            },
          ],
        });
      } catch (error) {
        console.error('Unexpected error fetching data:', error);
      }
    };

    fetchExpensesData();
  }, [startDate, endDate]);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <RechartsPieChart data={chartData.datasets[0].data} >

      </RechartsPieChart>
    </ResponsiveContainer>
  );
};

export default ExpensesPieChart;
