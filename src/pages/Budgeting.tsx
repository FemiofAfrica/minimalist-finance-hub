import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, useCurrency } from '@/contexts/CurrencyContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowUpRight, ArrowDownRight, Target, Wallet, PiggyBank, TrendingUp } from 'lucide-react';
import { Transaction } from '@/types/transaction';
import PageLayout from '@/components/dashboard/PageLayout';
import { BudgetingWizard } from '@/components/budgeting/BudgetingWizard';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

type FinancialGoal = {
  id?: string;
  user_id?: string;
  goal_type: string;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  start_date: string;
  target_date: string;
  created_at?: string;
  updated_at?: string;
};

type BudgetCategory = {
  category_name: string;
  allocated_amount: number;
  spent_amount: number;
  percentage: number;
};

type Budget = {
  id?: string;
  user_id?: string;
  month: string;
  year: string; // Changed from number to string to match database schema
  total_income: number;
  total_budget: number;
  categories: BudgetCategory[];
  created_at?: string;
  updated_at?: string;
};

const Budgeting = () => {
  const [showWizard, setShowWizard] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [monthlyIncome, setMonthlyIncome] = useState<number>(0);
  const [financialGoal, setFinancialGoal] = useState<FinancialGoal | null>(null);
  // Add missing state variables for goal management
  const [goalType, setGoalType] = useState<string>('expense_management');
  const [goalName, setGoalName] = useState<string>('');
  const [targetAmount, setTargetAmount] = useState<number>(0);
  const [targetDate, setTargetDate] = useState<string>('');
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([
    { category_name: 'Housing', allocated_amount: 0, spent_amount: 0, percentage: 30 },
    { category_name: 'Transportation', allocated_amount: 0, spent_amount: 0, percentage: 10 },
    { category_name: 'Food', allocated_amount: 0, spent_amount: 0, percentage: 15 },
    { category_name: 'Utilities', allocated_amount: 0, spent_amount: 0, percentage: 10 },
    { category_name: 'Insurance', allocated_amount: 0, spent_amount: 0, percentage: 5 },
    { category_name: 'Healthcare', allocated_amount: 0, spent_amount: 0, percentage: 5 },
    { category_name: 'Savings', allocated_amount: 0, spent_amount: 0, percentage: 10 },
    { category_name: 'Entertainment', allocated_amount: 0, spent_amount: 0, percentage: 5 },
    { category_name: 'Personal', allocated_amount: 0, spent_amount: 0, percentage: 5 },
    { category_name: 'Debt Payments', allocated_amount: 0, spent_amount: 0, percentage: 5 },
  ]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const { toast } = useToast();

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Fetch existing financial goal
        const { data: goalData, error: goalError } = await supabase
          .from('financial_goals')
          .select('*')
          .maybeSingle();

        if (goalError && goalError.code !== 'PGRST116') {
          console.error('Error fetching financial goal:', goalError);
        } else if (goalData) {
          setFinancialGoal(goalData);
        }

        // Fetch current month's budget
        const now = new Date();
        const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0'); // Format as 2-digit string (01-12)
        const currentYear = now.getFullYear().toString();

        const { data: budgetData, error: budgetError } = await supabase
          .from('budgets')
          .select('*')
          .eq('month', currentMonth)
          .eq('year', currentYear)
          .maybeSingle(); // Use maybeSingle instead of single to handle case where no budget exists

        if (budgetError && budgetError.code !== 'PGRST116') {
          console.error('Error fetching budget:', budgetError);
        } else if (budgetData) {
          setMonthlyIncome(budgetData.total_income);
          // Parse the JSON categories data to ensure it's a BudgetCategory[] type
          if (budgetData.categories) {
            const parsedCategories = Array.isArray(budgetData.categories) 
              ? budgetData.categories as BudgetCategory[]
              : typeof budgetData.categories === 'string'
                ? JSON.parse(budgetData.categories)
                : [];
            setBudgetCategories(parsedCategories);
          }
        }

        // Fetch recent transactions
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const { data: transactionData, error: transactionError } = await supabase
          .from('transactions')
          .select('*')
          .gte('date', threeMonthsAgo.toISOString());

        if (transactionError) {
          console.error('Error fetching transactions:', transactionError);
        } else {
          setTransactions(transactionData || []);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load budget data',
          variant: 'destructive',
        });
      }
    };

    loadInitialData();
  }, [toast]);


  const [loading, setLoading] = useState<boolean>(false);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [isEditingBudget, setIsEditingBudget] = useState<boolean>(false);
  const { currentCurrency } = useCurrency();
  
  // Fetch user's transactions and calculate income
  useEffect(() => {
    const fetchTransactionsAndIncome = async () => {
      try {
        setLoading(true);
        
        // Get current date and date 3 months ago
        const now = new Date();
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(now.getMonth() - 3);
        
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .gte('date', threeMonthsAgo.toISOString())
          .lte('date', now.toISOString());
          
        if (error) throw error;
        
        if (data) {
          setTransactions(data);
          
          // Calculate average monthly income
          const incomeTransactions = data.filter(t => t.category_type === 'INCOME');
          if (incomeTransactions.length > 0) {
            const totalIncome = incomeTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
            const avgMonthlyIncome = totalIncome / 3; // Average over 3 months
            setMonthlyIncome(avgMonthlyIncome);
          }
          
          // Calculate spending by category for the current month
          const currentMonth = now.getMonth();
          const currentYear = now.getFullYear();
          const currentMonthTransactions = data.filter(t => {
            const transactionDate = new Date(t.date);
            return transactionDate.getMonth() === currentMonth && 
                   transactionDate.getFullYear() === currentYear &&
                   t.category_type === 'EXPENSE';
          });
          
          // Update spent amounts in budget categories
          if (currentMonthTransactions.length > 0) {
            const spendingByCategory: Record<string, number> = {};
            
            currentMonthTransactions.forEach(t => {
              const category = t.category_name || 'Uncategorized';
              spendingByCategory[category] = (spendingByCategory[category] || 0) + Number(t.amount);
            });
            
            // Update budget categories with actual spending
            setBudgetCategories(prev => prev.map(cat => ({
              ...cat,
              spent_amount: spendingByCategory[cat.category_name] || 0
            })));
          }
        }
        
        // Fetch existing budget if available
        await fetchBudget();
        
        // Fetch financial goal if available
        await fetchFinancialGoal();
        
      } catch (error) {
        console.error('Error fetching transactions:', error);
        toast({
          title: 'Error',
          description: 'Failed to load transaction data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchTransactionsAndIncome();
  }, [toast]);
  
  // Fetch existing budget
  const fetchBudget = async () => {
    try {
      const now = new Date();
      const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0'); // Format as 2-digit string (01-12)
      const currentYear = now.getFullYear().toString();
      
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setBudget(data as unknown as Budget);
        if (data.categories) {
          const parsedCategories = Array.isArray(data.categories) 
            ? data.categories as BudgetCategory[]
            : typeof data.categories === 'string'
              ? JSON.parse(data.categories)
              : [];
          setBudgetCategories(parsedCategories);
        }
      }
    } catch (error) {
      console.error('Error fetching budget:', error);
    }
  };
  
  // Fetch financial goal
  const fetchFinancialGoal = async () => {
    try {
      // Add proper headers to ensure correct content negotiation
      const { data, error } = await supabase
        .from('financial_goals')
        .select('*')
        .order('created_at', { ascending: false })
        .maybeSingle()
        .throwOnError(); // Add explicit error handling
      
      if (error) {
        console.error('Error fetching financial goal:', error);
        return;
      }
      
      if (data) {
        setFinancialGoal(data);
        setGoalType(data.goal_type);
        setGoalName(data.goal_name);
        setTargetAmount(data.target_amount);
        setTargetDate(data.target_date);
      }
    } catch (error) {
      console.error('Error fetching financial goal:', error);
    }
  };
  
  // Save budget data
  const saveBudget = async (budgetData?: any) => {
    try {
      if (monthlyIncome <= 0) {
        toast({
          title: 'Error',
          description: 'Monthly income must be greater than zero',
          variant: 'destructive',
        });
        return;
      }
      
      const now = new Date();
      const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0'); // Format as 2-digit string (01-12)
      const currentYear = now.getFullYear().toString(); // Convert year to string to match database schema
      
      let budgetToSave: Omit<Budget, 'id'> & { name: string };
      
      if (budgetData) {
        // Handle wizard completion case
        budgetToSave = {
          name: `Budget ${currentMonth}/${currentYear}`,
          month: currentMonth,
          year: currentYear,
          total_income: budgetData.monthlyIncome,
          total_budget: budgetData.aiRecommendation.budget.reduce((sum: number, cat: any) => sum + cat.allocated_amount, 0),
          categories: budgetData.aiRecommendation.budget
        };
      } else {
        // Handle manual budget update case
        const totalBudget = budgetCategories.reduce((sum, cat) => sum + cat.allocated_amount, 0);
        budgetToSave = {
          name: `Budget ${currentMonth}/${currentYear}`,
          month: currentMonth,
          year: currentYear,
          total_income: monthlyIncome,
          total_budget: totalBudget,
          categories: budgetCategories,
        };
      }
      
      let result;
      
      if (budget?.id) {
        // Update existing budget
        const { data, error } = await supabase
          .from('budgets')
          .update(budgetToSave)
          .eq('id', budget.id)
          .select()
          .single();
          
        if (error) throw error;
        result = data;
      } else {
        // Create new budget
        const { data, error } = await supabase
          .from('budgets')
          .insert(budgetToSave)
          .select()
          .single();
          
        if (error) throw error;
        result = data;
      }
      
      setBudget(result);
      setBudgetCategories(result.categories);
      setIsEditingBudget(false);
      setShowWizard(false);
      
      toast({
        title: 'Success',
        description: 'Budget saved successfully',
      });
      
    } catch (error) {
      console.error('Error saving budget:', error);
      toast({
        title: 'Error',
        description: 'Failed to save budget',
        variant: 'destructive',
      });
    }
  };

  // Save financial goal
  const saveFinancialGoal = async () => {
    try {
      if (!goalName || targetAmount <= 0 || !targetDate) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields',
          variant: 'destructive',
        });
        return;
      }
      
      const goalData: Omit<FinancialGoal, 'id'> = {
        goal_type: goalType,
        goal_name: goalName,
        target_amount: targetAmount,
        current_amount: 0, // Start at 0
        start_date: new Date().toISOString(),
        target_date: new Date(targetDate).toISOString(),
      };
      
      let result;
      
      if (financialGoal?.id) {
        // Update existing goal
        const { data, error } = await supabase
          .from('financial_goals')
          .update(goalData)
          .eq('id', financialGoal.id)
          .select()
          .maybeSingle();
          
        if (error) {
          console.error('Error updating financial goal:', error);
          throw error;
        }
        result = data;
      } else {
        // Create new goal
        const { data, error } = await supabase
          .from('financial_goals')
          .insert(goalData)
          .select()
          .maybeSingle();
          
        if (error) {
          console.error('Error creating financial goal:', error);
          throw error;
        }
        result = data;
      }
      
      setFinancialGoal(result);
      
      toast({
        title: 'Success',
        description: 'Financial goal saved successfully',
      });
      
      // Generate recommended budget based on goal
      generateRecommendedBudget();
      
    } catch (error) {
      console.error('Error saving financial goal:', error);
      toast({
        title: 'Error',
        description: 'Failed to save financial goal',
        variant: 'destructive',
      });
    }
  };
  
  // Generate recommended budget based on financial goal and income
  const generateRecommendedBudget = () => {
    if (monthlyIncome <= 0) {
      toast({
        title: 'Error',
        description: 'Monthly income must be greater than zero',
        variant: 'destructive',
      });
      return;
    }
    
    let updatedCategories: BudgetCategory[] = [];
    
    // Different allocation strategies based on goal type
    switch (goalType) {
      case 'financial_freedom':
        // Prioritize debt repayment and savings
        updatedCategories = [
          { category_name: 'Housing', allocated_amount: monthlyIncome * 0.3, spent_amount: 0, percentage: 30 },
          { category_name: 'Transportation', allocated_amount: monthlyIncome * 0.1, spent_amount: 0, percentage: 10 },
          { category_name: 'Food', allocated_amount: monthlyIncome * 0.15, spent_amount: 0, percentage: 15 },
          { category_name: 'Utilities', allocated_amount: monthlyIncome * 0.05, spent_amount: 0, percentage: 5 },
          { category_name: 'Insurance', allocated_amount: monthlyIncome * 0.05, spent_amount: 0, percentage: 5 },
          { category_name: 'Healthcare', allocated_amount: monthlyIncome * 0.05, spent_amount: 0, percentage: 5 },
          { category_name: 'Savings', allocated_amount: monthlyIncome * 0.15, spent_amount: 0, percentage: 15 },
          { category_name: 'Entertainment', allocated_amount: monthlyIncome * 0.05, spent_amount: 0, percentage: 5 },
          { category_name: 'Personal', allocated_amount: monthlyIncome * 0.05, spent_amount: 0, percentage: 5 },
          { category_name: 'Debt Payments', allocated_amount: monthlyIncome * 0.05, spent_amount: 0, percentage: 5 },
        ];
        break;
        
      case 'saving_goal':
        // Prioritize savings
        updatedCategories = [
          { category_name: 'Housing', allocated_amount: monthlyIncome * 0.3, spent_amount: 0, percentage: 30 },
          { category_name: 'Transportation', allocated_amount: monthlyIncome * 0.1, spent_amount: 0, percentage: 10 },
          { category_name: 'Food', allocated_amount: monthlyIncome * 0.15, spent_amount: 0, percentage: 15 },
          { category_name: 'Utilities', allocated_amount: monthlyIncome * 0.05, spent_amount: 0, percentage: 5 },
          { category_name: 'Insurance', allocated_amount: monthlyIncome * 0.05, spent_amount: 0, percentage: 5 },
          { category_name: 'Healthcare', allocated_amount: monthlyIncome * 0.05, spent_amount: 0, percentage: 5 },
          { category_name: 'Savings', allocated_amount: monthlyIncome * 0.2, spent_amount: 0, percentage: 20 },
          { category_name: 'Entertainment', allocated_amount: monthlyIncome * 0.03, spent_amount: 0, percentage: 3 },
          { category_name: 'Personal', allocated_amount: monthlyIncome * 0.04, spent_amount: 0, percentage: 4 },
          { category_name: 'Debt Payments', allocated_amount: monthlyIncome * 0.03, spent_amount: 0, percentage: 3 },
        ];
        break;
        
      case 'expense_management':
      default:
        // Balanced approach
        updatedCategories = [
          { category_name: 'Housing', allocated_amount: monthlyIncome * 0.25, spent_amount: 0, percentage: 25 },
          { category_name: 'Transportation', allocated_amount: monthlyIncome * 0.1, spent_amount: 0, percentage: 10 },
          { category_name: 'Food', allocated_amount: monthlyIncome * 0.15, spent_amount: 0, percentage: 15 },
          { category_name: 'Utilities', allocated_amount: monthlyIncome * 0.1, spent_amount: 0, percentage: 10 },
          { category_name: 'Insurance', allocated_amount: monthlyIncome * 0.05, spent_amount: 0, percentage: 5 },
          { category_name: 'Healthcare', allocated_amount: monthlyIncome * 0.05, spent_amount: 0, percentage: 5 },
          { category_name: 'Savings', allocated_amount: monthlyIncome * 0.1, spent_amount: 0, percentage: 10 },
          { category_name: 'Entertainment', allocated_amount: monthlyIncome * 0.1, spent_amount: 0, percentage: 10 },
          { category_name: 'Personal', allocated_amount: monthlyIncome * 0.05, spent_amount: 0, percentage: 5 },
          { category_name: 'Debt Payments', allocated_amount: monthlyIncome * 0.05, spent_amount: 0, percentage: 5 },
        ];
        break;
    }
    
    // Update budget categories with new allocations
    setBudgetCategories(updatedCategories);
    
    toast({
      title: 'Budget Generated',
      description: 'Recommended budget has been generated based on your financial goal',
    });
  };
  

  
  // Calculate progress percentage for financial goal
  const calculateGoalProgress = () => {
    if (!financialGoal || financialGoal.target_amount <= 0) return 0;
    return (financialGoal.current_amount / financialGoal.target_amount) * 100;
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };
  
  // Calculate days remaining until target date
  const calculateDaysRemaining = () => {
    if (!financialGoal?.target_date) return 0;
    
    const targetDate = new Date(financialGoal.target_date);
    const today = new Date();
    
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  };
  
  // Handle wizard completion
  const handleWizardComplete = async (data: any) => {
    try {
      setLoading(true);
      
      // Get the current user ID once at the beginning
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      // Save the financial goal
      const goalData: Omit<FinancialGoal, 'id'> = {
        user_id: userId,
        goal_type: data.goalType,
        goal_name: data.goalName,
        target_amount: data.targetAmount,
        current_amount: 0,
        start_date: new Date().toISOString(),
        target_date: data.targetDate,
      };

      // Add proper headers and error handling for financial goals insertion
      const { data: savedGoal, error: goalError } = await supabase
        .from('financial_goals')
        .insert(goalData)
        .select()
        .maybeSingle();

      if (goalError) {
        console.error('Error saving financial goal:', goalError);
        throw new Error(`Failed to save financial goal: ${goalError.message}`);
      }
      
      if (!savedGoal) {
        throw new Error('Failed to save financial goal: No data returned');
      }

      // Save the budget
      const now = new Date();
      const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
      const currentYear = now.getFullYear().toString();
      
      // Ensure budget categories are properly formatted with all required fields
      const budgetCategories = Array.isArray(data.aiRecommendation.budget) 
        ? data.aiRecommendation.budget.map(cat => ({
            category_name: cat.category_name,
            allocated_amount: parseFloat(cat.allocated_amount) || 0,
            spent_amount: parseFloat(cat.spent_amount) || 0,
            percentage: parseFloat(cat.percentage) || 0
          }))
        : [];
      
      // Calculate total budget from allocated amounts
      const totalBudget = budgetCategories.reduce((sum, cat) => sum + (parseFloat(cat.allocated_amount) || 0), 0);
      
      // Format the budget data with all required fields
      const budgetData = {
        user_id: userId,
        name: `Budget ${currentMonth}/${currentYear}`,
        month: currentMonth,
        year: currentYear,
        total_income: parseFloat(data.monthlyIncome) || 0,
        total_budget: totalBudget,
        categories: budgetCategories // Ensure it's a properly formatted array for JSONB
      };

      // Log the budget data for debugging
      console.log('Saving budget data:', budgetData);

      const { error: budgetError } = await supabase
        .from('budgets')
        .insert(budgetData);

      if (budgetError) throw budgetError;

      // Update state
      setFinancialGoal(savedGoal);
      setBudget(budgetData as unknown as Budget);
      setBudgetCategories(budgetCategories);
      setShowWizard(false);
      
      toast({
        title: 'Success',
        description: 'Budget and financial goal have been saved',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error saving budget data:', error);
      toast({
        title: 'Error',
        description: 'Failed to save budget data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout>
      <div className="flex flex-col gap-4 mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">Budgeting</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Plan and track your spending with smart budgeting tools.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800/50 p-1 text-slate-500 dark:text-slate-400">
          <TabsTrigger 
            value="overview"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-sm"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="goals"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-sm"
          >
            Goals
          </TabsTrigger>
          <TabsTrigger 
            value="categories"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-sm"
          >
            Categories
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-slate-700 dark:text-slate-300">Monthly Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(monthlyIncome, currentCurrency)}</div>
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                    <Wallet className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-slate-700 dark:text-slate-300">Total Budget</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(monthlyIncome, currentCurrency)}</div>
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                    <PiggyBank className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-slate-700 dark:text-slate-300">Savings Goal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(targetAmount, currentCurrency)}</div>
                  <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg">
                    <Target className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ... existing tab content ... */}
      </Tabs>

      {/* ... existing dialogs and wizards ... */}
    </PageLayout>
  );
};

export default Budgeting;