-- This stored procedure handles transfers between accounts in a single atomic transaction
-- It updates account balances and creates transaction records for both accounts
CREATE OR REPLACE FUNCTION transfer_funds(
  p_source_account_id UUID,
  p_destination_account_id UUID,
  p_amount DECIMAL,
  p_date TEXT,
  p_description TEXT DEFAULT 'Transfer between accounts',
  p_notes TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_source_balance DECIMAL;
  v_source_currency TEXT;
  v_dest_currency TEXT;
  v_dest_name TEXT;
  v_source_name TEXT;
  v_source_transaction_id UUID;
  v_destination_transaction_id UUID;
  v_date TIMESTAMP;
BEGIN
  -- Validate inputs
  IF p_source_account_id = p_destination_account_id THEN
    RAISE EXCEPTION 'Source and destination accounts must be different';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Transfer amount must be greater than zero';
  END IF;

  -- Parse date string to timestamp
  BEGIN
    v_date := p_date::TIMESTAMP;
  EXCEPTION WHEN OTHERS THEN
    v_date := CURRENT_TIMESTAMP;
  END;

  -- Get account details and check ownership
  SELECT 
    a.user_id, a.balance, a.currency, a.name
  INTO 
    v_user_id, v_source_balance, v_source_currency, v_source_name
  FROM 
    accounts a
  WHERE 
    a.account_id = p_source_account_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source account not found';
  END IF;

  -- Check if the user owns the destination account too
  SELECT 
    a.currency, a.name
  INTO 
    v_dest_currency, v_dest_name
  FROM 
    accounts a
  WHERE 
    a.account_id = p_destination_account_id
    AND a.user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Destination account not found or does not belong to the same user';
  END IF;

  -- Check if source account has sufficient funds
  IF v_source_balance < p_amount THEN
    RAISE EXCEPTION 'insufficient_funds: Source account has insufficient funds';
  END IF;

  -- Start transaction
  BEGIN
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

    -- Return transaction IDs
    RETURN json_build_object(
      'success', true,
      'source_transaction_id', v_source_transaction_id,
      'destination_transaction_id', v_destination_transaction_id
    );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 