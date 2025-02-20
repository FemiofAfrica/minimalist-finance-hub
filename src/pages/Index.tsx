
import { useState } from "react";
import { LayoutDashboard, Wallet, ArrowUpRight, ArrowDownRight, Activity, PieChart, CreditCard, Users } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import DashboardSidebar from "@/components/DashboardSidebar";
import { Card } from "@/components/ui/card";
import TransactionsTable from "@/components/TransactionsTable";
import RevenueChart from "@/components/RevenueChart";

const Index = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-slate-50 dark:bg-neutral-950">
        <DashboardSidebar />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <header className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Dashboard</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">Welcome back, Alex</p>
              </div>
              <div className="flex items-center space-x-4">
                <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
                  Add Transaction
                </button>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Balance</p>
                    <h3 className="text-2xl font-semibold mt-1">$24,563.00</h3>
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
                    <h3 className="text-2xl font-semibold mt-1">$8,942.00</h3>
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
                    <h3 className="text-2xl font-semibold mt-1">$6,175.00</h3>
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

            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Recent Transactions</h3>
                <button className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                  View All
                </button>
              </div>
              <TransactionsTable />
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Index;
