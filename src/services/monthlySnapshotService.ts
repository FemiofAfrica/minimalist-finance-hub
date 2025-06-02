import { supabase } from '@/integrations/supabase/client';

export interface MonthlySnapshot {
  snapshot_id: string;
  user_id: string;
  year: number;
  month: number;
  opening_balance: number;
  closing_balance: number;
  total_income: number;
  total_expenses: number;
  transaction_count: number;
  created_at: string;
  updated_at: string;
}

export interface CurrentMonthData {
  balance: number;
  income: number;
  expense: number;
  transactionCount: number;
  balanceChange: number;
  incomeChange: number;
  expenseChange: number;
  transactionCountChange: number;
}

// Check if monthly_snapshots table exists
let tableExists: boolean | null = null;

const checkTableExists = async (): Promise<boolean> => {
  if (tableExists !== null) return tableExists;
  
  try {
    const { data, error } = await supabase
      .from('monthly_snapshots')
      .select('snapshot_id')
      .limit(1);
    
    if (error && error.code === 'PGRST106') {
      // Table doesn't exist
      tableExists = false;
      return false;
    }
    
    tableExists = true;
    return true;
  } catch (error) {
    tableExists = false;
    return false;
  }
};

/**
 * Calculate and update monthly snapshot for a specific month
 */
export const calculateMonthlySnapshot = async (year: number, month: number): Promise<void> => {
  const exists = await checkTableExists();
  if (!exists) {
    console.log('Monthly snapshots table not available, skipping...');
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase.rpc('calculate_monthly_snapshot', {
    p_user_id: user.id,
    p_year: year,
    p_month: month
  });

  if (error) {
    console.error('Error calculating monthly snapshot:', error);
    throw error;
  }
};

/**
 * Get monthly snapshots for the last N months
 */
export const getMonthlySnapshots = async (limit: number = 12): Promise<MonthlySnapshot[]> => {
  const exists = await checkTableExists();
  if (!exists) {
    console.log('Monthly snapshots table not available, returning empty array');
    return [];
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('monthly_snapshots')
    .select('*')
    .eq('user_id', user.id)
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching monthly snapshots:', error);
    throw error;
  }

  return data || [];
};

/**
 * Get specific monthly snapshot
 */
export const getMonthlySnapshot = async (year: number, month: number): Promise<MonthlySnapshot | null> => {
  const exists = await checkTableExists();
  if (!exists) {
    return null;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('monthly_snapshots')
    .select('*')
    .eq('user_id', user.id)
    .eq('year', year)
    .eq('month', month)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No data found
      return null;
    }
    console.error('Error fetching monthly snapshot:', error);
    throw error;
  }

  return data;
};

/**
 * Calculate historical balance for a specific month using transactions
 */
const calculateHistoricalBalance = async (year: number, month: number): Promise<number> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Get all transactions up to the end of the specified month
  const endDate = new Date(year, month, 0); // Last day of the month
  
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .lte('date', endDate.toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (error) {
    throw error;
  }

  let balance = 0;
  if (transactions) {
    transactions.forEach(transaction => {
      if (transaction.type === 'income') {
        balance += Number(transaction.amount);
      } else if (transaction.type === 'expense') {
        balance -= Math.abs(Number(transaction.amount));
      }
    });
  }

  return balance;
};

/**
 * Calculate current month data with proper balance carryover
 */
