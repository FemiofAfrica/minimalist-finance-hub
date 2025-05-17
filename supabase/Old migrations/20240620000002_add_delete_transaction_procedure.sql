-- Add a stored procedure for deleting transactions and updating account balances
CREATE OR REPLACE FUNCTION delete_transaction(transaction_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  v_transaction RECORD;
  v_account_id UUID;
  v_balance_change DECIMAL;
  v_type TEXT;
  v_amount DECIMAL;
  v_user_id UUID;
BEGIN
  -- Get the authenticated user ID
  v_user_id := auth.uid();
  
  -- Get transaction details before deletion
  SELECT 
    account_id, 
    type,
    amount,
    user_id
  INTO v_transaction
  FROM transactions
  WHERE transaction_id = transaction_id_param;
  
  -- Verify transaction exists and belongs to the user
  IF v_transaction IS NULL THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;
  
  IF v_transaction.user_id != v_user_id THEN
    RAISE EXCEPTION 'Transaction does not belong to the authenticated user';
  END IF;
  
  -- Store transaction data for account update
  v_account_id := v_transaction.account_id;
  v_type := v_transaction.type;
  v_amount := v_transaction.amount;
  
  -- Calculate balance change
  -- For expense, we add the amount back to the account (reverse the deduction)
  -- For income, we subtract the amount from the account (reverse the addition)
  -- For transfers, balance update should be handled separately as they involve two accounts
  IF v_type = 'expense' THEN
    v_balance_change := v_amount;
  ELSIF v_type = 'income' THEN
    v_balance_change := -v_amount;
  ELSE
    -- For transfers, we skip the balance update here
    -- Transfer deletions should be handled by a separate specialized function
    v_balance_change := 0;
  END IF;
  
  -- Delete the transaction
  DELETE FROM transactions
  WHERE transaction_id = transaction_id_param
  AND user_id = v_user_id;
  
  -- Update the account balance if this is not a transfer
  IF v_type != 'transfer' AND v_account_id IS NOT NULL AND v_balance_change != 0 THEN
    UPDATE accounts
    SET 
      balance = balance + v_balance_change,
      updated_at = CURRENT_TIMESTAMP
    WHERE 
      account_id = v_account_id
      AND user_id = v_user_id;
  END IF;
  
  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', transaction_id_param,
    'balance_change', v_balance_change
  );
  
EXCEPTION
  WHEN others THEN
    -- Handle any exceptions
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute privilege to authenticated users
GRANT EXECUTE ON FUNCTION delete_transaction(UUID) TO authenticated;

-- Create a function for deleting transfer transactions
CREATE OR REPLACE FUNCTION delete_transfer_transactions(source_transaction_id UUID, destination_transaction_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_source_trans RECORD;
  v_dest_trans RECORD;
  v_user_id UUID;
BEGIN
  -- Get the authenticated user ID
  v_user_id := auth.uid();
  
  -- Get source transaction details
  SELECT 
    account_id,
    amount,
    user_id
  INTO v_source_trans
  FROM transactions
  WHERE transaction_id = source_transaction_id
  AND type = 'transfer';
  
  -- Get destination transaction details
  SELECT 
    account_id,
    amount,
    user_id
  INTO v_dest_trans
  FROM transactions
  WHERE transaction_id = destination_transaction_id
  AND type = 'transfer';
  
  -- Verify transactions exist and belong to the user
  IF v_source_trans IS NULL OR v_dest_trans IS NULL THEN
    RAISE EXCEPTION 'One or both transfer transactions not found';
  END IF;
  
  IF v_source_trans.user_id != v_user_id OR v_dest_trans.user_id != v_user_id THEN
    RAISE EXCEPTION 'Transactions do not belong to the authenticated user';
  END IF;
  
  -- Begin transaction
  -- SAVEPOINT delete_transfer;
  
  -- Update source account balance (add the money back)
  UPDATE accounts
  SET 
    balance = balance + v_source_trans.amount,
    updated_at = CURRENT_TIMESTAMP
  WHERE 
    account_id = v_source_trans.account_id
    AND user_id = v_user_id;
  
  -- Update destination account balance (subtract the money)
  UPDATE accounts
  SET 
    balance = balance - v_dest_trans.amount,
    updated_at = CURRENT_TIMESTAMP
  WHERE 
    account_id = v_dest_trans.account_id
    AND user_id = v_user_id;
  
  -- Delete the transactions
  DELETE FROM transactions
  WHERE transaction_id IN (source_transaction_id, destination_transaction_id)
  AND user_id = v_user_id;
  
  -- Commit transaction
  -- COMMIT;
  
  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'source_transaction_id', source_transaction_id,
    'destination_transaction_id', destination_transaction_id
  );
  
EXCEPTION
  WHEN others THEN
    -- Rollback on error
    -- ROLLBACK TO delete_transfer;
    
    -- Handle any exceptions
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute privilege to authenticated users
GRANT EXECUTE ON FUNCTION delete_transfer_transactions(UUID, UUID) TO authenticated; 