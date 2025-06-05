-- Create user email preferences table
CREATE TABLE IF NOT EXISTS public.user_email_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Email notification preferences
    subscription_reminders_enabled BOOLEAN DEFAULT true,
    notification_emails_enabled BOOLEAN DEFAULT true,
    email_frequency TEXT DEFAULT 'immediate' CHECK (email_frequency IN ('immediate', 'daily', 'weekly', 'disabled')),
    
    -- Unsubscribe tokens for easy opt-out
    unsubscribe_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    
    -- Ensure one row per user
    UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_email_preferences_user_id ON public.user_email_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_email_preferences_unsubscribe_token ON public.user_email_preferences(unsubscribe_token);

-- Enable RLS
ALTER TABLE public.user_email_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies
DROP POLICY IF EXISTS "Users can view their own email preferences" ON public.user_email_preferences;
CREATE POLICY "Users can view their own email preferences"
    ON public.user_email_preferences FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own email preferences" ON public.user_email_preferences;
CREATE POLICY "Users can update their own email preferences"
    ON public.user_email_preferences FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own email preferences" ON public.user_email_preferences;
CREATE POLICY "Users can insert their own email preferences"
    ON public.user_email_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Function to automatically create email preferences for new users
CREATE OR REPLACE FUNCTION create_user_email_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_email_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create email preferences when a user signs up
DROP TRIGGER IF EXISTS create_user_email_preferences_trigger ON auth.users;
CREATE TRIGGER create_user_email_preferences_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_email_preferences();

-- Function to get user email preferences (with defaults)
CREATE OR REPLACE FUNCTION get_user_email_preferences(p_user_id UUID)
RETURNS TABLE (
    subscription_reminders_enabled BOOLEAN,
    notification_emails_enabled BOOLEAN,
    email_frequency TEXT,
    unsubscribe_token TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(uep.subscription_reminders_enabled, true) as subscription_reminders_enabled,
        COALESCE(uep.notification_emails_enabled, true) as notification_emails_enabled,
        COALESCE(uep.email_frequency, 'immediate') as email_frequency,
        uep.unsubscribe_token
    FROM public.user_email_preferences uep
    WHERE uep.user_id = p_user_id
    UNION ALL
    SELECT true, true, 'immediate'::TEXT, NULL::TEXT
    WHERE NOT EXISTS (
        SELECT 1 FROM public.user_email_preferences 
        WHERE user_id = p_user_id
    )
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle unsubscribe via token
CREATE OR REPLACE FUNCTION unsubscribe_from_emails(p_token TEXT, p_type TEXT DEFAULT 'all')
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_updated BOOLEAN := false;
BEGIN
    -- Find user by unsubscribe token
    SELECT user_id INTO v_user_id
    FROM public.user_email_preferences
    WHERE unsubscribe_token = p_token;
    
    IF v_user_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Update preferences based on type
    IF p_type = 'subscription_reminders' THEN
        UPDATE public.user_email_preferences
        SET subscription_reminders_enabled = false,
            updated_at = now()
        WHERE user_id = v_user_id;
        v_updated := true;
    ELSIF p_type = 'all' THEN
        UPDATE public.user_email_preferences
        SET subscription_reminders_enabled = false,
            notification_emails_enabled = false,
            email_frequency = 'disabled',
            updated_at = now()
        WHERE user_id = v_user_id;
        v_updated := true;
    END IF;
    
    RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create default preferences for existing users
INSERT INTO public.user_email_preferences (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING; 