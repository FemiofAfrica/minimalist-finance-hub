-- Add linked_transaction_id column to transactions table for linking transfer transactions
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS linked_transaction_id UUID REFERENCES transactions(transaction_id) NULL;

-- Update the create_transfer function to set linked_transaction_id for both sides of a transfer
DROP FUNCTION IF EXISTS public.create_transfer;

CREATE OR REPLACE FUNCTION public.create_transfer(
    source_account_id UUID,
    destination_account_id UUID,
    amount DECIMAL,
    date_str TEXT,
    description TEXT DEFAULT NULL,
    notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    user_id_val UUID;
    source_account RECORD;
    dest_account RECORD;
    source_trans_id UUID;
    dest_trans_id UUID;
    result JSONB;
BEGIN
    -- Get the current user ID
    user_id_val := auth.uid();
    
    -- Validate accounts belong to user
    SELECT * INTO source_account 
    FROM accounts 
    WHERE account_id = source_account_id AND user_id = user_id_val;
    
    SELECT * INTO dest_account 
    FROM accounts 
    WHERE account_id = destination_account_id AND user_id = user_id_val;
    
    IF source_account IS NULL THEN
        RAISE EXCEPTION 'Source account not found or does not belong to user';
    END IF;
    
    IF dest_account IS NULL THEN
        RAISE EXCEPTION 'Destination account not found or does not belong to user';
    END IF;
    
    -- Check if source account has enough funds
    IF source_account.balance < amount THEN
        RAISE EXCEPTION 'Insufficient funds in source account';
    END IF;
    
    -- Update source account balance
    UPDATE accounts
    SET balance = balance - amount,
        updated_at = NOW()
    WHERE account_id = source_account_id;
    
    -- Update destination account balance
    UPDATE accounts
    SET balance = balance + amount,
        updated_at = NOW()
    WHERE account_id = destination_account_id;
    
    -- Create source transaction
    INSERT INTO transactions (
        user_id, account_id, amount, currency, date, type, description, notes
    ) VALUES (
        user_id_val, 
        source_account_id, 
        amount, 
        source_account.currency, 
        date_str::DATE, 
        'transfer', 
        COALESCE(description, 'Transfer to ' || dest_account.name),
        COALESCE(notes, 'Transfer to account: ' || dest_account.name)
    ) RETURNING transaction_id INTO source_trans_id;
    
    -- Create destination transaction
    INSERT INTO transactions (
        user_id, account_id, amount, currency, date, type, description, notes
    ) VALUES (
        user_id_val, 
        destination_account_id, 
        amount, 
        dest_account.currency, 
        date_str::DATE, 
        'transfer', 
        COALESCE(description, 'Transfer from ' || source_account.name),
        COALESCE(notes, 'Transfer from account: ' || source_account.name)
    ) RETURNING transaction_id INTO dest_trans_id;
    
    -- Link the two transactions together
    UPDATE transactions
    SET linked_transaction_id = dest_trans_id
    WHERE transaction_id = source_trans_id;
    
    UPDATE transactions
    SET linked_transaction_id = source_trans_id
    WHERE transaction_id = dest_trans_id;
    
    return jsonb_build_object(
        'source_transaction_id', source_trans_id,
        'destination_transaction_id', dest_trans_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the transfer_funds function to set linked_transaction_id
DROP FUNCTION IF EXISTS public.transfer_funds;

CREATE OR REPLACE FUNCTION public.transfer_funds(
  p_source_account_id UUID,
  p_destination_account_id UUID,
  p_amount DECIMAL,
  p_date TEXT,
  p_description TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_source_account_exists BOOLEAN;
  v_dest_account_exists BOOLEAN;
  v_source_balance DECIMAL;
  v_source_name TEXT;
  v_source_currency TEXT;
  v_dest_name TEXT;
  v_dest_currency TEXT;
  v_date TIMESTAMP;
  v_source_transaction_id UUID;
  v_destination_transaction_id UUID;
BEGIN
  -- Get user ID from auth context
  v_user_id := auth.uid();
  
  -- Validate user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to transfer funds';
  END IF;
  
  -- Validate positive amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Transfer amount must be greater than zero';
  END IF;
  
  -- Parse date
  BEGIN
    v_date := p_date::TIMESTAMP;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid date format: %', p_date;
  END;
  
  -- Verify source account exists and belongs to user
  SELECT 
    EXISTS(SELECT 1 FROM accounts WHERE account_id = p_source_account_id AND user_id = v_user_id),
    (SELECT balance FROM accounts WHERE account_id = p_source_account_id AND user_id = v_user_id),
    (SELECT name FROM accounts WHERE account_id = p_source_account_id AND user_id = v_user_id),
    (SELECT currency FROM accounts WHERE account_id = p_source_account_id AND user_id = v_user_id)
  INTO 
    v_source_account_exists, 
    v_source_balance,
    v_source_name,
    v_source_currency;
  
  IF NOT v_source_account_exists THEN
    RAISE EXCEPTION 'Source account not found or does not belong to user';
  END IF;
  
  -- Verify destination account exists and belongs to user
  SELECT 
    EXISTS(SELECT 1 FROM accounts WHERE account_id = p_destination_account_id AND user_id = v_user_id),
    (SELECT name FROM accounts WHERE account_id = p_destination_account_id AND user_id = v_user_id),
    (SELECT currency FROM accounts WHERE account_id = p_destination_account_id AND user_id = v_user_id)
  INTO 
    v_dest_account_exists,
    v_dest_name,
    v_dest_currency;
  
  IF NOT v_dest_account_exists THEN
    RAISE EXCEPTION 'Destination account not found or does not belong to user';
  END IF;
  
  -- Check for sufficient funds
  IF v_source_balance < p_amount THEN
    RAISE EXCEPTION 'insufficient_funds: Account balance is too low';
  END IF;
  
  -- Update source account balance
  UPDATE accounts
  SET 
    balance = balance - p_amount,
    updated_at = CURRENT_TIMESTAMP
  WHERE 
    account_id = p_source_account_id;

  -- Update destination account balance
  UPDATE accounts
  SET 
    balance = balance + p_amount,
    updated_at = CURRENT_TIMESTAMP
  WHERE 
    account_id = p_destination_account_id;

  -- Create source transaction record
  INSERT INTO transactions (
    user_id,
    account_id,
    amount,
    currency,
    date,
    type,
    description,
    notes
  ) VALUES (
    v_user_id,
    p_source_account_id,
    p_amount,
    v_source_currency,
    v_date,
    'transfer',
    COALESCE(p_description, 'Transfer to ' || v_dest_name),
    COALESCE(p_notes, 'Transfer to account: ' || v_dest_name)
  )
  RETURNING transaction_id INTO v_source_transaction_id;

  -- Create destination transaction record
  INSERT INTO transactions (
    user_id,
    account_id,
    amount,
    currency,
    date,
    type,
    description,
    notes
  ) VALUES (
    v_user_id,
    p_destination_account_id,
    p_amount,
    v_dest_currency,
    v_date,
    'transfer',
    COALESCE(p_description, 'Transfer from ' || v_source_name),
    COALESCE(p_notes, 'Transfer from account: ' || v_source_name)
  )
  RETURNING transaction_id INTO v_destination_transaction_id;

  -- Link the two transactions together
  UPDATE transactions
  SET linked_transaction_id = v_destination_transaction_id
  WHERE transaction_id = v_source_transaction_id;
  
  UPDATE transactions
  SET linked_transaction_id = v_source_transaction_id
  WHERE transaction_id = v_destination_transaction_id;

  -- Return transaction IDs
  RETURN json_build_object(
    'success', true,
    'source_transaction_id', v_source_transaction_id,
    'destination_transaction_id', v_destination_transaction_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 