-- This stored procedure handles creating a transaction and updating account balance in a single atomic operation
CREATE OR REPLACE FUNCTION create_transaction(transaction_data JSONB)
RETURNS JSONB AS $$
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
    v_category_type := 'INCOME';
  ELSIF v_type = 'expense' THEN
    v_category_type := 'EXPENSE';
  ELSE
    v_category_type := 'TRANSFER';
  END IF;
  
  -- Handle category
  v_category_id := (transaction_data->>'category_id')::UUID;
  
  -- If category name provided but no ID, find or create the category
  IF v_category_name IS NOT NULL AND v_category_id IS NULL THEN
    -- Try to find existing category
    SELECT category_id INTO v_category_id
    FROM categories
    WHERE user_id = v_user_id 
      AND LOWER(name) = LOWER(v_category_name)
      AND category_type = v_category_type;
      
    -- If not found, create new category
    IF v_category_id IS NULL THEN
      INSERT INTO categories (
        name,
        user_id,
        category_type
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
  RETURN jsonb_build_object(
    'transaction_id', v_transaction_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 