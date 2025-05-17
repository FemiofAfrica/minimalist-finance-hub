-- Fix any views or materialized views that reference category_name/category_type
-- We need to replace them with name/type

-- Drop transaction_details view if exists
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