import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useCurrency } from '@/contexts/CurrencyContext';
import { fetchCategoryIncome } from '@/services/dashboardService';

type IncomeCategory = {
  name: string;
  value: number;
  color: string;
};

// Color palette for the pie chart - using blue/green colors for income
const COLORS = [
  '#2ECC71', '#3498DB', '#1ABC9C', '#2980B9', '#27AE60',
  '#16A085', '#0E6655', '#1F618D', '#154360', '#0B5345',
  '#186A3B', '#21618C', '#1A5276', '#117A65', '#0E6251'
];

// Define the original base currency of the incoming chart data
const PROPS_BASE_CURRENCY = "NGN";

const IncomePieChart = () => {
  const [loading, setLoading] = useState(true);
  const [incomeByCategory, setIncomeByCategory] = useState<IncomeCategory[]>([]);
  // Get necessary values from context
  const { formatPossiblyConvertedCurrency, exchangeRates } = useCurrency(); 

  // Helper function to convert NGN prop amount to USD base amount
  const convertNgnToUsd = (amountNgn: number): number | null => {
      const ngnRate = exchangeRates?.[PROPS_BASE_CURRENCY];
      // Check if rates are loaded and the NGN rate is valid
      if (ngnRate && typeof ngnRate === 'number' && ngnRate > 0) {
          return amountNgn / ngnRate;
      }
      return null; // Indicate conversion failure
  };

  useEffect(() => {
    loadCategoryIncome();
    
    const handleRefresh = () => {
      loadCategoryIncome();
    };
    
    document.addEventListener('refresh-transactions', handleRefresh);
    
    return () => {
      document.removeEventListener('refresh-transactions', handleRefresh);
    };
  }, []);

  const loadCategoryIncome = async () => {
    try {
      setLoading(true);
      
      // Use the centralized service to fetch category income
      const chartData = await fetchCategoryIncome();
      
      // Add colors to the data for the pie chart
      const formattedData: IncomeCategory[] = chartData.map((item, index) => ({
        name: item.name,
        value: item.value,
        color: COLORS[index % COLORS.length]
      }));
      
      setIncomeByCategory(formattedData);
    } catch (err) {
      console.error('Error loading income data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center">
        <p className="text-gray-500 mb-2">Loading income data...</p>
      </div>
    );
  }

  if (incomeByCategory.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center">
        <p className="text-gray-500 mb-2">No income data available for this month</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <Pie
          data={incomeByCategory}
          cx={window.innerWidth < 768 ? "50%" : "40%"}
          cy="50%"
          labelLine={false}
          label={false}
          outerRadius={window.innerWidth < 768 ? 70 : 80}
          innerRadius={window.innerWidth < 768 ? 25 : 30}
          fill="#8884d8"
          dataKey="value"
          paddingAngle={2}
        >
          {incomeByCategory.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(valueNgn: number) => { 
              const valueUsd = convertNgnToUsd(valueNgn);
              // Return formatted value or placeholder if conversion fails
              return valueUsd !== null ? formatPossiblyConvertedCurrency(valueUsd) : "N/A"; 
          }}
          contentStyle={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.95)', 
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            border: 'none'
          }}
        />
        <Legend 
          layout={window.innerWidth < 768 ? "horizontal" : "vertical"}
          verticalAlign={window.innerWidth < 768 ? "bottom" : "middle"}
          align={window.innerWidth < 768 ? "center" : "right"}
          wrapperStyle={{
            paddingLeft: window.innerWidth < 768 ? "0" : "30px",
            fontSize: "12px",
            right: 0,
            width: window.innerWidth < 768 ? "100%" : "40%",
            paddingTop: window.innerWidth < 768 ? "20px" : "0"
          }}
          formatter={(value, entry, index) => {
            const { payload } = entry as any;
            // Calculate total income for percentage calculation
            const totalIncome = incomeByCategory.reduce((sum, category) => sum + category.value, 0);
            // Calculate percentage for this category
            const percentage = totalIncome > 0 ? (payload?.value / totalIncome) * 100 : 0;
            // Format to 1 decimal place
            return `${value}: ${percentage.toFixed(1)}%`;
          }}
          iconType="circle"
          iconSize={8}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default IncomePieChart; 