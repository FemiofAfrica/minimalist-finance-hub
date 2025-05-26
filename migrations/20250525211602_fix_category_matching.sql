-- Improved transaction functions with CodeRabbit recommendations

-- 0. Add unique constraint for category concurrency protection
-- This should be executed first to ensure the constraint exists
ALTER TABLE IF EXISTS categories 
ADD CONSTRAINT categories_user_id_name_type_key 
UNIQUE (user_id, LOWER(name::text), type);

-- 1. Create Transaction Function with improvements
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
  v_default_category_id UUID;
  v_category_search_result RECORD;
  v_debug_info JSONB;
BEGIN
  -- Extract necessary data from the JSON input
  v_user_id := (transaction_data->>'user_id')::UUID;
  v_account_id := (transaction_data->>'account_id')::UUID;
  
  -- Improvement 1: Apply server-side absolute value for amount
  v_amount := ABS((transaction_data->>'amount')::DECIMAL);
  
  v_type := transaction_data->>'type';
  v_currency := COALESCE(transaction_data->>'currency', 'NGN');
  v_category_name := transaction_data->>'category_name';
  
  -- Initialize debug info
  v_debug_info := jsonb_build_object(
    'input_category_name', v_category_name,
    'input_transaction_type', v_type
  );
  
  -- Determine category type and balance change based on transaction type
  IF v_type = 'income' THEN
    v_category_type := 'income';
    v_balance_change := v_amount; -- Positive for income
  ELSIF v_type = 'expense' THEN
    v_category_type := 'expense';
    v_balance_change := -v_amount; -- Negative for expense
  ELSE -- 'transfer'
    v_category_type := 'transfer';
    v_balance_change := 0;
  END IF;
  
  v_debug_info := v_debug_info || jsonb_build_object('derived_category_type', v_category_type);
  
  -- Handle category lookup and insertion with concurrency protection
  v_category_id := (transaction_data->>'category_id')::UUID;
  
  IF v_category_name IS NOT NULL AND v_category_id IS NULL THEN
    -- Try to find existing category first
    SELECT category_id INTO v_category_id
    FROM categories
    WHERE user_id = v_user_id 
      AND LOWER(name) = LOWER(v_category_name)
      AND type = v_category_type;
      
    -- Improvement 5: Add concurrency protection for category inserts
    IF v_category_id IS NULL THEN
      -- Use INSERT with ON CONFLICT to handle race conditions
      WITH new_category AS (
        INSERT INTO categories (name, user_id, type)
        VALUES (v_category_name, v_user_id, v_category_type)
        ON CONFLICT (user_id, LOWER(name::text), type) DO NOTHING
        RETURNING category_id
      )
      SELECT COALESCE(
        (SELECT category_id FROM new_category),
        (SELECT category_id FROM categories 
         WHERE user_id = v_user_id 
           AND LOWER(name) = LOWER(v_category_name)
           AND type = v_category_type)
      ) INTO v_category_id;
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
    CASE 
      WHEN v_type = 'expense' THEN -v_amount 
      WHEN v_type = 'income' THEN v_amount
      ELSE v_amount 
    END,
    v_currency,
    (transaction_data->>'date')::TIMESTAMP,
    v_type::transaction_type,
    transaction_data->>'notes'
  )
  RETURNING transaction_id INTO v_transaction_id;
  
  -- Update account balance if needed
  -- Improvement 2: Restrict account balance updates to non-zero changes
  IF v_account_id IS NOT NULL AND (v_type = 'income' OR v_type = 'expense') THEN
    UPDATE accounts
    SET 
      balance = balance + v_balance_change,
      updated_at = CURRENT_TIMESTAMP
    WHERE 
      account_id = v_account_id;
  END IF;
  
  -- Return the transaction ID and debug info
  RETURN json_build_object(
    'transaction_id', v_transaction_id,
    'debug_info', v_debug_info
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Improved Delete Transaction Function
CREATE OR REPLACE FUNCTION delete_transaction(transaction_id_param UUID)
RETURNS JSON AS $$
DECLARE
  v_transaction RECORD;
  v_account_id UUID;
  v_amount DECIMAL;
  v_type TEXT;
  v_balance_change DECIMAL;
BEGIN
  -- Get transaction details
  SELECT * INTO v_transaction
  FROM transactions
  WHERE transaction_id = transaction_id_param;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Transaction not found');
  END IF;

  v_account_id := v_transaction.account_id;
  v_amount := ABS(v_transaction.amount); -- Ensure amount is positive for calculations
  v_type := v_transaction.type;

  -- Calculate balance change for reversal
  IF v_type = 'income' THEN
    v_balance_change := -v_amount; -- Reverse income (subtract from balance)
  ELSIF v_type = 'expense' THEN
    v_balance_change := v_amount; -- Reverse expense (add to balance)
  ELSE -- 'transfer'
    v_balance_change := 0; -- No change for transfers
  END IF;

  -- Delete the transaction
  DELETE FROM transactions WHERE transaction_id = transaction_id_param;

  -- Update account balance if needed
  -- Only update if there's an actual change to the balance
  IF v_account_id IS NOT NULL AND v_balance_change <> 0 THEN
    UPDATE accounts
    SET 
      balance = balance + v_balance_change,
      updated_at = CURRENT_TIMESTAMP
    WHERE 
      account_id = v_account_id;
  END IF;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Improved Transfer Funds Function
CREATE OR REPLACE FUNCTION transfer_funds(
  p_source_account_id UUID,
  p_destination_account_id UUID,
  p_amount DECIMAL,
  p_date TIMESTAMP,
  p_description TEXT DEFAULT 'Transfer between accounts',
  p_notes TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_currency TEXT;
  v_source_transaction_id UUID;
  v_destination_transaction_id UUID;
  v_transfer_category_id UUID;
  v_positive_amount DECIMAL;
BEGIN
  -- Validate inputs
  IF p_source_account_id = p_destination_account_id THEN
    RETURN json_build_object('success', false, 'error', 'Source and destination accounts cannot be the same');
  END IF;
  
  -- Ensure amount is positive
  v_positive_amount := ABS(p_amount);
  
  IF v_positive_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Transfer amount must be greater than zero');
  END IF;
  
  -- Get user_id from source account (assumes both accounts belong to same user)
  SELECT user_id, currency INTO v_user_id, v_currency 
  FROM accounts 
  WHERE account_id = p_source_account_id;
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Source account not found');
  END IF;
  
  -- Verify destination account exists and belongs to same user
  PERFORM account_id FROM accounts 
  WHERE account_id = p_destination_account_id AND user_id = v_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Destination account not found or does not belong to the same user');
  END IF;
  
  -- Check if source account has sufficient funds
  DECLARE
    v_source_balance DECIMAL;
  BEGIN
    SELECT balance INTO v_source_balance 
    FROM accounts 
    WHERE account_id = p_source_account_id;
    
    IF v_source_balance < v_positive_amount THEN
      RETURN json_build_object('success', false, 'error', 'insufficient_funds');
    END IF;
  END;
  
  -- Get or create transfer category
  SELECT category_id INTO v_transfer_category_id
  FROM categories
  WHERE user_id = v_user_id AND LOWER(name) = 'transfer' AND type = 'transfer';
  
  IF v_transfer_category_id IS NULL THEN
    -- Use ON CONFLICT for concurrency protection
    WITH new_category AS (
      INSERT INTO categories (name, user_id, type)
      VALUES ('Transfer', v_user_id, 'transfer')
      ON CONFLICT (user_id, LOWER(name::text), type) DO NOTHING
      RETURNING category_id
    )
    SELECT COALESCE(
      (SELECT category_id FROM new_category),
      (SELECT category_id FROM categories 
       WHERE user_id = v_user_id AND LOWER(name) = 'transfer' AND type = 'transfer')
    ) INTO v_transfer_category_id;
  END IF;
  
  -- Create source transaction (outgoing)
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
    p_source_account_id,
    v_transfer_category_id,
    'Transfer to ' || (SELECT name FROM accounts WHERE account_id = p_destination_account_id),
    -v_positive_amount, -- Negative for outgoing
    v_currency,
    p_date,
    'transfer'::transaction_type,
    p_notes
  )
  RETURNING transaction_id INTO v_source_transaction_id;
  
  -- Create destination transaction (incoming)
  INSERT INTO transactions (
    user_id,
    account_id,
    category_id,
    description,
    amount,
    currency,
    date,
    type,
    notes,
    linked_transaction_id -- Link to the source transaction
  ) VALUES (
    v_user_id,
    p_destination_account_id,
    v_transfer_category_id,
    'Transfer from ' || (SELECT name FROM accounts WHERE account_id = p_source_account_id),
    v_positive_amount, -- Positive for incoming
    v_currency,
    p_date,
    'transfer'::transaction_type,
    p_notes,
    v_source_transaction_id
  )
  RETURNING transaction_id INTO v_destination_transaction_id;
  
  -- Update source transaction with link to destination transaction
  UPDATE transactions
  SET linked_transaction_id = v_destination_transaction_id
  WHERE transaction_id = v_source_transaction_id;
  
  -- Update account balances only if amount is non-zero
  IF v_positive_amount <> 0 THEN
    -- Deduct from source account
    UPDATE accounts
    SET 
      balance = balance - v_positive_amount,
      updated_at = CURRENT_TIMESTAMP
    WHERE 
      account_id = p_source_account_id;
      
    -- Add to destination account
    UPDATE accounts
    SET 
      balance = balance + v_positive_amount,
      updated_at = CURRENT_TIMESTAMP
    WHERE 
      account_id = p_destination_account_id;
  END IF;
  
  -- Return the transaction IDs
  RETURN json_build_object(
    'success', true,
    'source_transaction_id', v_source_transaction_id,
    'destination_transaction_id', v_destination_transaction_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant appropriate privileges
GRANT EXECUTE ON FUNCTION create_transaction(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION create_transaction(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION delete_transaction(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_transaction(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION transfer_funds(UUID, UUID, DECIMAL, TIMESTAMP, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION transfer_funds(UUID, UUID, DECIMAL, TIMESTAMP, TEXT, TEXT) TO service_role;

-- Note: Before applying this script, ensure that:
-- 1. You test the script in a development environment first
-- 2. The transactions table has the linked_transaction_id column (for transfer linking)
-- 3. Take database backups before applying changes to production 