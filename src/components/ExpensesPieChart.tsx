
import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { useCurrency, formatCurrency } from '@/contexts/CurrencyContext';

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

const ExpensesPieChart = () => {
  const [loading, setLoading] = useState(true);
  const [expensesByCategory, setExpensesByCategory] = useState<ExpenseCategory[]>([]);

  const fetchCategoryExpenses = async () => {
    try {
      setLoading(true);
      
      // Fetch transactions that are expenses from Supabase
      const { data, error } = await supabase
        .from('transactions')
        .select('amount, category_name, category_type')
        .eq('category_type', 'EXPENSE');
        
      if (error) {
        console.error('Error fetching expense data:', error);
        return;
      }
      
      // Process data to aggregate expenses by category
      const categoryMap = new Map<string, number>();
      
      data?.forEach(transaction => {
        const categoryName = transaction.category_name || 'Uncategorized';
        const amount = Number(transaction.amount);
        
        if (!isNaN(amount)) {
          const currentTotal = categoryMap.get(categoryName) || 0;
          categoryMap.set(categoryName, currentTotal + amount);
        }
      });
      
      // Convert map to array format needed for Recharts
      const chartData: ExpenseCategory[] = Array.from(categoryMap.entries())
        .map(([name, value], index) => ({
          name,
          value,
          color: COLORS[index % COLORS.length]
        }))
        .sort((a, b) => b.value - a.value); // Sort by amount (descending)
      
      setExpensesByCategory(chartData);
    } catch (err) {
      console.error('Error processing expense data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategoryExpenses();
    
    // Listen for refresh events from the transaction table
    const handleRefresh = () => {
      fetchCategoryExpenses();
    };
    
    document.addEventListener('refresh', handleRefresh);
    
    return () => {
      document.removeEventListener('refresh', handleRefresh);
    };
  }, []);

  const { currentCurrency } = useCurrency();

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
          formatter={(value: number) => formatCurrency(value, currentCurrency)}
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
            return `${value}: ${formatCurrency(payload?.value || 0, currentCurrency)}`;
          }}
          iconType="circle"
          iconSize={8}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default ExpensesPieChart;

