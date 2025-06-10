-- Fix super admin metadata consistency
-- This ensures the super admin flag is in both user_metadata and raw_user_meta_data

-- Update users where super admin flag exists in user_metadata but not in raw_user_meta_data
UPDATE auth.users 
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}')::jsonb || '{"is_super_admin": true}'::jsonb
WHERE (user_metadata->>'is_super_admin')::boolean = true 
  AND COALESCE((raw_user_meta_data->>'is_super_admin')::boolean, false) = false;

-- Update users where super admin flag exists in raw_user_meta_data but not in user_metadata  
UPDATE auth.users 
SET user_metadata = COALESCE(user_metadata, '{}')::jsonb || '{"is_super_admin": true}'::jsonb
WHERE (raw_user_meta_data->>'is_super_admin')::boolean = true 
  AND COALESCE((user_metadata->>'is_super_admin')::boolean, false) = false;

-- Show the results
SELECT 
  id,
  email,
  (user_metadata->>'is_super_admin')::boolean as user_meta_admin,
  (raw_user_meta_data->>'is_super_admin')::boolean as raw_user_meta_admin
FROM auth.users 
WHERE (user_metadata->>'is_super_admin')::boolean = true 
   OR (raw_user_meta_data->>'is_super_admin')::boolean = true; 