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
import DashboardLayout from '@/components/dashboard/DashboardLayout';
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
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        {showWizard ? (
          <BudgetingWizard
            onComplete={handleWizardComplete}
            monthlyIncome={monthlyIncome}
            transactions={transactions}
            setTransactions={setTransactions}
            initialTransactions={transactions}
            setMonthlyIncome={setMonthlyIncome}
            budgetCategories={budgetCategories}
            setBudgetCategories={setBudgetCategories}
          />
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold">Budgeting & Financial Goals</h1>
              <Button
                onClick={() => setShowWizard(true)}
                className="flex items-center gap-2"
              >
                <Target className="w-4 h-4" />
                Setup Budget
              </Button>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="budget">Budget</TabsTrigger>
                <TabsTrigger value="goals">Financial Goals</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="h-full">
                    <CardHeader className="pb-3">
                      <CardTitle>Monthly Budget Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="font-medium">Total Budget:</span>
                          <span className="text-lg font-semibold">{formatCurrency(budget?.total_budget || 0, currentCurrency)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="font-medium">Total Spent:</span>
                          <span className="text-lg font-semibold">{formatCurrency(budgetCategories.reduce((sum, cat) => sum + cat.spent_amount, 0), currentCurrency)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="h-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                      <CardTitle>Financial Goal Progress</CardTitle>
                      {financialGoal && (
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="flex items-center gap-1"
                            onClick={() => {
                              if (financialGoal) {
                                setGoalType(financialGoal.goal_type);
                                setGoalName(financialGoal.goal_name);
                                setTargetAmount(financialGoal.target_amount);
                                setTargetDate(financialGoal.target_date.split('T')[0]);
                                setActiveTab('goals');
                              }
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                            Edit
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                                Delete
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Confirm Deletion</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to delete this financial goal? This action cannot be undone.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => {}}>
                                  Cancel
                                </Button>
                                <Button 
                                  variant="destructive"
                                  onClick={async () => {
                                    if (financialGoal?.id) {
                                      try {
                                        const { error } = await supabase
                                          .from('financial_goals')
                                          .delete()
                                          .eq('id', financialGoal.id);
                                          
                                        if (error) throw error;
                                        
                                        setFinancialGoal(null);
                                        toast({
                                          title: 'Success',
                                          description: 'Financial goal deleted successfully',
                                        });
                                      } catch (error) {
                                        console.error('Error deleting financial goal:', error);
                                        toast({
                                          title: 'Error',
                                          description: 'Failed to delete financial goal',
                                          variant: 'destructive',
                                        });
                                      }
                                    }
                                  }}
                                >
                                  Delete
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent>
                      {financialGoal ? (
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-medium mb-2">{financialGoal.goal_name}</h4>
                            <Progress value={calculateGoalProgress()} className="h-3 mb-2" />
                            <div className="flex justify-between text-sm font-medium">
                              <span>{formatCurrency(financialGoal.current_amount, currentCurrency)}</span>
                              <span>{formatCurrency(financialGoal.target_amount, currentCurrency)}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-sm font-medium">Target Date:</span>
                            <span className="text-sm">{formatDate(financialGoal.target_date)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Remaining:</span>
                            <span className="text-sm font-semibold">{calculateDaysRemaining()} days</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <p className="text-muted-foreground mb-4">No financial goal set</p>
                          <Button onClick={() => setShowWizard(true)} size="sm">
                            Set Up Financial Goal
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="budget" className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Monthly Budget Allocation</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={() => {
                      if (isEditingBudget) {
                        saveBudget();
                      } else {
                        setIsEditingBudget(true);
                      }
                    }}
                  >
                    {isEditingBudget ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-save"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                        Save Changes
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                        Edit Budget
                      </>
                    )}
                  </Button>
                </div>
                
                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="h-full">
                    <CardHeader className="pb-3">
                      <CardTitle>Essential Expenses</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {budgetCategories.slice(0, 5).map((category) => (
                          <div key={category.category_name} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{category.category_name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{formatCurrency(category.spent_amount, currentCurrency)} / </span>
                                {isEditingBudget ? (
                                  <Input
                                    type="number"
                                    value={category.allocated_amount}
                                    onChange={(e) => {
                                      const newAmount = parseFloat(e.target.value);
                                      setBudgetCategories(prev =>
                                        prev.map(cat =>
                                          cat.category_name === category.category_name
                                            ? { ...cat, allocated_amount: newAmount }
                                            : cat
                                        )
                                      );
                                    }}
                                    className="w-24 inline-block"
                                  />
                                ) : (
                                  <span className="font-semibold">{formatCurrency(category.allocated_amount, currentCurrency)}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress
                                value={(category.spent_amount / (category.allocated_amount || 1)) * 100}
                                className="h-2 flex-grow"
                              />
                              <span className="text-xs whitespace-nowrap">
                                {Math.round((category.spent_amount / (category.allocated_amount || 1)) * 100)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="h-full">
                    <CardHeader className="pb-3">
                      <CardTitle>Discretionary Spending</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {budgetCategories.slice(5).map((category) => (
                          <div key={category.category_name} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{category.category_name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{formatCurrency(category.spent_amount, currentCurrency)} / </span>
                                {isEditingBudget ? (
                                  <Input
                                    type="number"
                                    value={category.allocated_amount}
                                    onChange={(e) => {
                                      const newAmount = parseFloat(e.target.value);
                                      setBudgetCategories(prev =>
                                        prev.map(cat =>
                                          cat.category_name === category.category_name
                                            ? { ...cat, allocated_amount: newAmount }
                                            : cat
                                        )
                                      );
                                    }}
                                    className="w-24 inline-block"
                                  />
                                ) : (
                                  <span className="font-semibold">{formatCurrency(category.allocated_amount, currentCurrency)}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress
                                value={(category.spent_amount / (category.allocated_amount || 1)) * 100}
                                className="h-2 flex-grow"
                              />
                              <span className="text-xs whitespace-nowrap">
                                {Math.round((category.spent_amount / (category.allocated_amount || 1)) * 100)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {isEditingBudget && (
                  <div className="flex justify-end mt-4">
                    <Button 
                      variant="outline" 
                      className="mr-2"
                      onClick={() => setIsEditingBudget(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={() => saveBudget()}>
                      Save Budget
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="goals" className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Financial Goal Management</h3>
                  {!financialGoal && (
                    <Button 
                      onClick={() => setShowWizard(true)}
                      className="flex items-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                      Create New Goal
                    </Button>
                  )}
                </div>
                
                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="h-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                      <CardTitle>Financial Goal Details</CardTitle>
                      {financialGoal && (
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="flex items-center gap-1"
                            onClick={() => {
                              if (financialGoal) {
                                setGoalType(financialGoal.goal_type);
                                setGoalName(financialGoal.goal_name);
                                setTargetAmount(financialGoal.target_amount);
                                setTargetDate(financialGoal.target_date.split('T')[0]);
                              }
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                            Edit
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                                Delete
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Confirm Deletion</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to delete this financial goal? This action cannot be undone.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => {}}>
                                  Cancel
                                </Button>
                                <Button 
                                  variant="destructive"
                                  onClick={async () => {
                                    if (financialGoal?.id) {
                                      try {
                                        const { error } = await supabase
                                          .from('financial_goals')
                                          .delete()
                                          .eq('id', financialGoal.id);
                                          
                                        if (error) throw error;
                                        
                                        setFinancialGoal(null);
                                        toast({
                                          title: 'Success',
                                          description: 'Financial goal deleted successfully',
                                        });
                                      } catch (error) {
                                        console.error('Error deleting financial goal:', error);
                                        toast({
                                          title: 'Error',
                                          description: 'Failed to delete financial goal',
                                          variant: 'destructive',
                                        });
                                      }
                                    }
                                  }}
                                >
                                  Delete
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent>
                      {financialGoal ? (
                        <div className="space-y-4">
                          <div className="grid gap-4">
                            <div className="p-4 bg-muted rounded-lg">
                              <h4 className="text-sm font-medium mb-1 text-muted-foreground">Goal Name</h4>
                              <p className="text-lg font-semibold">{financialGoal.goal_name}</p>
                            </div>

                            <div className="flex justify-between items-center py-3 border-b">
                              <span className="font-medium">Goal Type</span>
                              <span className="text-sm font-medium capitalize bg-primary/10 text-primary px-3 py-1 rounded-full">
                                {financialGoal.goal_type.replace(/_/g, ' ')}
                              </span>
                            </div>

                            <div className="flex justify-between items-center py-3 border-b">
                              <span className="font-medium">Target Amount</span>
                              <span className="text-lg font-semibold">
                                {formatCurrency(financialGoal.target_amount, currentCurrency)}
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-center py-3">
                              <span className="font-medium">Start Date</span>
                              <span className="text-sm">
                                {formatDate(financialGoal.start_date)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12 border-2 border-dashed rounded-lg">
                          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-muted-foreground"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15h6"/></svg>
                          <p className="text-muted-foreground mb-4">No financial goal set</p>
                          <Button onClick={() => setShowWizard(true)}>
                            Set Up Financial Goal
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {financialGoal && (
                    <Card className="h-full">
                      <CardHeader className="pb-3">
                        <CardTitle>Goal Progress</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium">Current Progress</span>
                              <span className="text-sm font-semibold">
                                {Math.round(calculateGoalProgress())}%
                              </span>
                            </div>
                            <Progress value={calculateGoalProgress()} className="h-3 mb-2" />
                            <div className="flex justify-between text-sm mt-1">
                              <span>{formatCurrency(financialGoal.current_amount, currentCurrency)}</span>
                              <span>{formatCurrency(financialGoal.target_amount, currentCurrency)}</span>
                            </div>
                          </div>

                          <div className="p-4 bg-muted rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium">Target Date</span>
                              <span className="text-sm font-semibold">{formatDate(financialGoal.target_date)}</span>
                            </div>
                            
                            <div className="mt-4 flex items-center justify-between">
                              <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                <span className="text-sm font-medium">Time Remaining:</span>
                              </div>
                              <span className="text-lg font-bold">{calculateDaysRemaining()} days</span>
                            </div>
                          </div>
                          
                          <Button 
                            className="w-full" 
                            variant="outline"
                            onClick={() => {
                              if (financialGoal) {
                                // Open a dialog to update current amount
                                const newAmount = window.prompt(
                                  'Update current amount:', 
                                  financialGoal.current_amount.toString()
                                );
                                
                                if (newAmount !== null) {
                                  const parsedAmount = parseFloat(newAmount);
                                  if (!isNaN(parsedAmount) && parsedAmount >= 0) {
                                    // Update the financial goal
                                    supabase
                                      .from('financial_goals')
                                      .update({ current_amount: parsedAmount })
                                      .eq('id', financialGoal.id)
                                      .then(({ error }) => {
                                        if (error) {
                                          console.error('Error updating goal amount:', error);
                                          toast({
                                            title: 'Error',
                                            description: 'Failed to update goal amount',
                                            variant: 'destructive',
                                          });
                                        } else {
                                          // Update local state
                                          setFinancialGoal({
                                            ...financialGoal,
                                            current_amount: parsedAmount
                                          });
                                          toast({
                                            title: 'Success',
                                            description: 'Goal amount updated successfully',
                                          });
                                        }
                                      });
                                  } else {
                                    toast({
                                      title: 'Invalid Amount',
                                      description: 'Please enter a valid positive number',
                                      variant: 'destructive',
                                    });
                                  }
                                }
                              }
                            }}
                          >
                            Update Current Amount
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Budgeting;