export const getCurrentMonthData = async (): Promise<CurrentMonthData> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  try {
    const exists = await checkTableExists();
    
    if (exists) {
      // Try to use the snapshot system
      await calculateMonthlySnapshot(currentYear, currentMonth);
      
      const currentSnapshot = await getMonthlySnapshot(currentYear, currentMonth);
      const previousSnapshot = await getMonthlySnapshot(previousYear, previousMonth);

      if (currentSnapshot) {
        const calcPercentChange = (current: number, previous: number) => {
          if (previous === 0) return current > 0 ? 100 : 0;
          return Math.round(((current - previous) / previous) * 100);
        };

        const balance = currentSnapshot.closing_balance;
        const income = currentSnapshot.total_income;
        const expense = currentSnapshot.total_expenses;
        const transactionCount = currentSnapshot.transaction_count;

        const prevBalance = previousSnapshot?.closing_balance || 0;
        const prevIncome = previousSnapshot?.total_income || 0;
        const prevExpense = previousSnapshot?.total_expenses || 0;
        const prevTransactionCount = previousSnapshot?.transaction_count || 0;

        return {
          balance,
          income,
          expense,
          transactionCount,
          balanceChange: calcPercentChange(balance, prevBalance),
          incomeChange: calcPercentChange(income, prevIncome),
          expenseChange: calcPercentChange(expense, prevExpense),
          transactionCountChange: calcPercentChange(transactionCount, prevTransactionCount)
        };
      }
    }
    
    // Fallback to enhanced manual calculation with proper balance carryover
    return await calculateCurrentMonthManuallyEnhanced();

  } catch (error) {
    console.error('Error fetching current month data:', error);
    // Fallback to enhanced manual calculation
    return await calculateCurrentMonthManuallyEnhanced();
  }
};

/**
 * Enhanced manual calculation with proper balance carryover
 */
const calculateCurrentMonthManuallyEnhanced = async (): Promise<CurrentMonthData> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Fetch transactions for calculations
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false });

  if (error) {
    throw error;
  }

  // Calculate totals
  let currentMonthIncome = 0;
  let currentMonthExpense = 0;
  let currentMonthCount = 0;
  let previousMonthIncome = 0;
  let previousMonthExpense = 0;
  let previousMonthCount = 0;

  // Get current month and previous month dates
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

  // Calculate historical balance up to the end of previous month
  const previousMonthEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
  let historicalBalance = 0;

  if (transactions) {
    // First, calculate the balance up to the end of previous month
    transactions.forEach(transaction => {
      const transDate = new Date(transaction.date);
      
      if (transDate <= previousMonthEndDate) {
        if (transaction.type === 'income') {
          historicalBalance += Number(transaction.amount);
        } else if (transaction.type === 'expense') {
          historicalBalance -= Math.abs(Number(transaction.amount));
        }
      }
      
      // Current month calculations
      if (transaction.date >= currentMonthStart) {
        if (transaction.type === 'income') {
          currentMonthIncome += Number(transaction.amount);
        } else if (transaction.type === 'expense') {
          currentMonthExpense += Math.abs(Number(transaction.amount));
        }
        currentMonthCount++;
      }
      
      // Previous month calculations
      if (transaction.date >= previousMonthStart && transaction.date <= previousMonthEnd) {
        if (transaction.type === 'income') {
          previousMonthIncome += Number(transaction.amount);
        } else if (transaction.type === 'expense') {
          previousMonthExpense += Math.abs(Number(transaction.amount));
        }
        previousMonthCount++;
      }
    });
  }

  // Current balance = historical balance + current month's net change
  const currentBalance = historicalBalance + currentMonthIncome - currentMonthExpense;
  
  // Calculate percentage changes
  const calcPercentChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  return {
    balance: currentBalance,
    income: currentMonthIncome,
    expense: currentMonthExpense,
    transactionCount: currentMonthCount,
    balanceChange: calcPercentChange(currentBalance, historicalBalance),
    incomeChange: calcPercentChange(currentMonthIncome, previousMonthIncome),
    expenseChange: calcPercentChange(currentMonthExpense, previousMonthExpense),
    transactionCountChange: calcPercentChange(currentMonthCount, previousMonthCount)
  };
};

/**
 * Fallback manual calculation for current month data (legacy)
 */
