-- Create account deletion functionality
-- Migration: 20250130000001_create_account_deletion_function.sql

-- Create account deletion requests table to track deletion requests
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

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_user_id ON public.account_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_status ON public.account_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_requested_at ON public.account_deletion_requests(requested_at);

-- Enable RLS on account deletion requests
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for account deletion requests
CREATE POLICY "Users can view their own deletion requests" ON public.account_deletion_requests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own deletion requests" ON public.account_deletion_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can view all deletion requests" ON public.account_deletion_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id 
            AND (raw_app_meta_data ->> 'is_super_admin')::boolean = true
        )
    );

-- Function to create account deletion request
CREATE OR REPLACE FUNCTION public.request_account_deletion(
    p_reason TEXT DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
    v_user_id UUID;
    v_email TEXT;
    v_request_id UUID;
    v_existing_request RECORD;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User must be authenticated to request account deletion'
        );
    END IF;
    
    -- Get user email
    SELECT email INTO v_email 
    FROM auth.users 
    WHERE id = v_user_id;
    
    -- Check if there's already a pending request
    SELECT * INTO v_existing_request
    FROM public.account_deletion_requests
    WHERE user_id = v_user_id 
    AND status IN ('pending', 'processing');
    
    IF v_existing_request.id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Account deletion request already exists',
            'request_id', v_existing_request.id
        );
    END IF;
    
    -- Create new deletion request
    INSERT INTO public.account_deletion_requests (
        user_id, email, reason
    ) VALUES (
        v_user_id, v_email, p_reason
    ) RETURNING id INTO v_request_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'request_id', v_request_id,
        'message', 'Account deletion request submitted successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user data summary before deletion
