import { useState, useEffect } from "react";
import PageLayout from "@/components/dashboard/PageLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getTransactions } from "@/services/transactionService";
import { getSubscriptions } from "@/services/subscriptionService";
import { Loader2, TrendingDown, TrendingUp, CreditCard, DollarSign } from "lucide-react";
import { useAuth } from "@/contexts";

// Simple placeholder chart component since we might not have the actual chart components
const ChartPlaceholder = ({ title }: { title: string }) => (
  <div className="h-[300px] flex items-center justify-center border border-dashed border-muted-foreground/50 rounded-md">
    <p className="text-muted-foreground">{title} visualization coming soon</p>
  </div>
);

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [period, setPeriod] = useState<"7days" | "30days" | "90days">("30days");
  const [summaryData, setSummaryData] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    netSavings: 0,
    totalSubscriptions: 0
  });
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch transactions and subscriptions
        const [transactionsData, subscriptionsData] = await Promise.all([
          getTransactions(),
          getSubscriptions()
        ]);

        setTransactions(transactionsData);
        setSubscriptions(subscriptionsData);

        // Calculate summary data
        const totalIncome = transactionsData
          .filter((t: any) => t.type === 'income')
          .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
        
        const totalExpenses = transactionsData
          .filter((t: any) => t.type === 'expense')
          .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
        
        const totalSubscriptions = subscriptionsData
          .reduce((sum: number, s: any) => sum + (s.amount || 0), 0);

        setSummaryData({
          totalIncome,
          totalExpenses,
          netSavings: totalIncome - totalExpenses,
          totalSubscriptions
        });
      } catch (error) {
        console.error("Error fetching report data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Reports</h1>
          <p className="text-muted-foreground">
            Analyze your income, expenses, and financial health over time.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summaryData.totalIncome)}</div>
              <p className="text-xs text-muted-foreground">All time income</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summaryData.totalExpenses)}</div>
              <p className="text-xs text-muted-foreground">All time expenses</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Savings</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summaryData.netSavings)}</div>
              <p className="text-xs text-muted-foreground">Total income minus expenses</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Subscription Costs</CardTitle>
              <CreditCard className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summaryData.totalSubscriptions)}</div>
              <p className="text-xs text-muted-foreground">Monthly recurring costs</p>
            </CardContent>
          </Card>
        </div>

        {/* Reports Content */}
        <Tabs defaultValue="overview" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
              <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            </TabsList>
            
            <Select value={period} onValueChange={(value) => setPeriod(value as any)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Select Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Income vs. Expenses</CardTitle>
                <CardDescription>
                  View your income and expenses over time to track your financial progress.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ChartPlaceholder title="Income vs. Expenses Trend" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Expenses by Category</CardTitle>
                <CardDescription>
                  Breakdown of your expenses to see where your money is going.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ChartPlaceholder title="Expense Categories Pie Chart" />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Top Expense Categories</CardTitle>
                <CardDescription>
                  Your highest spending categories for the selected period.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transactions
                    .filter((t: any) => t.type === 'expense')
                    .slice(0, 5)
                    .map((t: any, i: number) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="h-2 w-2 rounded-full bg-primary mr-2"></div>
                          <span>{t.category_name || 'Uncategorized'}</span>
                        </div>
                        <span className="font-medium">{formatCurrency(t.amount || 0)}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="income" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Income Sources</CardTitle>
                <CardDescription>
                  Analysis of your income streams and their contribution to your finances.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ChartPlaceholder title="Income Sources Chart" />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Income Stability</CardTitle>
                <CardDescription>
                  How regular and reliable are your income sources.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[200px]">
                <ChartPlaceholder title="Income Stability Metrics" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Costs</CardTitle>
                <CardDescription>
                  Track your recurring expenses and identify potential savings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {subscriptions.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No active subscriptions found.
                    </p>
                  ) : (
                    subscriptions.slice(0, 5).map((sub: any, i: number) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="h-2 w-2 rounded-full bg-primary mr-2"></div>
                          <span>{sub.name}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="font-medium">{formatCurrency(sub.amount || 0)}</span>
                          <span className="text-xs text-muted-foreground">{sub.frequency}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Annual Subscription Cost</CardTitle>
                <CardDescription>
                  What you spend on subscriptions throughout the year.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[200px]">
                <ChartPlaceholder title="Annual Subscription Costs" />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default Reports; 