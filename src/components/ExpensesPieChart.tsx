import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Loader2 } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { fetchCategoryExpenses } from '@/services/dashboardService.axios';

type ExpenseCategory = {
  name: string;
  value: number;
  color: string;
};

// Color palette for the pie chart - more harmonious colors
const COLORS = [
  '#3498DB', '#2ECC71', '#F1C40F', '#E74C3C', '#9B59B6', 
  '#1ABC9C', '#F39C12', '#D35400', '#8E44AD', '#2980B9',
  '#27AE60', '#E67E22', '#C0392B', '#16A085', '#7D3C98'
];

// Define the original base currency of the incoming chart data
const PROPS_BASE_CURRENCY = "NGN";

// Add userId prop to the component's props type
interface ExpensesPieChartProps {
  startDate: string;
  endDate: string;
}

const ExpensesPieChart: React.FC<ExpensesPieChartProps> = ({ userId }) => {
  const [loading, setLoading] = useState(true);
  const [expensesByCategory, setExpensesByCategory] = useState<ExpenseCategory[]>([]);
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

  const loadCategoryExpenses = async () => {
    // Check if userId prop is valid before fetching
    if (!userId) {
        console.error('UserId prop is missing, cannot fetch expenses.');
        setLoading(false);
        return;
    }
    try {
      setLoading(true);
      
      console.log(`Fetching category expenses for user: ${userId}`);
      const chartData = await fetchCategoryExpenses(userId);
      
      // Add colors to the data for the pie chart
      const formattedData: ExpenseCategory[] = chartData.map((item, index) => ({
        name: item.name,
        value: item.value,
        color: COLORS[index % COLORS.length]
      }));
      
      setExpensesByCategory(formattedData);
    } catch (err) {
      console.error('Error loading expense data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only load if userId is available
    if (userId) {
        loadCategoryExpenses();
    } else {
        // Handle the case where userId is initially null/undefined if necessary
        console.warn("ExpensesPieChart mounted without a userId.");
        setLoading(false); // Avoid infinite loading state
    }
    
    // Listen for refresh events from the transaction table
    const handleRefresh = () => {
      loadCategoryExpenses();
    };
    
    // Listen for both refresh and refresh-transactions events
    document.addEventListener('refresh', handleRefresh);
    document.addEventListener('refresh-transactions', handleRefresh);
    
    return () => {
      document.removeEventListener('refresh', handleRefresh);
      document.removeEventListener('refresh-transactions', handleRefresh);
    };
  }, [userId]);

  // Custom tooltip formatter that applies currency conversion
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const valueUsd = convertNgnToUsd(data.value);
      const formattedValue = valueUsd !== null 
        ? formatPossiblyConvertedCurrency(valueUsd)
        : `${data.value} NGN`; // Fallback if conversion fails
      
      return (
        <div className="bg-white p-2 border border-gray-200 rounded shadow-sm">
          <p className="font-medium">{data.name}</p>
          <p>{formattedValue}</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (expensesByCategory.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <p className="text-gray-500">No expense data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={expensesByCategory}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {expensesByCategory.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default ExpensesPieChart;