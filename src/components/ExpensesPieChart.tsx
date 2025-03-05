
import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

type ExpenseCategory = {
  name: string;
  value: number;
  color: string;
};

// Color palette for the pie chart
const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A259FF', 
  '#FB6962', '#6DB5FE', '#1E88E5', '#13C2C2', '#8F44AD',
  '#FF6B6B', '#1ABC9C', '#3498DB', '#9B59B6', '#E74C3C'
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

  const formatNaira = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

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
      <PieChart>
        <Pie
          data={expensesByCategory}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {expensesByCategory.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value: number) => formatNaira(value)}
          contentStyle={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.95)', 
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            border: 'none'
          }}
        />
        <Legend 
          layout="vertical" 
          verticalAlign="middle" 
          align="right"
          formatter={(value, entry, index) => {
            const { payload } = entry as any;
            return `${value}: ${formatNaira(payload?.value || 0)}`;
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default ExpensesPieChart;
