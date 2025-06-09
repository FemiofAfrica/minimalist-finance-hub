-- Fix the check_subscription_renewals function to ensure privacy
-- Users should only receive notifications about their own subscriptions
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
    v_current_user_id UUID;
BEGIN
    -- Get current user ID if authenticated
    v_current_user_id := auth.uid();
    
    -- Loop through active subscriptions
    -- If a user is making this call, only process their subscriptions
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
            AND (v_current_user_id IS NULL OR s.user_id = v_current_user_id) -- Only process current user's subscriptions if authenticated
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
                    ' for ' || v_subscription.amount || '.',
                    '/subscriptions',
                    'both',
                    'pending',
                    NOW(),
                    jsonb_build_object(
                        'subscription_id', v_subscription.subscription_id,
                        'type', 'subscription_renewal',
                        'next_billing_date', v_subscription.next_billing_date,
                        'amount', v_subscription.amount
                    )
                );
                
                v_count := v_count + 1;
            END IF;
        END IF;
    END LOOP;
    
    RETURN v_count;
END;
$$; 