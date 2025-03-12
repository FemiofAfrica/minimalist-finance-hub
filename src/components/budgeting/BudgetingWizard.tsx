import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Steps } from '@/components/ui/steps';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, useCurrency } from '@/contexts/CurrencyContext';
import { supabase } from '@/integrations/supabase/client';
import { Target, Wallet, PiggyBank, TrendingUp } from 'lucide-react';
import { fetchTransactions } from '@/services/transactionService';

interface BudgetCategory {
  category_name: string;
  allocated_amount: number;
  spent_amount: number;
  percentage: number;
  name?: string; // Adding optional name property to fix the error
}

// Add interface for AI recommendation response
interface AIRecommendationResponse {
  success: boolean;
  recommendation?: string;
  error?: string;
  defaultRecommendation?: boolean;
  budget?: BudgetCategory[];
}

interface BudgetingWizardProps {
  onComplete: (data: any) => void;
  monthlyIncome: number;
  setMonthlyIncome: (income: number) => void;
  budgetCategories: BudgetCategory[];
  setBudgetCategories: (categories: BudgetCategory[]) => void;
  transactions?: any[];
  setTransactions?: (transactions: any[]) => void;
  initialTransactions?: any[];
}

const STEPS = [
  'Set Financial Goal',
  'Verify Income',
  'Analyze Expenses',
  'Allocate Budget'
];

const GOAL_TYPES = [
  { id: 'financial_freedom', label: 'Financial Freedom', icon: Target },
  { id: 'saving_goal', label: 'Saving Goal', icon: PiggyBank },
  { id: 'expense_management', label: 'Expense Management', icon: Wallet },
  { id: 'investment_growth', label: 'Investment Growth', icon: TrendingUp }
];