const calculateCurrentMonthManually = async (): Promise<CurrentMonthData> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Fetch transactions for calculations
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false });

  if (error) {
    throw error;
  }

  // Calculate totals
  let currentMonthIncome = 0;
  let currentMonthExpense = 0;
  let currentMonthCount = 0;
  let previousMonthIncome = 0;
  let previousMonthExpense = 0;
  let previousMonthCount = 0;

  // Get current month and previous month dates
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

  // Get opening balance from previous month's snapshot
  const previousYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const previousMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const previousSnapshot = await getMonthlySnapshot(previousYear, previousMonth);
  const openingBalance = previousSnapshot?.closing_balance || 0;

  if (transactions) {
    transactions.forEach(transaction => {
      // Current month calculations
      if (transaction.date >= currentMonthStart) {
        if (transaction.type === 'income') {
          currentMonthIncome += Number(transaction.amount);
        } else if (transaction.type === 'expense') {
          currentMonthExpense += Math.abs(Number(transaction.amount));
        }
        currentMonthCount++;
      }
      
      // Previous month calculations
      if (transaction.date >= previousMonthStart && transaction.date <= previousMonthEnd) {
        if (transaction.type === 'income') {
          previousMonthIncome += Number(transaction.amount);
        } else if (transaction.type === 'expense') {
          previousMonthExpense += Math.abs(Number(transaction.amount));
        }
        previousMonthCount++;
      }
    });
  }

  // Calculate current balance with carryover
  const currentBalance = openingBalance + currentMonthIncome - currentMonthExpense;
  const previousBalance = previousSnapshot?.closing_balance || 0;

  // Calculate percentage changes
  const calcPercentChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  return {
    balance: currentBalance,
    income: currentMonthIncome,
    expense: currentMonthExpense,
    transactionCount: currentMonthCount,
    balanceChange: calcPercentChange(currentBalance, previousBalance),
    incomeChange: calcPercentChange(currentMonthIncome, previousMonthIncome),
    expenseChange: calcPercentChange(currentMonthExpense, previousMonthExpense),
    transactionCountChange: calcPercentChange(currentMonthCount, previousMonthCount)
  };
};

/**
 * Initialize snapshots for existing data
 */
export const initializeSnapshotsForExistingData = async (): Promise<void> => {
  const exists = await checkTableExists();
  if (!exists) {
    console.log('Monthly snapshots table not available, skipping initialization');
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Get all unique year-month combinations from transactions
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('date')
    .eq('user_id', user.id);

  if (error) {
    console.error('Error fetching transactions for initialization:', error);
    throw error;
  }

  if (!transactions || transactions.length === 0) {
    return;
  }

  // Extract unique year-month combinations
  const yearMonths = new Set<string>();
  transactions.forEach(transaction => {
    const date = new Date(transaction.date);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    yearMonths.add(`${year}-${month}`);
  });

  // Calculate snapshots for each month
  for (const yearMonth of Array.from(yearMonths).sort()) {
    const [year, month] = yearMonth.split('-').map(Number);
    try {
      await calculateMonthlySnapshot(year, month);
    } catch (error) {
      console.error(`Error calculating snapshot for ${year}-${month}:`, error);
    }
  }
};

/**
 * Check if user has data spanning more than 1 month (for historical reporting)
 */
export const hasMultipleMonthsOfData = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Check if monthly_snapshots table exists and has data
    const { data: snapshots, error: snapshotsError } = await supabase
      .from('monthly_snapshots')
      .select('year, month')
      .eq('user_id', user.id)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(2);

    if (!snapshotsError && snapshots && snapshots.length >= 2) {
      return true;
    }

    // Fallback: Check transactions directly for multiple months
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('date')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (transactionsError) {
      console.error('Error checking transaction history:', transactionsError);
      return false;
    }

    if (!transactions || transactions.length === 0) {
      return false;
    }

    // Get unique year-month combinations
    const uniqueMonths = new Set<string>();
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const yearMonth = `${date.getFullYear()}-${date.getMonth() + 1}`;
      uniqueMonths.add(yearMonth);
    });

    return uniqueMonths.size > 1;
  } catch (error) {
    console.error('Error checking for multiple months of data:', error);
    return false;
  }
};

/**
 * Get monthly snapshots for the last N months (excluding current month)
 * This is used for historical reporting where we only want completed months
 */
export const getHistoricalMonthlySnapshots = async (limit: number = 12): Promise<MonthlySnapshot[]> => {
  const exists = await checkTableExists();
  if (!exists) {
    console.log('Monthly snapshots table not available, returning empty array');
    return [];
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Get current month and year to exclude from historical data
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed

  const { data, error } = await supabase
    .from('monthly_snapshots')
    .select('*')
    .eq('user_id', user.id)
    // Exclude current month using proper filter logic
    .or(`year.lt.${currentYear},and(year.eq.${currentYear},month.lt.${currentMonth})`)
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching historical monthly snapshots:', error);
    throw error;
  }

  return data || [];
}; 