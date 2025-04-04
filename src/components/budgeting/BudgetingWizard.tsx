import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Steps } from '@/components/ui/steps';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/contexts/CurrencyContext';
import { supabase } from '@/integrations/supabase/client';
import { Target, Wallet, PiggyBank, TrendingUp } from 'lucide-react';
import { fetchTransactions } from '@/services/transactionService';

interface BudgetCategory {
  category_name: string;
  allocated_amount: number;
  spent_amount: number;
  percentage: number;
  name?: string;
}

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

const PROPS_BASE_CURRENCY = "NGN";

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
  const { formatPossiblyConvertedCurrency, exchangeRates } = useCurrency();

  const convertNgnToUsd = (amountNgn: number): number | null => {
      const ngnRate = exchangeRates?.[PROPS_BASE_CURRENCY];
      if (ngnRate && typeof ngnRate === 'number' && ngnRate > 0) {
          return amountNgn / ngnRate;
      }
      return null;
  };

  useEffect(() => {
    fetchTransactionHistory();
  }, []);

  const fetchTransactionHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const transactionData = await fetchTransactions();
      
      setTransactions(transactionData);
      
      if (propSetTransactions) {
        propSetTransactions(transactionData);
      }
  
      if (monthlyIncome === 0 && transactionData.length > 0) {
        const incomeTransactions = transactionData.filter(t => t.category_type === 'INCOME');
        const totalIncome = incomeTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
        const monthCount = Math.max(1, Math.ceil(incomeTransactions.length / 10));
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
    if (step < currentStep) {
      setCurrentStep(step);
    }
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 0:
        if (!goalType || !goalName || targetAmount <= 0 || !targetDate) {
          toast({
            title: 'Validation Error',
            description: 'Please fill in all required fields',
            variant: 'destructive',
          });
          return false;
        }
        break;
      case 1:
        if (monthlyIncome <= 0) {
          toast({
            title: 'Validation Error',
            description: 'Please enter a valid monthly income',
            variant: 'destructive',
          });
          return false;
        }
        break;
      case 2:
        if (!transactions || transactions.length === 0) {
          toast({
            title: 'No Transaction Data',
            description: 'Please add some transactions before continuing',
            variant: 'destructive',
          });
          return false;
        }
        break;
      case 3:
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
        const defaultBudget = generateRecommendedBudget().map(category => ({
          category_name: category.name,
          allocated_amount: monthlyIncome * (category.percentage / 100),
          spent_amount: 0,
          percentage: category.percentage
        }));
        
        let aiRecommendation = null;
        let recommendedBudget = defaultBudget;
        
        try {
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
            if ('budget' in analysis && analysis.budget) {
              recommendedBudget = analysis.budget as BudgetCategory[];
            }
          } else if (analysis && analysis.defaultRecommendation) {
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
          toast({
            title: 'Notice',
            description: 'Could not get AI recommendations. Using standard budget allocation.',
            variant: 'default',
          });
        }
        
        const formattedBudget = recommendedBudget.map(category => ({
          category_name: category.category_name || '',
          allocated_amount: parseFloat(String(category.allocated_amount)) || 0,
          spent_amount: parseFloat(String(category.spent_amount)) || 0,
          percentage: parseFloat(String(category.percentage)) || 0
        }));
        
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
          <Card>
            <CardHeader><CardTitle>Set Your Financial Goal</CardTitle></CardHeader>
            <CardContent className="space-y-4">
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
                    value={targetAmount} 
                    onChange={(e) => setTargetAmount(parseFloat(e.target.value) || 0)}
                    placeholder="Enter target amount" 
                  />
                   <p className="text-sm text-muted-foreground">
                     Current Target: {convertNgnToUsd(targetAmount) !== null 
                       ? formatPossiblyConvertedCurrency(convertNgnToUsd(targetAmount)!) 
                       : "Loading..."}
                   </p>
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
            </CardContent>
          </Card>
        );

      case 1:
        return (
          <Card>
            <CardHeader><CardTitle>Verify Your Monthly Income</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="monthlyIncome">Monthly Income</Label>
                <Input 
                  id="monthlyIncome" 
                  type="number" 
                  value={monthlyIncome} 
                  onChange={(e) => setMonthlyIncome(parseFloat(e.target.value) || 0)}
                  placeholder="Enter your average monthly income" 
                />
                <p className="text-sm text-muted-foreground">
                  Entered Income: {convertNgnToUsd(monthlyIncome) !== null 
                    ? formatPossiblyConvertedCurrency(convertNgnToUsd(monthlyIncome)!) 
                    : "Loading..."}
                </p>
              </div>
              <Button onClick={fetchTransactionHistory} disabled={loading}>
                {loading ? 'Reloading History...' : 'Reload Transaction History'}
              </Button>
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card>
            <CardHeader><CardTitle>Analyze Your Expenses</CardTitle></CardHeader>
            <CardContent>
              <p className="mb-4">Review your recent transactions to understand spending patterns.</p>
              {loading && <p>Loading transactions...</p>}
              {error && <p className="text-red-500 text-sm">{error}</p>}
              {!loading && !error && transactions.length === 0 && <p>No transactions found.</p>}
              {!loading && !error && transactions.length > 0 && (
                <div className="max-h-80 overflow-y-auto border rounded-md p-2">
                  {transactions.map((t, index) => (
                    <div key={index} className="text-sm py-1 border-b last:border-b-0">
                      {t.date}: {t.description} - 
                      <span className={t.category_type === 'INCOME' ? 'text-green-600' : 'text-red-600'}>
                        {convertNgnToUsd(t.amount) !== null 
                          ? formatPossiblyConvertedCurrency(convertNgnToUsd(t.amount)!) 
                          : "N/A"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 3:
        const totalAllocated = budgetCategories.reduce((sum, cat) => sum + cat.allocated_amount, 0);
        const remainingToAllocate = monthlyIncome - totalAllocated;
        return (
          <Card>
            <CardHeader><CardTitle>Allocate Your Budget</CardTitle></CardHeader>
            <CardContent>
              <p className="mb-4">
                Allocate your monthly income ({convertNgnToUsd(monthlyIncome) !== null 
                  ? formatPossiblyConvertedCurrency(convertNgnToUsd(monthlyIncome)!) 
                  : "Loading..."}) across different categories.
              </p>
              <div className="space-y-2">
                {budgetCategories.map((cat, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span>{cat.category_name} ({cat.percentage}%)</span>
                    <span>
                      {convertNgnToUsd(cat.allocated_amount) !== null 
                        ? formatPossiblyConvertedCurrency(convertNgnToUsd(cat.allocated_amount)!) 
                        : "N/A"}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between items-center font-semibold pt-2 border-t">
                   <span>Remaining to Allocate:</span>
                   <span>
                      {convertNgnToUsd(remainingToAllocate) !== null 
                        ? formatPossiblyConvertedCurrency(convertNgnToUsd(remainingToAllocate)!) 
                        : "N/A"}
                   </span>
                </div>
              </div>
            </CardContent>
          </Card>
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
    <div className="p-4 md:p-6 space-y-6">
      <Steps
        steps={STEPS}
        currentStep={currentStep}
        onStepClick={handleStepClick}
        className="mb-8"
      />

      <div className="mt-6">
        {renderStepContent()} 
      </div>

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
  );
}