-- Add is_default column to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;

-- Create a function to ensure only one default account per user
CREATE OR REPLACE FUNCTION ensure_single_default_account()
RETURNS TRIGGER AS $$
BEGIN
  -- If the new account is set as default, remove default status from other accounts
  IF NEW.is_default = TRUE THEN
    UPDATE accounts 
    SET is_default = FALSE 
    WHERE user_id = NEW.user_id 
      AND account_id != NEW.account_id;
  END IF;
  
  -- Ensure at least one account is default per user (if accounts exist)
  IF (SELECT COUNT(*) FROM accounts WHERE user_id = NEW.user_id AND is_default = TRUE) = 0 THEN
    -- If no default account exists, set this one as default
    NEW.is_default := TRUE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to maintain the single default account constraint
DROP TRIGGER IF EXISTS ensure_single_default_account_insert ON accounts;
CREATE TRIGGER ensure_single_default_account_insert
BEFORE INSERT ON accounts
FOR EACH ROW
EXECUTE FUNCTION ensure_single_default_account();

DROP TRIGGER IF EXISTS ensure_single_default_account_update ON accounts;
CREATE TRIGGER ensure_single_default_account_update
BEFORE UPDATE OF is_default ON accounts
FOR EACH ROW
WHEN (NEW.is_default IS DISTINCT FROM OLD.is_default AND NEW.is_default = TRUE)
EXECUTE FUNCTION ensure_single_default_account();

-- Create stored procedures for transaction management
CREATE OR REPLACE FUNCTION begin_transaction()
RETURNS VOID AS $$
BEGIN
  -- No-op for Supabase, as transactions are managed by the client
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION commit_transaction()
RETURNS VOID AS $$
BEGIN
  -- No-op for Supabase, as transactions are managed by the client
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION rollback_transaction()
RETURNS VOID AS $$
BEGIN
  -- No-op for Supabase, as transactions are managed by the client
END;
$$ LANGUAGE plpgsql;

-- Ensure existing users have a default account
DO $$
DECLARE
  user_id_var UUID;
BEGIN
  -- For each user without a default account, select one to make default
  FOR user_id_var IN 
    SELECT DISTINCT user_id FROM accounts 
    WHERE user_id NOT IN (
      SELECT user_id FROM accounts WHERE is_default = TRUE
    )
  LOOP
    -- Set the first account as default for each user
    UPDATE accounts
    SET is_default = TRUE
    WHERE account_id = (
      SELECT account_id FROM accounts 
      WHERE user_id = user_id_var 
      ORDER BY created_at 
      LIMIT 1
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql; 