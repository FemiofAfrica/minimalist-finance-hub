-- Deploy notifications and push notifications tables
-- Run this in Supabase SQL Editor

-- Create notifications table for storing notification history
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    url TEXT,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('push', 'email', 'both')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admins can view all notifications" ON notifications;
CREATE POLICY "Super admins can view all notifications" ON notifications
    FOR ALL USING (
        (auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_super_admin' = 'true'
    );

DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "System can update notifications" ON notifications;
CREATE POLICY "System can update notifications" ON notifications
    FOR UPDATE USING (true);

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
DROP POLICY IF EXISTS "Users can manage their own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can manage their own push subscriptions" ON push_subscriptions
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all push subscriptions" ON push_subscriptions;
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