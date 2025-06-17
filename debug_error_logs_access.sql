-- Debug Error Logs Access Issue
-- Run this in Supabase SQL Editor to diagnose the problem

-- 1. Check current user's super admin status
SELECT 
    'Current User Super Admin Status' as check_type,
    auth.uid() as current_user_id,
    email,
    (raw_user_meta_data ->> 'is_super_admin')::boolean as old_super_admin_flag,
    (raw_app_meta_data ->> 'is_super_admin')::boolean as new_super_admin_flag
FROM auth.users 
WHERE id = auth.uid();

-- 2. Check all error logs in the table
SELECT 
    'All Error Logs in Database' as check_type,
    COUNT(*) as total_errors,
    COUNT(DISTINCT user_id) as unique_users,
    array_agg(DISTINCT user_id) as user_ids
FROM error_logs;

-- 3. Check error logs by user
SELECT 
    'Error Logs by User' as check_type,
    user_id,
    user_email,
    COUNT(*) as error_count
FROM error_logs
GROUP BY user_id, user_email
ORDER BY error_count DESC;

-- 4. Test RLS policy directly
SELECT 
    'RLS Policy Test' as check_type,
    COUNT(*) as accessible_errors
FROM error_logs;

-- 5. Check if the function works
SELECT 
    'Function Test' as check_type,
    COUNT(*) as function_result_count
FROM get_recent_errors(24);

-- 6. Check all super admin users
SELECT 
    'All Super Admin Users' as check_type,
    id,
    email,
    (raw_user_meta_data ->> 'is_super_admin')::boolean as old_flag,
    (raw_app_meta_data ->> 'is_super_admin')::boolean as new_flag
FROM auth.users
WHERE (raw_user_meta_data ->> 'is_super_admin')::boolean = true
   OR (raw_app_meta_data ->> 'is_super_admin')::boolean = true;

-- 7. Test what the RLS policy condition evaluates to
SELECT 
    'RLS Policy Condition Test' as check_type,
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.uid() = id 
        AND (raw_app_meta_data ->> 'is_super_admin')::boolean = true
    ) as rls_condition_result;

-- 8. Show current RLS policies on error_logs
SELECT 
    'Current RLS Policies' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'error_logs'; 