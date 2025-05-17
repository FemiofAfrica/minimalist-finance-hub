# Fix for Category Schema Mismatch Issues

This document provides a step-by-step guide to resolve the mismatch between the categories table schema and the SQL functions that interact with it.

## The Problem

1. The actual `categories` table has columns `name` and `type`, but:
   - The database.types.ts file uses `category_name` and `category_type` 
   - The SQL functions are trying to use `category_type` instead of `type`
   - The app code expects category data from joins as `categories (category_name, category_type)`

2. This causes transactions to fail when they try to:
   - Create a new category based on transaction type
   - Find or update existing categories
   - Return category information in joins

## Solution Steps

### Step 1: Update the TransactionService.ts File (Client-side)

This file has been updated to use the correct column names in SQL queries:
- Changed category data references from `category_name` and `category_type` to `name` and `type`
- Updated all queries using the pattern `categories (name, type)` instead of `categories (category_name, category_type)`

### Step 2: Fix the Database Functions (Server-side)

Apply the SQL fixes to your Supabase instance using the SQL Editor:

1. Log in to your Supabase dashboard
2. Click on "SQL Editor" in the left navigation
3. Create a new query

### Step 3: Execute the create_transaction Function Fix

```sql
-- Fix the create_transaction function to correctly use the 'name' and 'type' columns
-- instead of 'category_name' and 'category_type' in the categories table
CREATE OR REPLACE FUNCTION create_transaction(transaction_data JSONB)
RETURNS JSON AS $$
DECLARE
  v_transaction_id UUID;
  v_account_id UUID;
  v_category_id UUID;
  v_user_id UUID;
  v_amount DECIMAL;
  v_type TEXT;
  v_balance_change DECIMAL;
  v_currency TEXT;
  v_category_name TEXT;
  v_category_type TEXT;
BEGIN
  -- Extract necessary data from the JSON input
  v_user_id := (transaction_data->>'user_id')::UUID;
  v_account_id := (transaction_data->>'account_id')::UUID;
  v_amount := (transaction_data->>'amount')::DECIMAL;
  v_type := transaction_data->>'type';
  v_currency := COALESCE(transaction_data->>'currency', 'NGN');
  v_category_name := transaction_data->>'category_name';
  
  -- Determine category type based on transaction type
  IF v_type = 'income' THEN
    v_category_type := 'income';
  ELSIF v_type = 'expense' THEN
    v_category_type := 'expense';
  ELSE
    v_category_type := 'transfer';
  END IF;
  
  -- Handle category
  v_category_id := (transaction_data->>'category_id')::UUID;
  
  -- If category name provided but no ID, find or create the category
  IF v_category_name IS NOT NULL AND v_category_id IS NULL THEN
    -- Try to find existing category using the name column
    SELECT category_id INTO v_category_id
    FROM categories
    WHERE user_id = v_user_id 
      AND LOWER(name) = LOWER(v_category_name)
      AND type = v_category_type;
      
    -- If not found, create new category
    IF v_category_id IS NULL THEN
      INSERT INTO categories (
        name,
        user_id,
        type
      ) VALUES (
        v_category_name,
        v_user_id,
        v_category_type
      )
      RETURNING category_id INTO v_category_id;
    END IF;
  END IF;
  
  -- Insert the transaction
  INSERT INTO transactions (
    user_id,
    account_id,
    category_id,
    description,
    amount,
    currency,
    date,
    type,
    notes
  ) VALUES (
    v_user_id,
    v_account_id,
    v_category_id,
    transaction_data->>'description',
    v_amount,
    v_currency,
    (transaction_data->>'date')::TIMESTAMP,
    v_type,
    transaction_data->>'notes'
  )
  RETURNING transaction_id INTO v_transaction_id;
  
  -- Update account balance if account_id is provided
  IF v_account_id IS NOT NULL THEN
    -- Determine balance change based on transaction type
    IF v_type = 'expense' THEN
      v_balance_change := -v_amount;
    ELSIF v_type = 'income' THEN
      v_balance_change := v_amount;
    ELSE
      -- For transfers, this will be handled separately
      v_balance_change := 0;
    END IF;
    
    -- Update the account balance
    UPDATE accounts
    SET 
      balance = balance + v_balance_change,
      updated_at = CURRENT_TIMESTAMP
    WHERE 
      account_id = v_account_id;
  END IF;
  
  -- Return the transaction ID
  RETURN json_build_object(
    'transaction_id', v_transaction_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute privilege to authenticated users
GRANT EXECUTE ON FUNCTION create_transaction(JSONB) TO authenticated;
```

### Step 4: Fix Any Views That Reference Categories

```sql
-- Fix any views or materialized views that reference category_name/category_type
DROP VIEW IF EXISTS transaction_details;

-- Recreate the view with correct column mappings
CREATE OR REPLACE VIEW transaction_details AS
SELECT 
  t.transaction_id,
  t.user_id,
  t.account_id,
  t.category_id,
  t.description,
  t.amount,
  t.currency,
  t.date,
  t.type,
  t.notes,
  t.created_at,
  t.updated_at,
  a.name AS account_name,
  c.name AS category_name,
  c.type AS category_type
FROM 
  transactions t
LEFT JOIN 
  accounts a ON t.account_id = a.account_id
LEFT JOIN 
  categories c ON t.category_id = c.category_id;

-- Grant appropriate privileges
GRANT SELECT ON transaction_details TO authenticated;
```

### Step 5: Rebuild and Deploy

1. Rebuild the application with the updated TypeScript code
2. Deploy the updated application

### Step 6: Verify Fixes

After deploying:
1. Try creating a new transaction
2. Verify the transaction gets created with the correct category
3. Check that account balances are correctly updated

## Troubleshooting

If issues persist:

1. Check the database logs for SQL errors
2. Verify the categories table structure matches what you expect
3. Check that the database.types.ts accurately reflects your database schema
4. Consider refreshing your types using Supabase's type generator 