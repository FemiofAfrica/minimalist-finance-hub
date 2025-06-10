-- Final test notification insert
INSERT INTO public.notifications (
    user_id,
    title, 
    message,
    link,
    type,
    is_read,
    is_dismissed,
    created_at
) VALUES (
    '3393a074-8692-4d58-87cd-77d910b5cdfc',
    '🔔 Manual Database Insert',
    'This notification was inserted directly into the database. If you see this in your notification bell, the system is working perfectly!',
    '/dashboard',
    'info',
    false,
    false,
    NOW()
);

-- Verify the insert worked
SELECT * FROM public.notifications WHERE user_id = '3393a074-8692-4d58-87cd-77d910b5cdfc' ORDER BY created_at DESC LIMIT 1; 