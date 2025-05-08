-- Add account_number column to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS account_number TEXT;

-- Add comment for documentation
COMMENT ON COLUMN accounts.account_number IS 'Bank account number (or masked version for security)'; 