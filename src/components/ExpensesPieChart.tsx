import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Loader2 } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { fetchCategoryExpenses } from '@/services/dashboardService';
import { supabase } from '@/integrations/supabase/client';

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
  userId: string;
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
      // Return null or handle error/loading state appropriately if rates aren't ready
      // console.warn(`Rate for ${PROPS_BASE_CURRENCY} not available for conversion in pie chart.`);
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
      
      // Remove the supabase.auth.getUser() call here
      // const { data: { user } } = await supabase.auth.getUser();
      // const localUserId = user?.id; // No longer needed
      // if (!localUserId) { ... } // This check is removed

      // Use the userId prop directly
      console.log(`Fetching category expenses for user (from prop): ${userId}`);
      const chartData = await fetchCategoryExpenses(userId); // Use the prop
      
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
  }, [userId]); // Add userId as a dependency

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (expensesByCategory.length === 0) {
    return (
      <div className="h-full flex items-center justify-center flex-col">
        <p className="text-muted-foreground text-center">No expense data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <Pie
          data={expensesByCategory}
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
          {expensesByCategory.map((entry, index) => (
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
            // Calculate total expenses for percentage calculation
            const totalExpenses = expensesByCategory.reduce((sum, category) => sum + category.value, 0);
            // Calculate percentage for this category
            const percentage = totalExpenses > 0 ? (payload?.value / totalExpenses) * 100 : 0;
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

export default ExpensesPieChart;

