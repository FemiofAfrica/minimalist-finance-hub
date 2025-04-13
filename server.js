import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();

// Use a different port to avoid conflicts
const PORT = 3456;
console.log(`Using port: ${PORT}`);

// Supabase client initialization
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Middleware
app.use(express.json());

// Serve static files from the Vite build
app.use(express.static(path.join(__dirname, 'dist')));

// API Routes

// Authentication endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: error.message || 'Authentication failed' });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, first_name, last_name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name,
          last_name
        }
      }
    });
    
    if (error) throw error;
    
    res.status(201).json(data);
  } catch (error) {
    console.error('Signup error:', error);
    res.status(400).json({ error: error.message || 'Registration failed' });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`
    });
    
    if (error) throw error;
    
    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(400).json({ error: error.message || 'Failed to send reset email' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { password } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!password || !token) {
      return res.status(400).json({ error: 'Password and token are required' });
    }
    
    const { error } = await supabase.auth.updateUser({
      password
    });
    
    if (error) throw error;
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password update error:', error);
    res.status(400).json({ error: error.message || 'Failed to update password' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) throw error;
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: error.message || 'Failed to logout' });
  }
});

// Authentication middleware
const authenticateUser = async (req, res, next) => {
  // Get the token from the request headers
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    // If no token is provided, check if userId is in query params or body
    // This is a simplified approach - in production, always use proper auth
    const userId = req.query.userId || req.body.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Validate that the userId exists in the database
    try {
      // Check the profiles table directly - this is more reliable
      // Log the userId being checked for debugging
      console.log('Validating userId:', userId);
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_id')
        .or(`id.eq.${userId},user_id.eq.${userId}`)
        .single();
        
      if (profileError) {
        console.error('Profile query error:', profileError);
        
        // If profile check fails, try auth.users as fallback
        try {
          const { data: authData, error: authError } = await supabase.auth.getUser();
          
          // If we have a valid user and their ID matches the requested userId
          if (!authError && authData?.user && authData.user.id === userId) {
            req.userId = userId;
            return next();
          } else {
            console.error('User validation failed, invalid user ID');
            return res.status(401).json({ error: 'Invalid user ID' });
          }
        } catch (authCheckError) {
          console.error('Auth check error:', authCheckError);
          return res.status(401).json({ error: 'Authentication failed' });
        }
      }
      
      if (!profileData) {
        console.error('User not found in profiles');
        return res.status(401).json({ error: 'Invalid user ID' });
      }
      
      req.userId = userId;
      return next();
    } catch (validationError) {
      console.error('User validation error:', validationError);
      return res.status(401).json({ error: 'Invalid user ID' });
    }
  }
  
  try {
    // Verify the token with Supabase
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      throw error || new Error('Invalid token');
    }
    
    // Add the user to the request object
    req.user = data.user;
    req.userId = data.user.id;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Invalid authentication token' });
  }
};

// Transactions API
app.get('/api/transactions', async (req, res) => {
  try {
    const userId = req.query.userId;
    const limit = parseInt(req.query.limit) || 10;
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }
    
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit);
      
    if (error) throw error;
    
    // Calculate totals
    const totalIncome = data
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
      
    const totalExpenses = data
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
    const netBalance = totalIncome - totalExpenses;
    
    res.json({ 
      transactions: data, 
      totalIncome, 
      totalExpenses, 
      netBalance 
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get transaction by ID
app.get('/api/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.query.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }
    
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        accounts (name),
        categories (category_name, category_type)
      `)
      .eq('transaction_id', id)
      .eq('user_id', userId)
      .single();
      
    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// Create transaction
