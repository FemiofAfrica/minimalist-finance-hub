-- Debug query to check existing categories
-- Run this in the Supabase SQL Editor

-- First, let's check if we have existing Groceries categories
SELECT 
  category_id,
  name,
  type,
  user_id
FROM 
  categories
WHERE 
  LOWER(name) LIKE '%groceries%'
  OR LOWER(name) LIKE '%grocery%'
  OR LOWER(name) LIKE '%food%';

-- Then, let's check if we have any transactions with Groceries as the category_name
SELECT 
  t.transaction_id, 
  t.description, 
  t.amount, 
  t.date,
  c.name as category_name, 
  c.type as category_type
FROM 
  transactions t
LEFT JOIN 
  categories c ON t.category_id = c.category_id
WHERE 
  t.description ILIKE '%biscuit%' 
  OR t.description ILIKE '%garri%'
  OR t.description ILIKE '%groceries%';

-- Let's also check if there are any categories with 'uncategorized'
SELECT 
  category_id,
  name,
  type,
  user_id
FROM 
  categories
WHERE 
  LOWER(name) = 'uncategorized';

-- Finally, check the default categories that were created
SELECT 
  category_id,
  name,
  type,
  user_id
FROM 
  categories
WHERE 
  type = 'expense'
ORDER BY 
  name; 