-- Comprehensive fix for all transaction-related functions to use the correct category column names
-- This script updates all database functions to work with the categories table schema
-- where columns are named 'name' and 'type' instead of 'category_name' and 'category_type'

-- 1. Fix the create_transaction function
CREATE OR REPLACE FUNCTION create_transaction(transaction_data JSONB)
RETURNS JSON AS $$
DECLARE
  v_transaction_id UUID;
  v_account_id UUID;
  v_category_id UUID;
  v_user_id UUID;
  v_amount DECIMAL; -- This will hold the positive magnitude
  v_type TEXT;
  v_balance_change DECIMAL;
  v_currency TEXT;
  v_category_name TEXT;
  v_category_type TEXT;
BEGIN
  -- Extract necessary data from the JSON input
  v_user_id := (transaction_data->>'user_id')::UUID;
  v_account_id := (transaction_data->>'account_id')::UUID;
  -- Ensure v_amount is treated as positive magnitude from input;
  -- Math.abs() is applied client-side before sending to this function.
  v_amount := (transaction_data->>'amount')::DECIMAL;
  v_type := transaction_data->>'type';
  v_currency := COALESCE(transaction_data->>'currency', 'NGN');
  v_category_name := transaction_data->>'category_name';
  
  -- Determine category type based on transaction type
  IF v_type = 'income' THEN
    v_category_type := 'income';
    v_balance_change := v_amount; -- Positive for income
  ELSIF v_type = 'expense' THEN
    v_category_type := 'expense';
    v_balance_change := -v_amount; -- Negative for expense
  ELSE
    v_category_type := 'transfer';
    v_balance_change := 0; -- No balance change from this function for transfers directly on one account
  END IF;
  
  -- Handle category
  v_category_id := (transaction_data->>'category_id')::UUID;
  
  IF v_category_name IS NOT NULL AND v_category_id IS NULL THEN
    SELECT category_id INTO v_category_id
    FROM categories
    WHERE user_id = v_user_id 
      AND LOWER(name) = LOWER(v_category_name)
      AND type = v_category_type;
      
    IF v_category_id IS NULL THEN
      INSERT INTO categories (name, user_id, type)
      VALUES (v_category_name, v_user_id, v_category_type)
      RETURNING category_id INTO v_category_id;
    END IF;
  END IF;
  
  -- Insert the transaction
  INSERT INTO transactions (
    user_id,
    account_id,
    category_id,
    description,
    amount, -- Stored amount will be signed
    currency,
    date,
    type,
    notes
  ) VALUES (
    v_user_id,
    v_account_id,
    v_category_id,
    transaction_data->>'description',
    -- Store signed amount: negative for expense, positive for income
    CASE 
      WHEN v_type = 'expense' THEN -v_amount 
      WHEN v_type = 'income' THEN v_amount
      ELSE v_amount -- For transfers, this specific RPC assumes v_amount is the actual value for that leg
    END,
    v_currency,
    (transaction_data->>'date')::TIMESTAMP,
    v_type,
    transaction_data->>'notes'
  )
  RETURNING transaction_id INTO v_transaction_id;
  
  -- Update account balance if account_id is provided and type is income or expense
  IF v_account_id IS NOT NULL AND (v_type = 'income' OR v_type = 'expense') THEN
    UPDATE accounts
    SET 
      balance = balance + v_balance_change, -- v_balance_change is correctly signed
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

-- 2. Fix any views or materialized views that reference category_name/category_type
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