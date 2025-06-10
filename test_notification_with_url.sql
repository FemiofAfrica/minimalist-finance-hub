-- Test notification with URL to verify the mapping works
INSERT INTO public.notifications (
    user_id,
    title, 
    message,
    url,
    notification_type,
    status,
    created_at
) VALUES (
    '3393a074-8692-4d58-87cd-77d910b5cdfc',
    '🔗 URL Test Notification',
    'This notification has a URL that should show as a "View Details" button in the notification bell. Click to test navigation!',
    '/dashboard',
    'push',
    'pending',
    NOW()
);

-- Verify the insert worked
SELECT id, title, message, url, notification_type, status, created_at 
FROM public.notifications 
WHERE user_id = '3393a074-8692-4d58-87cd-77d910b5cdfc' 
ORDER BY created_at DESC 
LIMIT 1; 