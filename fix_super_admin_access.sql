-- Fix Super Admin Access for Error Logs
-- Run this in Supabase SQL Editor

-- 1. Check current super admin status
SELECT 
    'Current Super Admin Status' as check_type,
    id,
    email,
    (raw_user_meta_data ->> 'is_super_admin') as old_flag,
    (raw_app_meta_data ->> 'is_super_admin') as new_flag
FROM auth.users 
WHERE (raw_user_meta_data ->> 'is_super_admin')::boolean = true
   OR (raw_app_meta_data ->> 'is_super_admin')::boolean = true;

-- 2. Fix super admin flag in raw_app_meta_data
UPDATE auth.users 
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}')::jsonb || '{"is_super_admin": true}'::jsonb
WHERE (raw_user_meta_data ->> 'is_super_admin')::boolean = true;

-- 3. Verify fix
SELECT 
    'After Fix - Super Admin Status' as check_type,
    id,
    email,
    (raw_user_meta_data ->> 'is_super_admin') as old_flag,
    (raw_app_meta_data ->> 'is_super_admin') as new_flag
FROM auth.users 
WHERE (raw_app_meta_data ->> 'is_super_admin')::boolean = true;

-- 4. Check error logs
SELECT 
    'Error Logs Count' as check_type,
    COUNT(*) as total_errors,
    COUNT(DISTINCT user_id) as unique_users
FROM error_logs;

-- 5. Test the RLS policy condition
SELECT 
    'RLS Policy Test' as test_type,
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.uid() = id 
        AND (raw_app_meta_data ->> 'is_super_admin')::boolean = true
    ) as can_access_error_logs;

-- 6. Create some test error logs from different users if none exist
INSERT INTO error_logs (message, url, error_type, severity, user_id, user_email)
SELECT 
    'Test error from user ' || row_number() OVER (),
    'https://test.com/page' || row_number() OVER (),
    'javascript',
    'medium',
    id,
    email
FROM auth.users 
WHERE id != (SELECT id FROM auth.users WHERE email = 'phermmodynamic@gmail.com' LIMIT 1)
LIMIT 3
ON CONFLICT DO NOTHING;

-- 7. Test if super admin can see all error logs
SELECT 
    'Error Logs Visibility Test' as test_type,
    COUNT(*) as total_visible_errors,
    COUNT(DISTINCT user_id) as users_with_errors
FROM error_logs;

-- 8. Test the get_recent_errors function
SELECT 
    'Function Test' as test_type,
    COUNT(*) as function_result_count,
    COUNT(DISTINCT user_id) as unique_users_in_function
FROM get_recent_errors(24);

-- 9. Show all current error logs with user info
SELECT 
    'All Error Logs Summary' as test_type,
    el.id,
    el.message,
    el.user_email,
    el.error_type,
    el.severity,
    el.created_at
FROM error_logs el
ORDER BY el.created_at DESC
LIMIT 10; 