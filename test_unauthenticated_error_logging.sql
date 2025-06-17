-- Test Unauthenticated Error Logging and Cross-User Visibility
-- Run this in Supabase SQL Editor to test the enhanced error logging system

-- 1. Check current error logs count
SELECT 
    'Before Test - Current Error Logs' as test_step,
    COUNT(*) as total_errors,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) FILTER (WHERE user_id IS NULL) as unauthenticated_errors,
    COUNT(*) FILTER (WHERE user_id IS NOT NULL) as authenticated_errors
FROM error_logs;

-- 2. Insert test errors from unauthenticated users (simulating frontend errors)
INSERT INTO error_logs (
    message, 
    url, 
    error_type, 
    severity, 
    user_id, 
    user_email, 
    additional_context,
    created_at
) VALUES 
-- Critical password reset error (unauthenticated)
(
    'Auth Error: Password reset link error: expired_token - The reset link has expired',
    'https://app.kpege.com/reset-password',
    'unhandled',
    'critical',
    NULL,
    'anonymous_session_1234567890_abc123@unauthenticated.local',
    jsonb_build_object(
        'sessionId', 'session_1234567890_abc123',
        'isAuthenticated', false,
        'authContext', 'password_reset_link_validation',
        'timestamp', NOW()::text,
        'userAgent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'viewport', jsonb_build_object('width', 1440, 'height', 900),
        'referrer', 'https://mail.google.com'
    ),
    NOW() - INTERVAL '5 minutes'
),
-- High severity network error (unauthenticated)
(
    'Network Error: Failed to fetch - Connection timeout during login attempt',
    'https://app.kpege.com/login',
    'network',
    'high',
    NULL,
    'anonymous_session_9876543210_xyz789@unauthenticated.local',
    jsonb_build_object(
        'sessionId', 'session_9876543210_xyz789',
        'isAuthenticated', false,
        'timestamp', NOW()::text,
        'userAgent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
        'viewport', jsonb_build_object('width', 375, 'height', 812),
        'apiUrl', 'https://kpege.supabase.co/auth/v1/token',
        'errorName', 'NetworkError'
    ),
    NOW() - INTERVAL '2 minutes'
),
-- Medium severity form validation error (unauthenticated)
(
    'React Error: Cannot read properties of undefined (reading email) during signup',
    'https://app.kpege.com/login',
    'react',
    'medium',
    NULL,
    'anonymous_session_5555666677_def456@unauthenticated.local',
    jsonb_build_object(
        'sessionId', 'session_5555666677_def456',
        'isAuthenticated', false,
        'timestamp', NOW()::text,
        'userAgent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'viewport', jsonb_build_object('width', 1920, 'height', 1080),
        'componentStack', 'at SignUpForm at Login'
    ),
    NOW() - INTERVAL '1 minute'
);

-- 3. Check error logs after inserting test data
SELECT 
    'After Test Insert - Error Logs Summary' as test_step,
    COUNT(*) as total_errors,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) FILTER (WHERE user_id IS NULL) as unauthenticated_errors,
    COUNT(*) FILTER (WHERE user_id IS NOT NULL) as authenticated_errors
FROM error_logs;

-- 4. Test the get_recent_errors function (should show all errors including unauthenticated)
SELECT 
    'Testing get_recent_errors Function' as test_step,
    id,
    message,
    error_type,
    severity,
    CASE 
        WHEN user_id IS NULL THEN 'UNAUTHENTICATED'
        ELSE 'AUTHENTICATED'
    END as user_status,
    user_email,
    created_at
FROM get_recent_errors(24)
WHERE created_at >= NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC;

-- 5. Verify RLS policies allow unauthenticated error insertion
SELECT 
    'RLS Policy Test' as test_step,
    'Checking if unauthenticated errors can be inserted' as description;

-- Test inserting another unauthenticated error (this should work)
INSERT INTO error_logs (
    message, 
    url, 
    error_type, 
    severity, 
    user_id, 
    user_email, 
    additional_context
) VALUES (
    'Test Error: RLS policy test for unauthenticated user',
    'https://app.kpege.com/test',
    'javascript',
    'low',
    NULL,
    'anonymous_test_session@unauthenticated.local',
    jsonb_build_object(
        'sessionId', 'test_session_12345',
        'isAuthenticated', false,
        'test', true
    )
);

-- 6. Final verification - show recent errors by type and authentication status
SELECT 
    'Final Verification - Error Distribution' as test_step,
    error_type,
    severity,
    CASE 
        WHEN user_id IS NULL THEN 'UNAUTHENTICATED'
        ELSE 'AUTHENTICATED'
    END as user_status,
    COUNT(*) as error_count
FROM error_logs 
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY error_type, severity, (user_id IS NULL)
ORDER BY error_count DESC;

-- 7. Show sample unauthenticated errors for admin review
SELECT 
    'Sample Unauthenticated Errors for Admin Review' as test_step,
    message,
    severity,
    url,
    user_email,
    (additional_context ->> 'sessionId') as session_id,
    created_at
FROM error_logs 
WHERE user_id IS NULL 
  AND created_at >= NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 5; 