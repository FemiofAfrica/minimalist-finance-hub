-- Add missing additional_context column to error_logs table
ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS additional_context JSONB DEFAULT '{}'::jsonb;

-- Recreate the missing functions that were dropped
CREATE OR REPLACE FUNCTION get_recent_errors(hours_back INTEGER DEFAULT 24)
RETURNS TABLE (
    id UUID,
    message TEXT,
    stack TEXT,
    component_stack TEXT,
    url TEXT,
    user_agent TEXT,
    user_id UUID,
    user_email TEXT,
    error_type TEXT,
    severity TEXT,
    resolved BOOLEAN,
    resolved_by UUID,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    additional_context JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the caller is a super admin
    IF (auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_super_admin' != 'true' THEN
        RAISE EXCEPTION 'Only super admins can access error logs';
    END IF;

    RETURN QUERY
    SELECT 
        el.id,
        el.message,
        el.stack,
        el.component_stack,
        el.url,
        el.user_agent,
        el.user_id,
        el.user_email,
        el.error_type,
        el.severity,
        el.resolved,
        el.resolved_by,
        el.resolved_at,
        el.created_at,
        el.additional_context
    FROM error_logs el
    WHERE el.created_at >= NOW() - INTERVAL '1 hour' * hours_back
    ORDER BY el.created_at DESC;
END;
$$;

-- Function to resolve an error
CREATE OR REPLACE FUNCTION resolve_error(error_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the caller is a super admin
    IF (auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_super_admin' != 'true' THEN
        RAISE EXCEPTION 'Only super admins can resolve errors';
    END IF;

    UPDATE error_logs 
    SET 
        resolved = true,
        resolved_by = auth.uid(),
        resolved_at = NOW()
    WHERE id = error_id;

    RETURN FOUND;
END;
$$;

-- Recreate the missing RLS policies
DROP POLICY IF EXISTS "Super admins can view all error logs" ON error_logs;
CREATE POLICY "Super admins can view all error logs" ON error_logs
    FOR ALL USING (
        (auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_super_admin' = 'true'
    );

DROP POLICY IF EXISTS "Service role can insert error logs" ON error_logs;
CREATE POLICY "Service role can insert error logs" ON error_logs
    FOR INSERT WITH CHECK (true); 