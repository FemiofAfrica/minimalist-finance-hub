-- Create a test notification directly
INSERT INTO public.notifications (
  user_id, 
  title, 
  message, 
  link, 
  type, 
  is_read, 
  created_at
) VALUES (
  '3393a074-8692-4d58-87cd-77d910b5cdfc',
  '🎉 SQL Test Notification',
  'This notification was created directly via SQL! If you see this in the bell, the notification system is working perfectly.',
  '/dashboard',
  'info',
  false,
  NOW()
); 