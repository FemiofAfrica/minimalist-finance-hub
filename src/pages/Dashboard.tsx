import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import StatCardsSection from '@/components/dashboard/StatCardsSection';
import ChartsSection from '@/components/dashboard/ChartsSection';
import TransactionsSection from '@/components/dashboard/TransactionsSection';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import TransactionInput from '@/components/dashboard/TransactionInput';
import TransactionsTable from '@/components/TransactionsTable';
import IncomePieChart from '@/components/IncomePieChart';
import ExpensesPieChart from '@/components/ExpensesPieChart';

const Dashboard = () => {
  const [totalBalance, setTotalBalance] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [monthlyTransactionCount, setMonthlyTransactionCount] = useState(0);
  const [balanceChange, setBalanceChange] = useState(0);
  const [incomeChange, setIncomeChange] = useState(0);
  const [expenseChange, setExpenseChange] = useState(0);
  const [transactionCountChange, setTransactionCountChange] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch transactions for calculations
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        throw error;
      }

      // Calculate totals
      let income = 0;
      let expense = 0;
      let currentMonthCount = 0;

      // Get current month and previous month dates
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

      // Previous month stats for comparison
      let prevMonthIncome = 0;
      let prevMonthExpense = 0;
      let prevMonthCount = 0;

      if (transactions) {
        transactions.forEach(transaction => {
          const transDate = new Date(transaction.date);
          
          // Current month calculations
          if (transaction.date >= currentMonthStart) {
            if (transaction.type === 'income') {
              income += Number(transaction.amount);
            } else if (transaction.type === 'expense') {
              expense += Math.abs(Number(transaction.amount));
            }
            currentMonthCount++;
          }
          
          // Previous month calculations
          if (transaction.date >= previousMonthStart && transaction.date <= previousMonthEnd) {
            if (transaction.type === 'income') {
              prevMonthIncome += Number(transaction.amount);
            } else if (transaction.type === 'expense') {
              prevMonthExpense += Math.abs(Number(transaction.amount));
            }
            prevMonthCount++;
          }
        });
      }

      // Calculate balance
      const balance = income - expense;
      const prevBalance = prevMonthIncome - prevMonthExpense;

      // Calculate percentage changes
      const calcPercentChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      setTotalBalance(balance);
      setTotalIncome(income);
      setTotalExpense(expense);
      setMonthlyTransactionCount(currentMonthCount);
      
      setBalanceChange(calcPercentChange(balance, prevBalance));
      setIncomeChange(calcPercentChange(income, prevMonthIncome));
      setExpenseChange(calcPercentChange(expense, prevMonthExpense));
      setTransactionCountChange(calcPercentChange(currentMonthCount, prevMonthCount));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDashboardData();
    
    // Set up refresh event listener
    const handleRefresh = () => {
      console.log("Refresh event triggered in Dashboard page");
      fetchDashboardData();
    };

    document.addEventListener('refresh', handleRefresh);
    return () => {
      document.removeEventListener('refresh', handleRefresh);
    };
  }, [fetchDashboardData]);

  const handleTransactionAdded = () => {
    // Trigger a refresh to update dashboard data
    document.dispatchEvent(new Event('refresh'));
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 pb-8 max-w-7xl">
        <div className="grid grid-cols-1 gap-6 mb-6">
          <StatCardsSection
            totalBalance={totalBalance}
            totalIncome={totalIncome}
            totalExpense={totalExpense}
            monthlyTransactionCount={monthlyTransactionCount}
            balanceChange={balanceChange}
            incomeChange={incomeChange}
            expenseChange={expenseChange}
            transactionCountChange={transactionCountChange}
            isLoading={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 mb-6">
          <TransactionInput onTransactionAdded={handleTransactionAdded} />
        </div>

        <div className="grid grid-cols-1 gap-6 mb-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Recent Transactions</h3>
              <Link 
                to="/transactions"
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
              >
                View All Transactions
              </Link>
            </div>
            <div className="overflow-auto">
              <TransactionsTable limit={10} />
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 mb-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-center w-full">Income by Category</h3>
            </div>
            <div className="h-[300px] w-full flex items-center justify-center">
              <IncomePieChart />
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 mb-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-center w-full">Expenses by Category</h3>
            </div>
            <div className="h-[300px] w-full flex items-center justify-center">
              <ExpensesPieChart />
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard; 