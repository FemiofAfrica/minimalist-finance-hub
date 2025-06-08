-- Updated function to properly return is_super_admin field
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_all_users_for_admin()
RETURNS TABLE (
    id UUID,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    created_at TIMESTAMPTZ,
    is_super_admin BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_super_admin BOOLEAN;
BEGIN
    -- Check if the current user is a super admin
    SELECT (raw_user_meta_data->>'is_super_admin')::boolean INTO v_is_super_admin 
    FROM auth.users
    WHERE id = auth.uid();
    
    -- Debug: Log the super admin status
    RAISE NOTICE 'User ID: %, Super Admin Status: %', auth.uid(), v_is_super_admin;
    
    IF v_is_super_admin IS NOT TRUE THEN
        RAISE EXCEPTION 'Only super admins can fetch all users. Current status: %', v_is_super_admin;
    END IF;
    
    -- Return all users with their profile information including super admin status
    RETURN QUERY
    SELECT 
        u.id,
        u.email::TEXT,
        COALESCE(p.first_name, (u.raw_user_meta_data->>'first_name')::TEXT) as first_name,
        COALESCE(p.last_name, (u.raw_user_meta_data->>'last_name')::TEXT) as last_name,
        COALESCE(
            CASE 
                WHEN p.first_name IS NOT NULL AND p.last_name IS NOT NULL 
                THEN p.first_name || ' ' || p.last_name
                WHEN p.first_name IS NOT NULL 
                THEN p.first_name
                WHEN p.last_name IS NOT NULL 
                THEN p.last_name
                WHEN (u.raw_user_meta_data->>'full_name') IS NOT NULL 
                THEN (u.raw_user_meta_data->>'full_name')::TEXT
                WHEN (u.raw_user_meta_data->>'first_name') IS NOT NULL AND (u.raw_user_meta_data->>'last_name') IS NOT NULL
                THEN (u.raw_user_meta_data->>'first_name')::TEXT || ' ' || (u.raw_user_meta_data->>'last_name')::TEXT
                WHEN (u.raw_user_meta_data->>'first_name') IS NOT NULL 
                THEN (u.raw_user_meta_data->>'first_name')::TEXT
                WHEN (u.raw_user_meta_data->>'last_name') IS NOT NULL 
                THEN (u.raw_user_meta_data->>'last_name')::TEXT
                ELSE NULL
            END
        )::TEXT as full_name,
        u.created_at,
        COALESCE((u.raw_user_meta_data->>'is_super_admin')::boolean, false) as is_super_admin
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    WHERE u.deleted_at IS NULL
    ORDER BY u.created_at DESC;
END;
$$; 