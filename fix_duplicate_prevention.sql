-- Fix to prevent duplicate categories by improving the create_transaction function
-- Run this in the Supabase SQL Editor

-- First, drop the existing function
DROP FUNCTION IF EXISTS create_transaction(jsonb);

-- Now create the improved version with better duplicate prevention
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
  v_amount := ABS((transaction_data->>'amount')::DECIMAL);
  v_type := transaction_data->>'type';
  v_currency := COALESCE(transaction_data->>'currency', 'NGN');
  v_category_name := transaction_data->>'category_name';
  
  -- Initialize debug info
  v_debug_info := jsonb_build_object(
    'input_category_name', v_category_name,
    'input_transaction_type', v_type
  );
  
  -- Determine category type based on transaction type
  IF v_type = 'income' THEN
    v_category_type := 'income';
    v_balance_change := v_amount;
  ELSIF v_type = 'expense' THEN
    v_category_type := 'expense';
    v_balance_change := -v_amount;
  ELSE -- 'transfer'
    v_category_type := 'transfer';
    v_balance_change := 0;
  END IF;

  v_debug_info := v_debug_info || jsonb_build_object('derived_category_type', v_category_type);
  
  -- Handle category
  v_category_id := (transaction_data->>'category_id')::UUID;
  
  -- If explicit category ID is provided, use it directly
  IF v_category_id IS NOT NULL THEN
    v_debug_info := v_debug_info || jsonb_build_object('category_source', 'explicit_id', 'category_id', v_category_id);
  
  -- If category name provided but no ID, find or create the category
  ELSIF v_category_name IS NOT NULL THEN
    -- Debug the category search parameters
    v_debug_info := v_debug_info || jsonb_build_object(
      'category_search', jsonb_build_object(
        'user_id', v_user_id,
        'category_name', v_category_name,
        'category_type', v_category_type
      )
    );
    
    -- Try to find existing category with case-insensitive matching
    SELECT category_id, name, type INTO v_category_search_result
    FROM categories
    WHERE user_id = v_user_id 
      AND LOWER(name) = LOWER(v_category_name)
      AND type = v_category_type;
      
    -- If found, use the existing category
    IF v_category_search_result.category_id IS NOT NULL THEN
      v_category_id := v_category_search_result.category_id;
      v_debug_info := v_debug_info || jsonb_build_object(
        'category_source', 'exact_match', 
        'category_id', v_category_id,
        'matched_name', v_category_search_result.name,
        'matched_type', v_category_search_result.type
      );
    
    -- If not found by exact match, try partial match with same type
    ELSE
      SELECT category_id, name, type INTO v_category_search_result
      FROM categories
      WHERE user_id = v_user_id 
        AND LOWER(name) LIKE '%' || LOWER(v_category_name) || '%'
        AND type = v_category_type
      LIMIT 1;
      
      IF v_category_search_result.category_id IS NOT NULL THEN
        v_category_id := v_category_search_result.category_id;
        v_debug_info := v_debug_info || jsonb_build_object(
          'category_source', 'partial_match', 
          'category_id', v_category_id,
          'matched_name', v_category_search_result.name,
          'matched_type', v_category_search_result.type
        );
      
      -- If still not found, create new category with ON CONFLICT handling
      ELSE
        -- First make sure we have the unique constraint
        BEGIN
          ALTER TABLE categories 
          ADD CONSTRAINT IF NOT EXISTS categories_user_id_name_type_key 
          UNIQUE (user_id, LOWER(name::text), type);
        EXCEPTION WHEN OTHERS THEN
          -- Ignore error if constraint already exists
          NULL;
        END;
        
        -- Now insert with conflict handling
        INSERT INTO categories (name, user_id, type)
        VALUES (v_category_name, v_user_id, v_category_type)
        ON CONFLICT (user_id, LOWER(name::text), type) DO 
          UPDATE SET updated_at = NOW()
          -- The above is just to satisfy the ON CONFLICT requirement; 
          -- we'll actually use the existing category
        RETURNING category_id INTO v_category_id;
        
        v_debug_info := v_debug_info || jsonb_build_object(
          'category_source', 'create_or_reuse', 
          'category_id', v_category_id,
          'name', v_category_name,
          'type', v_category_type
        );
      END IF;
    END IF;
  
  -- If no category specified, use default for the transaction type
  ELSE
    -- Find a suitable default category based on transaction type
    SELECT category_id INTO v_default_category_id
    FROM categories
    WHERE user_id = v_user_id
      AND type = v_category_type
      AND (name = 'Uncategorized' OR name = 'Other')
    LIMIT 1;
    
    -- If default category not found, create one
    IF v_default_category_id IS NULL THEN
      INSERT INTO categories (name, user_id, type)
      VALUES ('Uncategorized', v_user_id, v_category_type)
      ON CONFLICT (user_id, LOWER(name::text), type) DO 
        UPDATE SET updated_at = NOW()
      RETURNING category_id INTO v_default_category_id;
    END IF;
    
    v_category_id := v_default_category_id;
    v_debug_info := v_debug_info || jsonb_build_object(
      'category_source', 'default', 
      'category_id', v_category_id
    );
  END IF;
  
  -- Insert the transaction with the resolved category_id
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
  
  -- Update account balance
  IF v_account_id IS NOT NULL AND (v_type = 'income' OR v_type = 'expense') THEN
    UPDATE accounts
    SET 
      balance = balance + v_balance_change,
      updated_at = CURRENT_TIMESTAMP
    WHERE 
      account_id = v_account_id;
  END IF;
  
  -- Return transaction ID and debug info
  RETURN json_build_object(
    'transaction_id', v_transaction_id,
    'debug_info', v_debug_info
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute privilege to authenticated users
GRANT EXECUTE ON FUNCTION create_transaction(JSONB) TO authenticated; 