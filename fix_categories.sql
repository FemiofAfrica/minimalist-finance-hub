-- Fix categories script
-- Run this in the Supabase SQL Editor

-- 1. Add constraint to prevent case-insensitive duplicates (if it doesn't exist)
ALTER TABLE categories 
ADD CONSTRAINT IF NOT EXISTS categories_user_id_name_type_key 
UNIQUE (user_id, LOWER(name::text), type);

-- 2. Add Personal Care category (for haircuts, etc.)
INSERT INTO categories (name, user_id, type, color, icon)
SELECT 
  'Personal Care', 
  auth.users.id, 
  'expense',
  '#E91E63', -- Pink color 
  '💇'       -- Haircut icon
FROM 
  auth.users
WHERE 
  NOT EXISTS (
    SELECT 1 
    FROM categories 
    WHERE 
      LOWER(name) = 'personal care' 
      AND type = 'expense' 
      AND user_id = auth.users.id
  );

-- 3. Remove duplicate Groceries categories
-- First identify the duplicates (keep the earliest created one)
WITH duplicate_categories AS (
  SELECT 
    category_id,
    user_id,
    name,
    type,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, LOWER(name), type 
      ORDER BY created_at
    ) as row_num
  FROM categories
  WHERE LOWER(name) = 'groceries' AND type = 'expense'
)
-- Then update any transactions using the duplicates to use the primary one
UPDATE transactions t
SET category_id = (
  SELECT dc_primary.category_id
  FROM duplicate_categories dc_primary
  WHERE dc_primary.row_num = 1
    AND dc_primary.user_id = (SELECT user_id FROM categories WHERE category_id = t.category_id)
    AND LOWER(dc_primary.name) = 'groceries'
    AND dc_primary.type = 'expense'
)
WHERE t.category_id IN (
  SELECT category_id 
  FROM duplicate_categories 
  WHERE row_num > 1
);

-- Now delete the duplicates (after transactions are updated)
WITH duplicate_categories AS (
  SELECT 
    category_id,
    user_id,
    name,
    type,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, LOWER(name), type 
      ORDER BY created_at
    ) as row_num
  FROM categories
  WHERE LOWER(name) = 'groceries' AND type = 'expense'
)
DELETE FROM categories
WHERE category_id IN (
  SELECT category_id 
  FROM duplicate_categories 
  WHERE row_num > 1
);

-- 4. Fix existing "Haircut" transactions that were incorrectly categorized
UPDATE transactions t
SET category_id = (
  SELECT c.category_id
  FROM categories c
  WHERE LOWER(c.name) = 'personal care'
    AND c.type = 'expense'
    AND c.user_id = t.user_id
  LIMIT 1
)
WHERE LOWER(t.description) LIKE '%haircut%'
  AND (
    t.category_id IS NULL
    OR t.category_id IN (
      SELECT c.category_id
      FROM categories c
      WHERE LOWER(c.name) = 'shopping'
        AND c.user_id = t.user_id
    )
  ); 