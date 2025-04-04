import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/contexts/CurrencyContext';
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

// Define the original base currency of the incoming props/state data
const PROPS_BASE_CURRENCY = "NGN";

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
  const { formatPossiblyConvertedCurrency, exchangeRates } = useCurrency();
  
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
    return Math.min(100, (financialGoal.current_amount / financialGoal.target_amount) * 100);
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      // Assuming dateString is in ISO format like 'YYYY-MM-DDTHH:mm:ssZ' or just 'YYYY-MM-DD'
      return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return "Invalid Date";
    }
  };
  
  // Calculate days remaining until target date
  const calculateDaysRemaining = () => {
    if (!financialGoal?.target_date) return 0;
    try {
        const target = new Date(financialGoal.target_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Ignore time for comparison
        target.setHours(0, 0, 0, 0);
        const diffTime = target.getTime() - today.getTime();
        if (diffTime < 0) return -1; // Target date has passed
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch (e) {
        console.error("Error calculating days remaining:", financialGoal.target_date, e);
        return 0;
    }
  };
  
  // Handle wizard completion
  const handleWizardComplete = async (data: any) => {
      console.log("Wizard Complete Data:", data);
      try {
          // Save Financial Goal
          const goalPayload: Partial<FinancialGoal> = {
              goal_type: data.goalType,
              goal_name: data.goalName,
              target_amount: data.targetAmount,
              current_amount: financialGoal?.current_amount || 0, // Keep existing current amount if editing
              target_date: data.targetDate,
              start_date: financialGoal?.start_date || new Date().toISOString().split('T')[0],
          };

          if (financialGoal?.id) { // Update existing goal
              const { data: updatedGoal, error } = await supabase
                  .from('financial_goals')
                  .update(goalPayload)
                  .eq('id', financialGoal.id)
                  .select()
                  .single();
              if (error) throw error;
              setFinancialGoal(updatedGoal);
          } else { // Insert new goal
              const { data: newGoal, error } = await supabase
                  .from('financial_goals')
                  .insert(goalPayload)
                  .select()
                  .single();
              if (error) throw error;
              setFinancialGoal(newGoal);
          }

          // Save Budget (assuming wizard provides necessary info)
          if (data.aiRecommendation?.budget) {
             setBudgetCategories(data.aiRecommendation.budget);
             await saveBudget({ 
                 total_income: data.monthlyIncome,
                 categories: data.aiRecommendation.budget
             });
          }
          
          toast({ title: "Success", description: "Budget and goal setup complete!" });
      } catch (error) {
          console.error('Error saving wizard data:', error);
          toast({ title: "Error", description: "Failed to save budget or goal.", variant: "destructive" });
      } finally {
          setShowWizard(false);
      }
  };

  // Helper function to convert NGN prop amount to USD base amount
  const convertNgnToUsd = (amountNgn: number): number | null => {
      const ngnRate = exchangeRates?.[PROPS_BASE_CURRENCY];
      // Check if rates are loaded and the NGN rate is valid
      if (ngnRate && typeof ngnRate === 'number' && ngnRate > 0) {
          return amountNgn / ngnRate;
      }
      // Return null or handle error/loading state appropriately if rates aren't ready
      // console.warn(`Rate for ${PROPS_BASE_CURRENCY} not available for conversion on budgeting page.`);
      return null; // Indicate conversion failure
  };

  const renderOverview = () => {
    const goalProgress = calculateGoalProgress();
    const daysRemaining = calculateDaysRemaining();
    const totalSpent = budgetCategories.reduce((sum, cat) => sum + cat.spent_amount, 0);
    const totalAllocated = budgetCategories.reduce((sum, cat) => sum + cat.allocated_amount, 0);
    const overallBudgetProgress = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

    // Convert amounts for display
    const incomeUSD = convertNgnToUsd(monthlyIncome);
    const spentUSD = convertNgnToUsd(totalSpent);
    const allocatedUSD = convertNgnToUsd(totalAllocated);
    const goalTargetUSD = financialGoal ? convertNgnToUsd(financialGoal.target_amount) : null;
    const goalCurrentUSD = financialGoal ? convertNgnToUsd(financialGoal.current_amount) : null;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {incomeUSD !== null ? formatPossiblyConvertedCurrency(incomeUSD) : "Loading..."}
            </div>
            {/* <p className="text-xs text-muted-foreground">+20.1% from last month</p> */}
          </CardContent>
        </Card>

        {financialGoal && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Financial Goal: {financialGoal.goal_name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{goalProgress.toFixed(1)}%</span>
                </div>
                <Progress value={goalProgress} aria-label={`${goalProgress.toFixed(1)}% goal progress`} />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>
                    {goalCurrentUSD !== null ? formatPossiblyConvertedCurrency(goalCurrentUSD) : "-"} /
                    {goalTargetUSD !== null ? formatPossiblyConvertedCurrency(goalTargetUSD) : "-"}
                  </span>
                  <span>{daysRemaining >= 0 ? `${daysRemaining} days left` : 'Target date passed'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent This Month</CardTitle>
             <ArrowDownRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {spentUSD !== null ? formatPossiblyConvertedCurrency(spentUSD) : "Loading..."}
            </div>
             <p className="text-xs text-muted-foreground">
               Budgeted: {allocatedUSD !== null ? formatPossiblyConvertedCurrency(allocatedUSD) : "Loading..."}
            </p>
          </CardContent>
        </Card>
        {/* Maybe add Overall Budget Progress card? */} 
      </div>
    );
  };

  const renderBudgetDetails = () => {
    return (
      <Card>
        <CardHeader className="flex justify-between items-center">
          <CardTitle>Budget Categories</CardTitle>
           <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsEditingBudget(!isEditingBudget)}
           >
             {isEditingBudget ? "Cancel" : "Edit Budget"}
           </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {budgetCategories.map((category, index) => {
              const progress = category.allocated_amount > 0 ? Math.min(100, (category.spent_amount / category.allocated_amount) * 100) : 0;
              const spentUSD = convertNgnToUsd(category.spent_amount);
              const allocatedUSD = convertNgnToUsd(category.allocated_amount);
              return (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{category.category_name}</span>
                    <div className="flex items-center gap-2">
                        <span className={`text-sm ${category.spent_amount > category.allocated_amount ? 'text-red-500' : 'text-muted-foreground'}`}>
                           {spentUSD !== null ? formatPossiblyConvertedCurrency(spentUSD) : "-"} /
                        </span>
                       {isEditingBudget ? (
                           <Input
                             type="number"
                             defaultValue={category.allocated_amount} // Use defaultValue for uncontrolled input during edit
                             onBlur={(e) => { // Update on blur to avoid excessive re-renders
                                 const newAmount = parseFloat(e.target.value) || 0;
                                 setBudgetCategories(prev =>
                                     prev.map(cat =>
                                         cat.category_name === category.category_name
                                             ? { ...cat, allocated_amount: newAmount }
                                             : cat
                                     )
                                 );
                             }}
                             className="w-24 h-8 text-sm" // Smaller input
                           />
                       ) : (
                         <span className="font-semibold text-sm">
                             {allocatedUSD !== null ? formatPossiblyConvertedCurrency(allocatedUSD) : "-"}
                         </span>
                       )}
                     </div>
                  </div>
                  <Progress value={progress} aria-label={`${category.category_name} budget progress ${progress.toFixed(0)}%`} />
                   <p className="text-xs text-muted-foreground text-right">{progress.toFixed(0)}% Used</p>
                </div>
              );
            })}
          </div>
          {isEditingBudget && (
             <div className="mt-6 flex justify-end">
                 <Button onClick={async () => { await saveBudget(); setIsEditingBudget(false); }}>Save Changes</Button>
             </div>
           )}
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold">Budgeting</h1>
          <Dialog open={showWizard} onOpenChange={setShowWizard}>
            <DialogTrigger asChild>
               <Button>Setup Budget Wizard</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px]">
               <BudgetingWizard 
                 onComplete={handleWizardComplete} 
                 monthlyIncome={monthlyIncome}
                 setMonthlyIncome={setMonthlyIncome}
                 budgetCategories={budgetCategories}
                 setBudgetCategories={setBudgetCategories}
                 initialTransactions={transactions} // Pass initial transactions
               />
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Budget Details</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {renderOverview()} 
          </TabsContent>
          <TabsContent value="details">
            {renderBudgetDetails()} 
          </TabsContent>
          <TabsContent value="goals">
            {renderGoals()} 
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Budgeting;