app.post('/api/transactions', async (req, res) => {
  try {
    const { userId, transaction } = req.body;
    
    if (!userId || !transaction) {
      return res.status(400).json({ error: 'User ID and transaction data are required' });
    }
    
    const { data, error } = await supabase
      .from('transactions')
      .insert([{ ...transaction, user_id: userId }])
      .select();
      
    if (error) throw error;
    
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// Update transaction
app.put('/api/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, transaction } = req.body;
    
    if (!userId || !transaction) {
      return res.status(400).json({ error: 'User ID and transaction data are required' });
    }
    
    // Verify the transaction belongs to the user
    const { data: existingTransaction, error: checkError } = await supabase
      .from('transactions')
      .select('user_id')
      .eq('transaction_id', id)
      .single();
      
    if (checkError) throw checkError;
    
    if (!existingTransaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    if (existingTransaction.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this transaction' });
    }
    
    // Update the transaction
    const { data, error } = await supabase
      .from('transactions')
      .update({ ...transaction })
      .eq('transaction_id', id)
      .select();
      
    if (error) throw error;
    
    res.json(data[0]);
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// Delete transaction
app.delete('/api/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.query.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }
    
    // Verify the transaction belongs to the user
    const { data: existingTransaction, error: checkError } = await supabase
      .from('transactions')
      .select('user_id')
      .eq('transaction_id', id)
      .single();
      
    if (checkError) throw checkError;
    
    if (!existingTransaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    if (existingTransaction.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this transaction' });
    }
    
    // Delete the transaction
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('transaction_id', id);
      
    if (error) throw error;
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// Category expenses for charts
app.get('/api/category-expenses', async (req, res) => {
  try {
    const userId = req.query.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }
    
    // Get current month's start and end dates
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    
    // Fetch transactions with category information
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        amount,
        category_id,
        categories (category_name)
      `)
      .eq('user_id', userId)
      .eq('type', 'expense')
      .gte('date', startOfMonth)
      .lte('date', endOfMonth);
    
    if (error) throw error;
    
    // Group expenses by category
    const categoryMap = new Map();
    
    data?.forEach((transaction) => {
      if (transaction.categories && transaction.categories.category_name) {
        const categoryName = transaction.categories.category_name;
        const amount = Math.abs(Number(transaction.amount));
        
        if (categoryMap.has(categoryName)) {
          categoryMap.set(categoryName, categoryMap.get(categoryName) + amount);
        } else {
          categoryMap.set(categoryName, amount);
        }
      }
    });
    
    // Convert map to array format needed for the pie chart
    const result = Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value); // Sort by value descending
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching category expenses:', error);
    res.status(500).json({ error: 'Failed to fetch category expenses' });
  }
});

// Monthly revenue data for charts
app.get('/api/monthly-revenue', async (req, res) => {
  try {
    const userId = req.query.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }
    
    // Get the last 6 months
    const now = new Date();
    const months = [];
    
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        name: month.toLocaleString('default', { month: 'short' }),
        startDate: new Date(month.getFullYear(), month.getMonth(), 1).toISOString(),
        endDate: new Date(month.getFullYear(), month.getMonth() + 1, 0).toISOString()
      });
    }
    
    // Prepare result array with months
    const result = months.map(month => ({
      name: month.name,
      income: 0,
      expenses: 0
    }));
    
    // Fetch transactions for the last 6 months
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();
    
    const { data, error } = await supabase
      .from('transactions')
      .select('amount, date, type')
      .eq('user_id', userId)
      .gte('date', sixMonthsAgo)
      .lte('date', now.toISOString());
      
    if (error) throw error;
    
    // Process transactions and group by month
    data?.forEach(transaction => {
      const transactionDate = new Date(transaction.date);
      const monthIndex = months.findIndex(month => {
        const startDate = new Date(month.startDate);
        const endDate = new Date(month.endDate);
        return transactionDate >= startDate && transactionDate <= endDate;
      });
      
      if (monthIndex !== -1) {
        const amount = Math.abs(Number(transaction.amount));
        if (transaction.type === 'income') {
          result[monthIndex].income += amount;
        } else if (transaction.type === 'expense') {
          result[monthIndex].expenses += amount;
        }
      }
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching monthly revenue:', error);
    res.status(500).json({ error: 'Failed to fetch monthly revenue' });
  }
});

// Dashboard analytics API
app.get('/api/dashboard-analytics', async (req, res) => {
  try {
    const userId = req.query.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }
    
    // Fetch account balances
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('balance')
      .eq('user_id', userId);
      
    if (accountsError) throw accountsError;
    
    // Calculate total balance
    const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
    
    // Get current month transactions
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    
    const { data: currentMonthTransactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', firstDayOfMonth)
      .lte('date', lastDayOfMonth);
      
    if (transactionsError) throw transactionsError;
    
    // Calculate monthly totals
    const totalIncome = currentMonthTransactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
      
    const totalExpense = currentMonthTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    // Get previous month for comparison
    const firstDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const lastDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();
    
    const { data: prevMonthTransactions, error: prevTransactionsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', firstDayOfPrevMonth)
      .lte('date', lastDayOfPrevMonth);
      
    if (prevTransactionsError) throw prevTransactionsError;
    
    // Calculate previous month totals
    const prevTotalIncome = prevMonthTransactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
      
    const prevTotalExpense = prevMonthTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    // Calculate percentage changes
    const incomeChange = prevTotalIncome === 0 ? 100 : ((totalIncome - prevTotalIncome) / prevTotalIncome) * 100;
    const expenseChange = prevTotalExpense === 0 ? 100 : ((totalExpense - prevTotalExpense) / prevTotalExpense) * 100;
    const balanceChange = (totalIncome - totalExpense) - (prevTotalIncome - prevTotalExpense);
    
    res.json({
      totalBalance,
      totalIncome,
      totalExpense,
      monthlyTransactionCount: currentMonthTransactions.length,
      incomeChange,
      expenseChange,
      balanceChange
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Account endpoints
app.get('/api/accounts', async (req, res) => {
  try {
    const userId = req.query.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }
    
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId);
      
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

app.post('/api/accounts', async (req, res) => {
  try {
    const { userId, account } = req.body;
    
    if (!userId || !account) {
      return res.status(400).json({ error: 'User ID and account data are required' });
    }
    
    const { data, error } = await supabase
      .from('accounts')
      .insert([{ ...account, user_id: userId }])
      .select();
      
    if (error) throw error;
    
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

app.put('/api/accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, account } = req.body;
    
    if (!userId || !account) {
      return res.status(400).json({ error: 'User ID and account data are required' });
    }
    
    // Verify the account belongs to the user
    const { data: existingAccount, error: checkError } = await supabase
      .from('accounts')
      .select('user_id')
      .eq('account_id', id)
      .single();
      
    if (checkError) throw checkError;
    
    if (!existingAccount) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    if (existingAccount.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this account' });
    }
    
    // Update the account
    const { data, error } = await supabase
      .from('accounts')
      .update({ ...account })
      .eq('account_id', id)
      .select();
      
    if (error) throw error;
    
    res.json(data[0]);
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({ error: 'Failed to update account' });
  }
});

app.delete('/api/accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.query.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }
    
    // Verify the account belongs to the user
    const { data: existingAccount, error: checkError } = await supabase
      .from('accounts')
      .select('user_id')
      .eq('account_id', id)
      .single();
      
    if (checkError) throw checkError;
    
    if (!existingAccount) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    if (existingAccount.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this account' });
    }
    
    // Delete the account
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('account_id', id);
      
    if (error) throw error;
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// Card endpoints
app.get('/api/cards', async (req, res) => {
  try {
    const userId = req.query.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }
    
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('user_id', userId);
      
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching cards:', error);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

app.post('/api/cards', async (req, res) => {
  try {
    const { userId, card } = req.body;
    
    if (!userId || !card) {
      return res.status(400).json({ error: 'User ID and card data are required' });
    }
    
    const { data, error } = await supabase
      .from('cards')
      .insert([{ ...card, user_id: userId }])
      .select();
      
    if (error) throw error;
    
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error creating card:', error);
    res.status(500).json({ error: 'Failed to create card' });
  }
});

app.put('/api/cards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, card } = req.body;
    
    if (!userId || !card) {
      return res.status(400).json({ error: 'User ID and card data are required' });
    }
    
    // Verify the card belongs to the user
    const { data: existingCard, error: checkError } = await supabase
      .from('cards')
      .select('user_id')
      .eq('card_id', id)
      .single();
      
    if (checkError) throw checkError;
    
    if (!existingCard) {
      return res.status(404).json({ error: 'Card not found' });
    }
    
    if (existingCard.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this card' });
    }
    
    // Update the card
    const { data, error } = await supabase
      .from('cards')
      .update({ ...card })
      .eq('card_id', id)
      .select();
      
    if (error) throw error;
    
    res.json(data[0]);
  } catch (error) {
    console.error('Error updating card:', error);
    res.status(500).json({ error: 'Failed to update card' });
  }
});

app.delete('/api/cards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.query.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }
    
    // Verify the card belongs to the user
    const { data: existingCard, error: checkError } = await supabase
      .from('cards')
      .select('user_id')
      .eq('card_id', id)
      .single();
      
    if (checkError) throw checkError;
    
    if (!existingCard) {
      return res.status(404).json({ error: 'Card not found' });
    }
    
    if (existingCard.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this card' });
    }
    
    // Delete the card
    const { error } = await supabase
      .from('cards')
      .delete()
      .eq('card_id', id);
      
    if (error) throw error;
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting card:', error);
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

// Subscription endpoints
app.get('/api/subscriptions', async (req, res) => {
  try {
    const userId = req.query.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }
    
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId);
      
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

app.post('/api/subscriptions', async (req, res) => {
  try {
    const { userId, subscription } = req.body;
    
    if (!userId || !subscription) {
      return res.status(400).json({ error: 'User ID and subscription data are required' });
    }
    
    const { data, error } = await supabase
      .from('subscriptions')
      .insert([{ ...subscription, user_id: userId }])
      .select();
      
    if (error) throw error;
    
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

app.put('/api/subscriptions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, subscription } = req.body;
    
    if (!userId || !subscription) {
      return res.status(400).json({ error: 'User ID and subscription data are required' });
    }
    
    // Verify the subscription belongs to the user
    const { data: existingSubscription, error: checkError } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('subscription_id', id)
      .single();
      
    if (checkError) throw checkError;
    
    if (!existingSubscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    if (existingSubscription.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this subscription' });
    }
    
    // Update the subscription
    const { data, error } = await supabase
      .from('subscriptions')
      .update({ ...subscription })
      .eq('subscription_id', id)
      .select();
      
    if (error) throw error;
    
    res.json(data[0]);
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

app.delete('/api/subscriptions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.query.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }
    
    // Verify the subscription belongs to the user
    const { data: existingSubscription, error: checkError } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('subscription_id', id)
      .single();
      
    if (checkError) throw checkError;
    
    if (!existingSubscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    if (existingSubscription.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this subscription' });
    }
    
    // Delete the subscription
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('subscription_id', id);
      
    if (error) throw error;
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting subscription:', error);
    res.status(500).json({ error: 'Failed to delete subscription' });
  }
});

// Catch-all route to serve the SPA for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});