CREATE OR REPLACE FUNCTION public.get_user_data_summary(p_user_id UUID DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
    v_user_id UUID;
    v_summary jsonb;
    v_accounts_count INTEGER;
    v_transactions_count INTEGER;
    v_categories_count INTEGER;
    v_cards_count INTEGER;
    v_notifications_count INTEGER;
    v_biometric_count INTEGER;
    v_push_subs_count INTEGER;
    v_snapshots_count INTEGER;
    v_email_prefs_count INTEGER;
BEGIN
    -- Use provided user_id or current user
    v_user_id := COALESCE(p_user_id, auth.uid());
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('error', 'User ID required');
    END IF;
    
    -- Count data in each table
    SELECT COUNT(*) INTO v_accounts_count FROM public.accounts WHERE user_id = v_user_id;
    SELECT COUNT(*) INTO v_transactions_count FROM public.transactions WHERE user_id = v_user_id;
    SELECT COUNT(*) INTO v_categories_count FROM public.categories WHERE user_id = v_user_id;
    SELECT COUNT(*) INTO v_cards_count FROM public.cards WHERE user_id = v_user_id;
    SELECT COUNT(*) INTO v_notifications_count FROM public.notifications WHERE user_id = v_user_id;
    SELECT COUNT(*) INTO v_biometric_count FROM public.biometric_credentials WHERE user_id = v_user_id;
    SELECT COUNT(*) INTO v_push_subs_count FROM public.push_subscriptions WHERE user_id = v_user_id;
    SELECT COUNT(*) INTO v_snapshots_count FROM public.monthly_snapshots WHERE user_id = v_user_id;
    SELECT COUNT(*) INTO v_email_prefs_count FROM public.user_email_preferences WHERE user_id = v_user_id;
    
    -- Build summary
    v_summary := jsonb_build_object(
        'user_id', v_user_id,
        'accounts', v_accounts_count,
        'transactions', v_transactions_count,
        'categories', v_categories_count,
        'cards', v_cards_count,
        'notifications', v_notifications_count,
        'biometric_credentials', v_biometric_count,
        'push_subscriptions', v_push_subs_count,
        'monthly_snapshots', v_snapshots_count,
        'email_preferences', v_email_prefs_count,
        'total_records', v_accounts_count + v_transactions_count + v_categories_count + 
                        v_cards_count + v_notifications_count + v_biometric_count + 
                        v_push_subs_count + v_snapshots_count + v_email_prefs_count
    );
    
    RETURN v_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to completely delete user account and all associated data
CREATE OR REPLACE FUNCTION public.delete_user_account(
    p_user_id UUID,
    p_admin_user_id UUID DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
    v_result jsonb;
    v_data_summary jsonb;
    v_is_super_admin BOOLEAN := false;
    v_caller_id UUID;
    v_deletion_request_id UUID;
BEGIN
    -- Get caller ID
    v_caller_id := auth.uid();
    
    -- Check if caller is super admin or the user themselves
    IF p_admin_user_id IS NOT NULL THEN
        SELECT (raw_app_meta_data ->> 'is_super_admin')::boolean INTO v_is_super_admin
        FROM auth.users
        WHERE id = p_admin_user_id;
        
        IF NOT v_is_super_admin THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Only super admins can delete other users accounts'
            );
        END IF;
    ELSIF v_caller_id != p_user_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Users can only delete their own accounts'
        );
    END IF;
    
    -- Get data summary before deletion
    v_data_summary := public.get_user_data_summary(p_user_id);
    
    -- Mark any pending deletion requests as processing
    UPDATE public.account_deletion_requests 
    SET status = 'processing', processed_at = NOW()
    WHERE user_id = p_user_id AND status = 'pending'
    RETURNING id INTO v_deletion_request_id;
    
    -- Delete user data in the correct order (due to foreign key constraints)
    -- Note: Most tables have ON DELETE CASCADE, but we'll delete explicitly for logging
    
    -- Delete transactions first (depends on accounts)
    DELETE FROM public.transactions WHERE user_id = p_user_id;
    
    -- Delete cards (depends on accounts)
    DELETE FROM public.cards WHERE user_id = p_user_id;
    
    -- Delete accounts
    DELETE FROM public.accounts WHERE user_id = p_user_id;
    
    -- Delete categories
    DELETE FROM public.categories WHERE user_id = p_user_id;
    
    -- Delete monthly snapshots
    DELETE FROM public.monthly_snapshots WHERE user_id = p_user_id;
    
    -- Delete notifications
    DELETE FROM public.notifications WHERE user_id = p_user_id;
    
    -- Delete biometric credentials
    DELETE FROM public.biometric_credentials WHERE user_id = p_user_id;
    
    -- Delete push subscriptions
    DELETE FROM public.push_subscriptions WHERE user_id = p_user_id;
    
    -- Delete email preferences
    DELETE FROM public.user_email_preferences WHERE user_id = p_user_id;
    
    -- Delete profile
    DELETE FROM public.profiles WHERE id = p_user_id;
    
    -- Update error logs to remove user reference (they have ON DELETE SET NULL)
    UPDATE public.error_logs SET user_id = NULL WHERE user_id = p_user_id;
    
    -- Finally delete the user from auth.users
    DELETE FROM auth.users WHERE id = p_user_id;
    
    -- Mark deletion request as completed
    IF v_deletion_request_id IS NOT NULL THEN
        UPDATE public.account_deletion_requests 
        SET status = 'completed'
        WHERE id = v_deletion_request_id;
    END IF;
    
    -- Return success with summary
    RETURN jsonb_build_object(
        'success', true,
        'message', 'User account and all associated data deleted successfully',
        'data_summary', v_data_summary,
        'deletion_request_id', v_deletion_request_id
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- Mark deletion request as failed
        IF v_deletion_request_id IS NOT NULL THEN
            UPDATE public.account_deletion_requests 
            SET status = 'failed', notes = SQLERRM
            WHERE id = v_deletion_request_id;
        END IF;
        
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Failed to delete user account: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.request_account_deletion(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_data_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_account(UUID, UUID) TO authenticated;

-- Add helpful comments
COMMENT ON TABLE public.account_deletion_requests IS 'Tracks user account deletion requests for compliance and audit purposes';
COMMENT ON FUNCTION public.request_account_deletion(TEXT) IS 'Allows users to request deletion of their account';
COMMENT ON FUNCTION public.get_user_data_summary(UUID) IS 'Returns summary of user data before deletion';
COMMENT ON FUNCTION public.delete_user_account(UUID, UUID) IS 'Completely deletes user account and all associated data'; 