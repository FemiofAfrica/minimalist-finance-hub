-- Update the check_subscription_renewals function to work with the new notifications table schema
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
            s.reminder_days,
            s.currency
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
                    AND metadata->>'subscription_id' = v_subscription.subscription_id::TEXT
                    AND created_at::DATE = v_today
            ) THEN
                -- Create notification
                INSERT INTO public.notifications (
                    user_id,
                    title,
                    message,
                    url,
                    notification_type,
                    status,
                    created_at,
                    metadata
                ) VALUES (
                    v_subscription.user_id,
                    'Upcoming Subscription Renewal',
                    'Your subscription "' || v_subscription.name || '" will renew on ' || 
                    to_char(v_subscription.next_billing_date::DATE, 'Month DD, YYYY') || 
                    ' for ' || v_subscription.amount || ' ' || v_subscription.currency || '.',
                    '/subscriptions',
                    'both',
                    'pending',
                    NOW(),
                    jsonb_build_object(
                        'subscription_id', v_subscription.subscription_id,
                        'type', 'subscription_renewal',
                        'next_billing_date', v_subscription.next_billing_date,
                        'amount', v_subscription.amount,
                        'currency', v_subscription.currency
                    )
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
END
$$; 