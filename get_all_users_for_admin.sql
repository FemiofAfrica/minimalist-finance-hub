-- Function to get all users for super admin notifications
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_all_users_for_admin()
RETURNS TABLE (
    id UUID,
    email TEXT,
    created_at TIMESTAMPTZ,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    is_super_admin BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the caller is a super admin
    IF (auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_super_admin' != 'true' THEN
        RAISE EXCEPTION 'Only super admins can access this function';
    END IF;

    RETURN QUERY
    SELECT 
        au.id,
        au.email::TEXT,
        au.created_at,
        COALESCE(p.first_name, (au.raw_user_meta_data ->> 'first_name')::TEXT) as first_name,
        COALESCE(p.last_name, (au.raw_user_meta_data ->> 'last_name')::TEXT) as last_name,
        COALESCE(
            CASE 
                WHEN p.first_name IS NOT NULL AND p.last_name IS NOT NULL 
                THEN p.first_name || ' ' || p.last_name
                WHEN p.first_name IS NOT NULL 
                THEN p.first_name
                WHEN p.last_name IS NOT NULL 
                THEN p.last_name
                WHEN (au.raw_user_meta_data ->> 'full_name') IS NOT NULL 
                THEN (au.raw_user_meta_data ->> 'full_name')::TEXT
                WHEN (au.raw_user_meta_data ->> 'first_name') IS NOT NULL AND (au.raw_user_meta_data ->> 'last_name') IS NOT NULL
                THEN (au.raw_user_meta_data ->> 'first_name')::TEXT || ' ' || (au.raw_user_meta_data ->> 'last_name')::TEXT
                WHEN (au.raw_user_meta_data ->> 'first_name') IS NOT NULL 
                THEN (au.raw_user_meta_data ->> 'first_name')::TEXT
                WHEN (au.raw_user_meta_data ->> 'last_name') IS NOT NULL 
                THEN (au.raw_user_meta_data ->> 'last_name')::TEXT
                ELSE NULL
            END
        ) as full_name,
        COALESCE(
            (au.raw_user_meta_data ->> 'is_super_admin')::BOOLEAN,
            (au.user_metadata ->> 'is_super_admin')::BOOLEAN,
            false
        ) as is_super_admin
    FROM auth.users au
    LEFT JOIN profiles p ON au.id = p.id
    WHERE au.email IS NOT NULL
    ORDER BY au.created_at DESC
    LIMIT 100;
END;
$$; 