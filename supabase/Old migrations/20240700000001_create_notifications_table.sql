-- Create notifications table for users
CREATE TABLE IF NOT EXISTS public.notifications (
    notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'success', 'error'
    link TEXT, -- Optional link to navigate to when clicked
    is_read BOOLEAN NOT NULL DEFAULT false,
    is_dismissed BOOLEAN DEFAULT false,
    source TEXT NOT NULL, -- e.g., 'subscription', 'system', 'admin'
    related_id TEXT, -- UUID of the related entity (e.g., subscription_id)
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    expires_at TIMESTAMPTZ -- When the notification should expire/disappear, NULL means never
);

-- Index for user notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

-- Enable RLS on notifications
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

-- Notifications policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- Admin policies for notifications
DROP POLICY IF EXISTS "Admins can create notifications for any user" ON public.notifications;
CREATE POLICY "Super Admins can create notifications for any user"
    ON public.notifications FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id AND (raw_user_meta_data->>'is_super_admin')::boolean = true
        )
    );

-- Create a function for super admins to send notifications to users
CREATE OR REPLACE FUNCTION send_notification_to_user(
    p_user_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'info',
    p_link TEXT DEFAULT NULL,
    p_source TEXT DEFAULT 'admin',
    p_related_id TEXT DEFAULT NULL,
    p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notification_id UUID;
    v_is_super_admin BOOLEAN;
BEGIN
    -- Check if the current user is a super admin
    SELECT (raw_user_meta_data->>'is_super_admin')::boolean INTO v_is_super_admin 
    FROM auth.users 
    WHERE id = auth.uid();
    
    IF v_is_super_admin IS NOT TRUE THEN
        RAISE EXCEPTION 'Only super admins can send notifications to users';
    END IF;
    
    -- Insert the notification
    INSERT INTO public.notifications (
        user_id, 
        title, 
        message, 
        type, 
        link, 
        source, 
        related_id,
        expires_at
    ) VALUES (
        p_user_id,
        p_title,
        p_message,
        p_type,
        p_link,
        p_source,
        p_related_id,
        p_expires_at
    )
    RETURNING notification_id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$;

-- Create a function for super admins to send notifications to all users
CREATE OR REPLACE FUNCTION send_notification_to_all_users(
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'info',
    p_link TEXT DEFAULT NULL,
    p_source TEXT DEFAULT 'admin',
    p_related_id TEXT DEFAULT NULL,
    p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_super_admin BOOLEAN;
    v_count INTEGER := 0;
    v_user RECORD;
BEGIN
    -- Check if the current user is a super admin
    SELECT (raw_user_meta_data->>'is_super_admin')::boolean INTO v_is_super_admin 
    FROM auth.users 
    WHERE id = auth.uid();
    
    IF v_is_super_admin IS NOT TRUE THEN
        RAISE EXCEPTION 'Only super admins can send notifications to all users';
    END IF;
    
    -- Send notification to each active user
    FOR v_user IN SELECT id FROM auth.users WHERE deleted_at IS NULL
    LOOP
        INSERT INTO public.notifications (
            user_id, 
            title, 
            message, 
            type, 
            link, 
            source, 
            related_id,
            expires_at
        ) VALUES (
            v_user.id,
            p_title,
            p_message,
            p_type,
            p_link,
            p_source,
            p_related_id,
            p_expires_at
        );
        
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$;

-- Function to check for upcoming subscription renewals and create notifications
CREATE OR REPLACE FUNCTION check_subscription_renewals()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_subscription RECORD;
    v_today DATE := CURRENT_DATE;
    v_notification_date DATE;
    v_count INTEGER := 0;
BEGIN
    -- Loop through active subscriptions
    FOR v_subscription IN 
        SELECT 
            s.subscription_id,
            s.user_id,
            s.name,
            s.amount,
            s.next_billing_date,
            s.reminder_days
        FROM 
            public.subscriptions s
        WHERE 
            s.is_active = true
            AND s.reminder_days > 0
    LOOP
        -- Calculate the notification date based on reminder_days
        v_notification_date := (v_subscription.next_billing_date::DATE - v_subscription.reminder_days);
        
        -- If today is the notification date, create a notification
        IF v_today = v_notification_date THEN
            -- Check if notification for this subscription already exists for today
            IF NOT EXISTS (
                SELECT 1 FROM public.notifications
                WHERE 
                    user_id = v_subscription.user_id
                    AND related_id = v_subscription.subscription_id::TEXT
                    AND source = 'subscription'
                    AND created_at::DATE = v_today
            ) THEN
                -- Create notification
                INSERT INTO public.notifications (
                    user_id,
                    title,
                    message,
                    type,
                    link,
                    source,
                    related_id,
                    expires_at
                ) VALUES (
                    v_subscription.user_id,
                    'Upcoming Subscription Renewal',
                    'Your subscription "' || v_subscription.name || '" will renew on ' || 
                    to_char(v_subscription.next_billing_date::DATE, 'Month DD, YYYY') || 
                    ' for ' || v_subscription.amount || '.',
                    'warning',
                    '/subscriptions',
                    'subscription',
                    v_subscription.subscription_id::TEXT,
                    (v_subscription.next_billing_date::DATE + INTERVAL '1 day')::TIMESTAMPTZ
                );
                
                v_count := v_count + 1;
            END IF;
        END IF;
    END LOOP;
    
    RETURN v_count;
END;
$$;

-- Create a scheduled function to run daily to check for subscription renewals
-- Note: This requires pg_cron extension to be enabled by a superuser
DO $$
BEGIN
    -- Check if pg_cron extension exists
    IF EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
    ) THEN
        -- This might fail if the user doesn't have permissions to create cron jobs
        -- In that case, you'll need to set this up manually or with a different method
        BEGIN
            SELECT cron.schedule('subscription-renewal-check', '0 0 * * *', 'SELECT check_subscription_renewals()');
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not create cron job for subscription renewals. You may need to set this up manually.';
        END;
    ELSE
        RAISE NOTICE 'pg_cron extension is not available. You will need to set up a different method to run check_subscription_renewals() daily.';
    END IF;
END;
$$;

-- Create RPC for marking notifications as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID, p_is_read BOOLEAN DEFAULT true)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_notification_exists BOOLEAN;
BEGIN
    -- Get current user ID
    v_user_id := auth.uid();
    
    -- Check if notification exists and belongs to user
    SELECT EXISTS (
        SELECT 1 FROM notifications 
        WHERE notification_id = p_notification_id 
        AND user_id = v_user_id
    ) INTO v_notification_exists;
    
    IF NOT v_notification_exists THEN
        RETURN false;
    END IF;
    
    -- Update notification
    UPDATE notifications
    SET 
        is_read = p_is_read,
        updated_at = now()
    WHERE 
        notification_id = p_notification_id
        AND user_id = v_user_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RPC for marking all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get current user ID
    v_user_id := auth.uid();
    
    -- Update all notifications for this user
    UPDATE notifications
    SET 
        is_read = true,
        updated_at = now()
    WHERE 
        user_id = v_user_id
        AND is_read = false;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.notifications TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read() TO authenticated; 