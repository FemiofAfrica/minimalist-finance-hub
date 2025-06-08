-- Query to check your current user's super admin status
-- Run this in Supabase SQL Editor

-- First, let's see your current user info
SELECT 
    id,
    email,
    raw_user_meta_data,
    raw_app_meta_data,
    raw_user_meta_data ->> 'is_super_admin' as raw_super_admin,
    raw_app_meta_data ->> 'is_super_admin' as app_super_admin,
    created_at
FROM auth.users 
WHERE email = 'phermmodynamic@gmail.com'  -- Replace with your actual email
;

-- Alternative: Check the current authenticated user
SELECT 
    id,
    email,
    raw_user_meta_data,
    raw_app_meta_data,
    raw_user_meta_data ->> 'is_super_admin' as raw_super_admin,
    raw_app_meta_data ->> 'is_super_admin' as app_super_admin,
    created_at
FROM auth.users 
WHERE id = auth.uid()
;

-- Check what the RPC function returns for all users
SELECT * FROM get_all_users_for_admin();

-- If you need to set yourself as super admin, use one of these:
-- Option 1: Set in raw_user_meta_data
-- UPDATE auth.users 
-- SET raw_user_meta_data = raw_user_meta_data || '{"is_super_admin": true}'::jsonb
-- WHERE id = auth.uid();

-- Option 2: Set in raw_app_meta_data  
-- UPDATE auth.users 
-- SET raw_app_meta_data = raw_app_meta_data || '{"is_super_admin": true}'::jsonb
-- WHERE id = auth.uid(); 