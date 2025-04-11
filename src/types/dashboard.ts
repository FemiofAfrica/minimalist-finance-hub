export type CategoryExpense = {
  name: string;
  value: number;
};

export type DashboardAnalytics = {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  monthlyTransactionCount: number;
  incomeChange: number;
  expenseChange: number;
  balanceChange: number;
};