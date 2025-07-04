-- Migration to fix missing account deletion tables and functions

-- Create account_deletion_requests table
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    reason TEXT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_user_id ON public.account_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_status ON public.account_deletion_requests(status);

-- Enable RLS
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own deletion requests" ON public.account_deletion_requests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own deletion requests" ON public.account_deletion_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all deletion requests" ON public.account_deletion_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id
            AND (raw_app_meta_data ->> 'is_super_admin')::boolean = true
        )
    );

-- Function to get user data summary for deletion
CREATE OR REPLACE FUNCTION public.get_user_data_summary(p_user_id UUID DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
    v_user_id UUID;
    v_summary jsonb;
    v_accounts_count INT;
    v_transactions_count INT;
    v_categories_count INT;
    v_cards_count INT;
    v_notifications_count INT;
    v_biometric_count INT;
    v_push_subscriptions_count INT;
    v_snapshots_count INT;
    v_email_prefs_count INT;
    v_total_records INT;
BEGIN
    v_user_id := COALESCE(p_user_id, auth.uid());

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('error', 'User not found');
    END IF;

    SELECT COUNT(*) INTO v_accounts_count FROM public.accounts WHERE user_id = v_user_id;
    SELECT COUNT(*) INTO v_transactions_count FROM public.transactions WHERE user_id = v_user_id;
    SELECT COUNT(*) INTO v_categories_count FROM public.categories WHERE user_id = v_user_id;
    SELECT COUNT(*) INTO v_cards_count FROM public.cards WHERE user_id = v_user_id;
    SELECT COUNT(*) INTO v_notifications_count FROM public.notifications WHERE user_id = v_user_id;
    SELECT COUNT(*) INTO v_biometric_count FROM public.biometric_credentials WHERE user_id = v_user_id;
    SELECT COUNT(*) INTO v_push_subscriptions_count FROM public.push_subscriptions WHERE user_id = v_user_id;
    SELECT COUNT(*) INTO v_snapshots_count FROM public.monthly_snapshots WHERE user_id = v_user_id;
    SELECT COUNT(*) INTO v_email_prefs_count FROM public.user_email_preferences WHERE user_id = v_user_id;

    v_total_records := v_accounts_count + v_transactions_count + v_categories_count + v_cards_count + v_notifications_count + v_biometric_count + v_push_subscriptions_count + v_snapshots_count + v_email_prefs_count;

    v_summary := jsonb_build_object(
        'user_id', v_user_id,
        'accounts', v_accounts_count,
        'transactions', v_transactions_count,
        'categories', v_categories_count,
        'cards', v_cards_count,
        'notifications', v_notifications_count,
        'biometric_credentials', v_biometric_count,
        'push_subscriptions', v_push_subscriptions_count,
        'monthly_snapshots', v_snapshots_count,
        'email_preferences', v_email_prefs_count,
        'total_records', v_total_records
    );

    RETURN v_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_data_summary(UUID) TO authenticated; 