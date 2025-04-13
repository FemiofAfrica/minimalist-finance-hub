/**
 * Example Express API endpoint for dashboard analytics
 * This demonstrates how to convert a Remix loader to an Express API endpoint
 */

// Express route handler
app.get('/api/dashboard-analytics', async (req, res) => {
  try {
    const userId = req.query.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }
    
    // Get current and previous month date ranges
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();
    
    // Fetch current month transactions
    const { data: currentMonthTransactions, error: currentError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', currentMonthStart)
      .lte('date', currentMonthEnd);
      
    if (currentError) throw currentError;
    
    // Fetch previous month transactions for comparison
    const { data: prevMonthTransactions, error: prevError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', previousMonthStart)
      .lte('date', previousMonthEnd);
      
    if (prevError) throw prevError;
    
    // Calculate current month totals
    const totalIncome = currentMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
      
    const totalExpense = currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
    
    // Calculate previous month totals
    const prevTotalIncome = prevMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
      
    const prevTotalExpense = prevMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
    
    // Fetch account balances
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('balance')
      .eq('user_id', userId);
      
    if (accountsError) throw accountsError;
    
    // Calculate total balance
    const totalBalance = accounts.reduce((sum, account) => sum + Number(account.balance), 0);
    
    // Calculate percentage changes
    const incomeChange = prevTotalIncome === 0 ? 100 : ((totalIncome - prevTotalIncome) / prevTotalIncome) * 100;
    const expenseChange = prevTotalExpense === 0 ? 100 : ((totalExpense - prevTotalExpense) / prevTotalExpense) * 100;
    const balanceChange = (totalIncome - totalExpense) - (prevTotalIncome - prevTotalExpense);
    
    // Return dashboard analytics data
    res.json({
      totalBalance,
      totalIncome,
      totalExpense,
      monthlyTransactionCount: currentMonthTransactions.length,
      incomeChange,
      expenseChange,
      balanceChange
    });
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard analytics' });
  }
});

/**
 * Corresponding frontend service update
 * This shows how to update the dashboardService.ts file to use the new API endpoint
 */

/*
import axios from 'axios';

export type DashboardAnalytics = {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  monthlyTransactionCount: number;
  incomeChange: number;
  expenseChange: number;
  balanceChange: number;
};

export const fetchDashboardAnalytics = async (userId: string): Promise<DashboardAnalytics> => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const response = await axios.get('/api/dashboard-analytics', {
      params: { userId }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    // Return default values in case of error
    return {
      totalBalance: 0,
      totalIncome: 0,
      totalExpense: 0,
      monthlyTransactionCount: 0,
      incomeChange: 0,
      expenseChange: 0,
      balanceChange: 0
    };
  }
};
*/