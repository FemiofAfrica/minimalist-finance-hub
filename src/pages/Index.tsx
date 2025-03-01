
import { LayoutDashboard, Wallet, ArrowUpRight, ArrowDownRight, Activity, PieChart, CreditCard, Users, LogOut } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { SidebarProvider } from "@/components/ui/sidebar";
import DashboardSidebar from "@/components/DashboardSidebar";
import { Card } from "@/components/ui/card";
import TransactionsTable from "@/components/TransactionsTable";
import RevenueChart from "@/components/RevenueChart";
import ChatInput from "@/components/ChatInput";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);

  const fetchTransactionTotals = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*');
      
      if (error) throw error;
      
      let incomeTotal = 0;
      let expenseTotal = 0;
      
      (data || []).forEach(transaction => {
        if (transaction.category_type === "INCOME") {
          incomeTotal += Number(transaction.amount);
        } else if (transaction.category_type === "EXPENSE") {
          expenseTotal += Number(transaction.amount);
        }
      });
      
      setTotalIncome(incomeTotal);
      setTotalExpense(expenseTotal);
      setTotalBalance(incomeTotal - expenseTotal);
    } catch (error) {
      console.error("Error fetching transaction totals:", error);
    }
  };

  useEffect(() => {
    fetchTransactionTotals();
    
    // Set up event listener for the refresh event
    const handleRefresh = () => {
      fetchTransactionTotals();
    };
    
    document.addEventListener('refresh', handleRefresh);
    
    return () => {
      document.removeEventListener('refresh', handleRefresh);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
      toast({
        title: "Signed out",
        description: "You have been successfully signed out."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive"
      });
    }
  };

  const handleTransactionAdded = () => {
    // Force a refresh of transaction data
    fetchTransactionTotals();
    
    // Manually dispatch a refresh event to update the transactions table
    const refreshEvent = new Event('refresh');
    document.dispatchEvent(refreshEvent);
  };

  // Format currency
  const formatNaira = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  return <SidebarProvider>
      <div className="min-h-screen flex w-full bg-slate-50 dark:bg-neutral-950">
        <DashboardSidebar />
        <main className="flex-1 p-6 flex flex-col">
          <div className="max-w-7xl mx-auto space-y-6 flex-1 w-full">
            <header className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Dashboard</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">Welcome back, {user?.email}</p>
              </div>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </header>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Recent Transactions</h3>
                <button 
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  onClick={() => navigate('/transactions')}
                >
                  View All
                </button>
              </div>
              <ChatInput onTransactionAdded={handleTransactionAdded} />
              <div className="mt-6">
                <TransactionsTable />
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Balance</p>
                    <h3 className="text-2xl font-semibold mt-1">{formatNaira(totalBalance || 24563)}</h3>
                    <p className="text-sm text-emerald-600 flex items-center mt-1">
                      <ArrowUpRight className="w-4 h-4 mr-1" />
                      +2.5%
                    </p>
                  </div>
                  <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded-lg">
                    <Wallet className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Monthly Revenue</p>
                    <h3 className="text-2xl font-semibold mt-1">{formatNaira(totalIncome || 8942)}</h3>
                    <p className="text-sm text-destructive flex items-center mt-1">
                      <ArrowDownRight className="w-4 h-4 mr-1" />
                      -4.3%
                    </p>
                  </div>
                  <div className="bg-emerald-100 dark:bg-emerald-900/20 p-3 rounded-lg">
                    <Activity className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Expenses</p>
                    <h3 className="text-2xl font-semibold mt-1">{formatNaira(totalExpense || 6175)}</h3>
                    <p className="text-sm text-emerald-600 flex items-center mt-1">
                      <ArrowUpRight className="w-4 h-4 mr-1" />
                      +1.8%
                    </p>
                  </div>
                  <div className="bg-rose-100 dark:bg-rose-900/20 p-3 rounded-lg">
                    <CreditCard className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                  </div>
                </div>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Users</p>
                    <h3 className="text-2xl font-semibold mt-1">1,249</h3>
                    <p className="text-sm text-emerald-600 flex items-center mt-1">
                      <ArrowUpRight className="w-4 h-4 mr-1" />
                      +3.2%
                    </p>
                  </div>
                  <div className="bg-violet-100 dark:bg-violet-900/20 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
              <Card className="lg:col-span-4 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Revenue Overview</h3>
                  <select className="px-3 py-2 border rounded-lg text-sm bg-transparent">
                    <option>Last 7 days</option>
                    <option>Last 30 days</option>
                    <option>Last 90 days</option>
                  </select>
                </div>
                <RevenueChart />
              </Card>

              <Card className="lg:col-span-2 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Expenses by Category</h3>
                </div>
                <div className="h-[300px] flex items-center justify-center">
                  <PieChart className="w-32 h-32 text-slate-300 dark:text-slate-700" />
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>;
};
export default Index;
