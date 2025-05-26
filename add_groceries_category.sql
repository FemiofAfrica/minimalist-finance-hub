-- Add Groceries category for all users
-- Run this in the Supabase SQL Editor

-- Add Groceries category if it doesn't exist
INSERT INTO categories (name, user_id, type, color, icon)
SELECT 
  'Groceries', 
  auth.users.id, 
  'expense',
  '#8BC34A', -- Green color
  '🥑'       -- Food icon
FROM 
  auth.users
WHERE 
  NOT EXISTS (
    SELECT 1 
    FROM categories 
    WHERE 
      LOWER(name) = 'groceries' 
      AND type = 'expense' 
      AND user_id = auth.users.id
  );

-- Check that the category was added
SELECT 
  category_id,
  name,
  type,
  user_id
FROM 
  categories
WHERE 
  LOWER(name) = 'groceries'; 