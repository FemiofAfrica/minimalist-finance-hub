-- Create push_subscriptions table for web push notifications
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    -- Ensure one subscription per user per endpoint
    UNIQUE(user_id, endpoint)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for push_subscriptions
CREATE POLICY "Users can manage their own push subscriptions" ON push_subscriptions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all push subscriptions" ON push_subscriptions
    FOR ALL USING (auth.role() = 'service_role');

-- Function to get push subscriptions for super admins
CREATE OR REPLACE FUNCTION get_super_admin_push_subscriptions()
RETURNS TABLE (
    id UUID,
    user_id UUID,
    endpoint TEXT,
    p256dh TEXT,
    auth TEXT
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
        ps.id,
        ps.user_id,
        ps.endpoint,
        ps.p256dh,
        ps.auth
    FROM push_subscriptions ps
    JOIN auth.users u ON ps.user_id = u.id
    WHERE ps.is_active = true
    AND (u.raw_user_meta_data ->> 'is_super_admin')::boolean = true;
END;
$$; 