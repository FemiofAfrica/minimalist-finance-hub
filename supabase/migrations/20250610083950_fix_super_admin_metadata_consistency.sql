-- Fix super admin metadata consistency
-- This ensures the super admin flag is in both user_metadata and raw_user_meta_data

-- Update users where super admin flag exists in raw_user_meta_data but not synced to raw_app_meta_data
UPDATE auth.users 
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}')::jsonb || '{"is_super_admin": true}'::jsonb
WHERE (raw_user_meta_data->>'is_super_admin')::boolean = true 
  AND COALESCE((raw_app_meta_data->>'is_super_admin')::boolean, false) = false;

-- Log the changes
DO $$
BEGIN
  RAISE NOTICE 'Super admin metadata consistency migration completed successfully';
END $$;
