-- Fix for the create_transaction function to correctly cast v_type to transaction_type
-- This script updates the create_transaction database function.

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
  v_category_type TEXT; -- This is for the categories.type column
BEGIN
  -- Extract necessary data from the JSON input
  v_user_id := (transaction_data->>'user_id')::UUID;
  v_account_id := (transaction_data->>'account_id')::UUID;
  -- Amount is expected to be positive magnitude (abs value applied client-side)
  v_amount := (transaction_data->>'amount')::DECIMAL;
  v_type := transaction_data->>'type'; -- This is for transactions.type (income, expense, transfer)
  v_currency := COALESCE(transaction_data->>'currency', 'NGN');
  v_category_name := transaction_data->>'category_name';
  
  -- Determine category type (for categories table) and balance change based on transaction type
  IF v_type = 'income' THEN
    v_category_type := 'income'; -- For categories.type
    v_balance_change := v_amount; -- Positive for income
  ELSIF v_type = 'expense' THEN
    v_category_type := 'expense'; -- For categories.type
    v_balance_change := -v_amount; -- Negative for expense
  ELSE -- 'transfer'
    v_category_type := 'transfer'; -- For categories.type (though transfers might not always have a conventional category)
    v_balance_change := 0; 
  END IF;
  
  -- Handle category (for categories table)
  v_category_id := (transaction_data->>'category_id')::UUID;
  
  IF v_category_name IS NOT NULL AND v_category_id IS NULL THEN
    SELECT category_id INTO v_category_id
    FROM categories
    WHERE user_id = v_user_id 
      AND LOWER(name) = LOWER(v_category_name)
      AND type = v_category_type; -- Using v_category_type for categories.type
      
    IF v_category_id IS NULL THEN
      INSERT INTO categories (name, user_id, type)
      VALUES (v_category_name, v_user_id, v_category_type) -- Using v_category_type for categories.type
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
    type,     -- transactions.type column
    notes
  ) VALUES (
    v_user_id,
    v_account_id,
    v_category_id,
    transaction_data->>'description',
    CASE 
      WHEN v_type = 'expense' THEN -v_amount 
      WHEN v_type = 'income' THEN v_amount
      ELSE v_amount 
    END,
    v_currency,
    (transaction_data->>'date')::TIMESTAMP,
    v_type::transaction_type, -- Explicitly cast v_type (TEXT) to transaction_type (ENUM)
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

-- Note: This script only updates the create_transaction function.
-- The transaction_details view and other functions are assumed to be correct from previous scripts.
-- If you need the full script including the view, that would be a separate step. 