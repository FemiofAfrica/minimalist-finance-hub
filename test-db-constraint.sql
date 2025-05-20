-- This is a test query for analyzing the database frequency constraints
-- You can run this in the Supabase SQL editor to check the constraint

-- Check the subscription_frequency enum
SELECT unnest(enum_range(NULL::subscription_frequency)) AS valid_frequency;

-- Test valid frequency insertions (these should work)
DO $$
BEGIN
  -- Valid frequencies:
  -- 'monthly', 'yearly', 'quarterly', 'weekly'
  -- Make sure not to conflict with existing IDs
  
  -- Try with 'monthly'
  INSERT INTO subscriptions (
    subscription_id, name, amount, frequency, next_billing_date, is_active, user_id
  ) VALUES (
    'test_monthly_id', 'Test Monthly', 1000, 'monthly', '2024-12-31', true, 
    (SELECT id FROM auth.users LIMIT 1)
  ) ON CONFLICT (subscription_id) DO NOTHING;
  
  -- Try with 'yearly' (not 'annually')
  INSERT INTO subscriptions (
    subscription_id, name, amount, frequency, next_billing_date, is_active, user_id
  ) VALUES (
    'test_yearly_id', 'Test Yearly', 2000, 'yearly', '2024-12-31', true,
    (SELECT id FROM auth.users LIMIT 1)
  ) ON CONFLICT (subscription_id) DO NOTHING;
  
  -- Try with 'quarterly'
  INSERT INTO subscriptions (
    subscription_id, name, amount, frequency, next_billing_date, is_active, user_id
  ) VALUES (
    'test_quarterly_id', 'Test Quarterly', 3000, 'quarterly', '2024-12-31', true,
    (SELECT id FROM auth.users LIMIT 1)
  ) ON CONFLICT (subscription_id) DO NOTHING;
  
  -- Try with 'weekly'
  INSERT INTO subscriptions (
    subscription_id, name, amount, frequency, next_billing_date, is_active, user_id
  ) VALUES (
    'test_weekly_id', 'Test Weekly', 4000, 'weekly', '2024-12-31', true,
    (SELECT id FROM auth.users LIMIT 1)
  ) ON CONFLICT (subscription_id) DO NOTHING;
  
  -- This should FAIL if uncommented - testing invalid frequency
  -- INSERT INTO subscriptions (
  --   subscription_id, name, amount, frequency, next_billing_date, is_active, user_id
  -- ) VALUES (
  --   'test_invalid_id', 'Test Invalid', 5000, 'annually', '2024-12-31', true,
  --   (SELECT id FROM auth.users LIMIT 1)
  -- );
  
END $$; 