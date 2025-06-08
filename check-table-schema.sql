-- Check the current notifications table schema
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;

-- Check if the table exists at all
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'notifications'
) as table_exists;

-- Expected vs actual structure
SELECT 'EXPECTED COLUMNS FOR NOTIFICATIONS TABLE:' as comparison;
-- title, message, url, notification_type, status, sent_at, error_message, metadata 