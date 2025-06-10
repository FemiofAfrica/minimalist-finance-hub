-- Check the auth.users table schema
\d auth.users

-- Check current super admin users
SELECT 
  id,
  email,
  raw_user_meta_data,
  raw_app_meta_data
FROM auth.users 
WHERE raw_user_meta_data->>'is_super_admin' = 'true'
   OR raw_app_meta_data->>'is_super_admin' = 'true'
LIMIT 5; 