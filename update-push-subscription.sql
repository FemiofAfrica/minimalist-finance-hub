-- Update push subscription with fresh endpoint and keys
-- Replace the old expired subscription with the new one

-- First, let's see what we currently have
SELECT 
  id, 
  user_id, 
  endpoint,
  p256dh_key,
  auth_key,
  created_at
FROM push_subscriptions 
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'phermmodynamic@gmail.com'
);

-- Update with the new subscription data
UPDATE push_subscriptions 
SET 
  endpoint = 'https://fcm.googleapis.com/fcm/send/eunLE4YcGfM:APA91bFQEE0Hf021TaQMaoFctnizDj3ykY_oBBr_ToW8EedYZUmN_659FkgPWytgIRsbxzYUF1g8Jx_3O6wI2kXkEu49embS7Lsdd8NPvPoO_NB8R9Lg4ZiSNT5vCo9kN0RJSSgjKp2l',
  p256dh_key = 'BO92K50vv91DVu1CzJNNQo_QscVwfOIsyLgTbN2sI3H2hPEbXaxRPrjZ5p-sxg0Zlac7bho9cQ81qTmg_zeAQFs',
  auth_key = 'GDTxb9AWlmlsU_49bz7_WQ',
  updated_at = NOW()
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'phermmodynamic@gmail.com'
);

-- Verify the update
SELECT 
  id, 
  user_id, 
  endpoint,
  p256dh_key,
  auth_key,
  updated_at
FROM push_subscriptions 
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'phermmodynamic@gmail.com'
);

-- Show confirmation
SELECT 'Push subscription updated successfully!' as status; 