export function BudgetingWizard({ 
  onComplete, 
  monthlyIncome, 
  setMonthlyIncome,
  budgetCategories,
  setBudgetCategories,
  transactions: propTransactions,
  setTransactions: propSetTransactions,
  initialTransactions
}: BudgetingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [goalType, setGoalType] = useState('');
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState<number>(0);
  const [targetDate, setTargetDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>(propTransactions || initialTransactions || []);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { currentCurrency } = useCurrency();

  // Add useEffect to fetch transaction history when component mounts
  useEffect(() => {
    fetchTransactionHistory();
  }, []);

  const fetchTransactionHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the transactionService instead of direct Supabase queries
      const transactionData = await fetchTransactions();
      
      // Update transactions state
      setTransactions(transactionData);
      
      // If parent component provided setTransactions function, call it too
      if (propSetTransactions) {
        propSetTransactions(transactionData);
      }
  
      // Calculate average monthly income if no income is set
      if (monthlyIncome === 0 && transactionData.length > 0) {
        const incomeTransactions = transactionData.filter(t => t.category_type === 'INCOME');
        const totalIncome = incomeTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
        const monthCount = Math.max(1, Math.ceil(incomeTransactions.length / 10)); // Approximate number of months
        const avgMonthlyIncome = totalIncome / monthCount;
        setMonthlyIncome(avgMonthlyIncome);
      }
      
      if (transactionData.length === 0) {
        setError('No transaction data available. Please add some transactions first.');
        toast({
          title: 'No Transactions',
          description: 'No transaction data available. Please add some transactions first.',
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError('Failed to load transaction history. Please try again later.');
      toast({
        title: 'Error',
        description: 'Failed to load transaction history. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (validateCurrentStep()) {
      if (currentStep === STEPS.length - 1) {
        await handleComplete();
      } else {
        setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
      }
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleStepClick = (step: number) => {
    // Only allow going back to previous steps
    if (step < currentStep) {
      setCurrentStep(step);
    }
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 0: // Goal Setting
        if (!goalType || !goalName || targetAmount <= 0 || !targetDate) {
          toast({
            title: 'Validation Error',
            description: 'Please fill in all required fields',
            variant: 'destructive',
          });
          return false;
        }
        break;
      case 1: // Income Verification
        if (monthlyIncome <= 0) {
          toast({
            title: 'Validation Error',
            description: 'Please enter a valid monthly income',
            variant: 'destructive',
          });
          return false;
        }
        break;
      case 2: // Expense Analysis
        if (!transactions || transactions.length === 0) {
          toast({
            title: 'No Transaction Data',
            description: 'Please add some transactions before continuing',
            variant: 'destructive',
          });
          return false;
        }
        break;
      case 3: // Budget Allocation
        if (monthlyIncome <= 0) {
          toast({
            title: 'Validation Error',
            description: 'Monthly income is required for budget allocation',
            variant: 'destructive',
          });
          return false;
        }
        break;
    }
    return true;
  };

  const handleComplete = async () => {
    if (validateCurrentStep()) {
      setLoading(true);
      try {
        // Generate default budget based on goal type
        const defaultBudget = generateRecommendedBudget().map(category => ({
          category_name: category.name,
          allocated_amount: monthlyIncome * (category.percentage / 100),
          spent_amount: 0,
          percentage: category.percentage
        }));
        
        let aiRecommendation = null;
        let recommendedBudget = defaultBudget;
        
        try {
          // Try to get AI recommendation
          const { analyzeBudgetGoals } = await import('@/integrations/groq/client');
          const analysis = await analyzeBudgetGoals({
            goalType,
            goalName,
            targetAmount,
            targetDate,
            monthlyIncome,
            transactions
          });
          
          if (analysis && analysis.success) {
            aiRecommendation = analysis.recommendation;
            console.log('Successfully received AI recommendation');
            // If AI provided budget recommendations, use them
if ('budget' in analysis && analysis.budget) {
              recommendedBudget = analysis.budget as BudgetCategory[];
            }
          } else if (analysis && analysis.defaultRecommendation) {
            // Use the default recommendation if the API call failed but returned a defaultRecommendation flag
            console.log('Using default budget recommendation');
            aiRecommendation = 'Standard budget allocation based on your financial goal type.';
          } else {
            console.log('AI analysis did not return a successful result, using default budget');
            toast({
              title: 'Notice',
              description: analysis.error || 'Could not get AI recommendations. Using standard budget allocation.',
              variant: 'default',
            });
          }
        } catch (aiError) {
          console.error('Error getting AI recommendation:', aiError);
          // Continue with default budget if AI fails
          toast({
            title: 'Notice',
            description: 'Could not get AI recommendations. Using standard budget allocation.',
            variant: 'default',
          });
        }
        
        // Ensure budget categories have the correct structure
        const formattedBudget = recommendedBudget.map(category => ({
          category_name: category.category_name || '',
          allocated_amount: parseFloat(String(category.allocated_amount)) || 0,
          spent_amount: parseFloat(String(category.spent_amount)) || 0,
          percentage: parseFloat(String(category.percentage)) || 0
        }));
        
        // Save both the budget and complete the wizard
        await onComplete({
          goalType,
          goalName,
          targetAmount,
          targetDate,
          monthlyIncome,
          transactions,
          aiRecommendation: {
            budget: formattedBudget,
            recommendation: aiRecommendation
          }
        });
      } catch (error) {
        console.error('Error completing wizard:', error);
        toast({
          title: 'Error',
          description: 'Failed to complete budget setup. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                {GOAL_TYPES.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setGoalType(id)}
                    className={`flex items-center p-4 rounded-lg border-2 ${goalType === id ? 'border-primary' : 'border-muted'}`}
                  >
                    <Icon className="w-6 h-6 mr-2" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="goalName">Goal Name</Label>
                <Input
                  id="goalName"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  placeholder="e.g., Emergency Fund, House Down Payment"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetAmount">Target Amount</Label>
                <Input
                  id="targetAmount"
                  type="number"
                  value={targetAmount || ''}
                  onChange={(e) => setTargetAmount(Number(e.target.value))}
                  placeholder="Enter target amount"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetDate">Target Date</Label>
                <Input
                  id="targetDate"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="monthlyIncome">Monthly Income</Label>
              <Input
                id="monthlyIncome"
                type="number"
                min="0"
                step="0.01"
                value={monthlyIncome || ''}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value) && value >= 0) {
                    setMonthlyIncome(value);
                  } else if (e.target.value === '') {
                    setMonthlyIncome(0);
                  }
                }}
                placeholder="Enter your monthly income"
                className={monthlyIncome <= 0 ? 'border-red-500' : ''}
              />
              {monthlyIncome <= 0 && (
                <p className="text-sm text-red-500 mt-1">
                  Please enter a valid monthly income amount
                </p>
              )}
            </div>

            {transactions?.length > 0 ? (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Income History (Last 3 Months)</h4>
                <div className="space-y-2">
                  {transactions
                    .filter(t => t.category_type === 'INCOME')
                    .slice(0, 5)
                    .map(t => (
                      <div 
                        key={t.id || t.transaction_id} 
                        className="flex justify-between items-center p-2 bg-muted rounded cursor-pointer hover:bg-muted/80"
                        onClick={() => setMonthlyIncome(Number(t.amount))}
                      >
                        <span>{t.description}</span>
                        <span>{formatCurrency(t.amount, currentCurrency)}</span>
                      </div>
                    ))}                    
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Click on any transaction to set it as your monthly income
                </p>
              </div>
            ) : (
              <div className="p-4 border border-dashed rounded-md mt-4">
                <p className="text-center text-muted-foreground">
                  {loading ? 'Loading transactions...' : error || 'No income transactions found. Please add some transactions first.'}
                </p>
                {!loading && (
                  <Button 
                    variant="outline" 
                    className="w-full mt-2"
                    onClick={fetchTransactionHistory}
                  >
                    Retry Loading Transactions
                  </Button>
                )}
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Expense Analysis</h4>
            {transactions?.length > 0 ? (
              <div className="space-y-2">
                {Object.entries(transactions
                  .filter(t => t.category_type === 'EXPENSE')
                  .reduce((acc, t) => {
                    const category = t.category_name || 'Other';
                    acc[category] = (acc[category] || 0) + Number(t.amount);
                    return acc;
                  }, {} as Record<string, number>))
                  .map(([category, amount]) => (
                    <div key={category} className="flex justify-between items-center p-2 bg-muted rounded">
                      <span>{category}</span>
                      <span>{formatCurrency(Number(amount), currentCurrency)}</span>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="p-4 border border-dashed rounded-md">
                <p className="text-center text-muted-foreground">
                  {loading ? 'Loading transactions...' : error || 'No expense data available. Please add some transactions first.'}
                </p>
                {!loading && (
                  <Button 
                    variant="outline" 
                    className="w-full mt-2"
                    onClick={fetchTransactionHistory}
                  >
                    Retry Loading Transactions
                  </Button>
                )}
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Recommended Budget Allocation</h4>
            <div className="grid gap-2">
              {generateRecommendedBudget().map(category => (
                <div key={category.name} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span>{category.name}</span>
                  <div className="flex items-center gap-2">
                    <span>{category.percentage}%</span>
                    <span>{formatCurrency(monthlyIncome * (category.percentage / 100), currentCurrency)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
    }
  };

  const generateRecommendedBudget = () => {
    switch (goalType) {
      case 'financial_freedom':
        return [
          { name: 'Savings', percentage: 20 },
          { name: 'Housing', percentage: 30 },
          { name: 'Transportation', percentage: 10 },
          { name: 'Food', percentage: 15 },
          { name: 'Utilities', percentage: 10 },
          { name: 'Entertainment', percentage: 5 },
          { name: 'Healthcare', percentage: 5 },
          { name: 'Debt Payment', percentage: 5 }
        ];
      case 'saving_goal':
        return [
          { name: 'Savings', percentage: 30 },
          { name: 'Housing', percentage: 25 },
          { name: 'Transportation', percentage: 10 },
          { name: 'Food', percentage: 15 },
          { name: 'Utilities', percentage: 10 },
          { name: 'Entertainment', percentage: 3 },
          { name: 'Healthcare', percentage: 4 },
          { name: 'Debt Payment', percentage: 3 }
        ];
      default:
        return [
          { name: 'Savings', percentage: 15 },
          { name: 'Housing', percentage: 30 },
          { name: 'Transportation', percentage: 15 },
          { name: 'Food', percentage: 15 },
          { name: 'Utilities', percentage: 10 },
          { name: 'Entertainment', percentage: 5 },
          { name: 'Healthcare', percentage: 5 },
          { name: 'Debt Payment', percentage: 5 }
        ];
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Create Your Budget Plan</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <Steps
            steps={STEPS}
            currentStep={currentStep}
            onStepClick={handleStepClick}
            className="mb-8"
          />

          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading...</span>
            </div>
          ) : error && transactions.length === 0 ? (
            <div className="p-6 border border-dashed rounded-md text-center">
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button 
                variant="outline" 
                onClick={fetchTransactionHistory}
              >
                Retry Loading Transactions
              </Button>
            </div>
          ) : (
            renderStepContent()
          )}

          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              Back
            </Button>

            {currentStep < STEPS.length - 1 ? (
              <Button onClick={handleNext}>Next</Button>
            ) : (
              <Button onClick={handleComplete}>Complete</Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}