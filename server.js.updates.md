# Server.js Updates

The following updates need to be made to the server.js file to complete the Express API implementation:

## 1. Add Account Transactions Endpoint

```javascript
// Get transactions for a specific account
app.get('/api/accounts/:id/transactions', async (req, res) => {
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
      return res.status(403).json({ error: 'Not authorized to access this account' });
    }
    
    // Get transactions for the account
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        accounts (name),
        categories (category_name, category_type)
      `)
      .eq('user_id', userId)
      .eq('account_id', id)
      .order('date', { ascending: false });
      
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching account transactions:', error);
    res.status(500).json({ error: 'Failed to fetch account transactions' });
  }
});
```

## 2. Add Card Transactions Endpoint

```javascript
// Get transactions for a specific card
app.get('/api/cards/:id/transactions', async (req, res) => {
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
      return res.status(403).json({ error: 'Not authorized to access this card' });
    }
    
    // Get transactions for the card
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        accounts (name),
        categories (category_name, category_type)
      `)
      .eq('user_id', userId)
      .eq('card_id', id)
      .order('date', { ascending: false });
      
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching card transactions:', error);
    res.status(500).json({ error: 'Failed to fetch card transactions' });
  }
});
```

## 3. Add Default Account Endpoint

```javascript
// Get or create default account
app.get('/api/accounts/default', async (req, res) => {
  try {
    const userId = req.query.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }
    
    const defaultAccountName = 'Default Account';
    
    // Try to fetch the existing default account
    const { data: existingAccount, error: fetchError } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('name', defaultAccountName)
      .maybeSingle();
      
    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
    
    // If account exists, return it
    if (existingAccount) {
      return res.json(existingAccount);
    }
    
    // Create default account
    const defaultAccountData = {
      user_id: userId,
      name: defaultAccountName,
      type: 'savings',
      balance: 0,
      currency: 'NGN',
      is_active: true
    };
    
    const { data: newAccount, error: createError } = await supabase
      .from('accounts')
      .insert(defaultAccountData)
      .select()
      .single();
      
    if (createError) throw createError;
    
    res.json(newAccount);
  } catch (error) {
    console.error('Error getting default account:', error);
    res.status(500).json({ error: 'Failed to get default account' });
  }
});
```

## 4. Add Search Endpoints

```javascript
// Search transactions by description
app.get('/api/search/transactions', async (req, res) => {
  try {
    const { userId, query } = req.query;
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }
    
    if (!query || query.trim().length < 2) {
      return res.json([]);
    }
    
    // Search for transactions with a similar description
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        accounts (name)
      `)
      .eq('user_id', userId)
      .ilike('description', `%${query}%`)
      .order('date', { ascending: false })
      .limit(5);
      
    if (error) throw error;
    
    // Process the transactions to include account names
    const enrichedTransactions = data.map(transaction => {
      const processedTransaction = {
        ...transaction,
        account_name: transaction.accounts ? transaction.accounts.name : null
      };
      
      return processedTransaction;
    });
    
    // Return unique transactions based on description
    const uniqueTransactions = Array.from(
      new Map(enrichedTransactions.map(item => [item.description, item]))
      .values()
    );
    
    res.json(uniqueTransactions);
  } catch (error) {
    console.error('Error searching transactions:', error);
    res.status(500).json({ error: 'Failed to search transactions' });
  }
});

// Search accounts and cards by name
app.get('/api/search/accounts-and-cards', async (req, res) => {
  try {
    const { userId, query } = req.query;
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }
    
    if (!query || query.trim().length < 2) {
      return res.json({ accounts: [], cards: [] });
    }
    
    // Search for accounts with similar names
    const { data: accountsData, error: accountsError } = await supabase
      .from('accounts')
      .select('account_id, name')
      .eq('user_id', userId)
      .ilike('name', `%${query}%`)
      .limit(3);
      
    if (accountsError) throw accountsError;
    
    // Search for cards with similar names
    const { data: cardsData, error: cardsError } = await supabase
      .from('cards')
      .select('card_id, name')
      .eq('user_id', userId)
      .ilike('name', `%${query}%`)
      .limit(3);
      
    if (cardsError) throw cardsError;
    
    // Format the results
    const accounts = accountsData.map(account => ({
      id: account.account_id,
      name: account.name,
      type: 'account'
    }));
    
    const cards = cardsData.map(card => ({
      id: card.card_id,
      name: card.name,
      type: 'card'
    }));
    
    res.json({ accounts, cards });
  } catch (error) {
    console.error('Error searching accounts and cards:', error);
    res.status(500).json({ error: 'Failed to search accounts and cards' });
  }
});
```

## 5. Add Subscription Conversion Endpoint

```javascript
// Convert subscription to transaction
app.