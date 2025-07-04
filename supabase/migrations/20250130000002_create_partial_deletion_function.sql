-- Create partial data deletion functionality
-- Migration: 20250130000002_create_partial_deletion_function.sql

-- Create partial deletion requests table
CREATE TABLE IF NOT EXISTS public.partial_deletion_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    data_types JSONB NOT NULL, -- Array of data types to delete
    reason TEXT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    deletion_summary JSONB, -- Summary of what was actually deleted
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_partial_deletion_requests_user_id ON public.partial_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_partial_deletion_requests_status ON public.partial_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_partial_deletion_requests_requested_at ON public.partial_deletion_requests(requested_at);

-- Enable RLS on partial deletion requests
ALTER TABLE public.partial_deletion_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for partial deletion requests
CREATE POLICY "Users can view their own partial deletion requests" ON public.partial_deletion_requests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own partial deletion requests" ON public.partial_deletion_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can view all partial deletion requests" ON public.partial_deletion_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id 
            AND (raw_app_meta_data ->> 'is_super_admin')::boolean = true
        )
    );

-- Function to get available data types for partial deletion
CREATE OR REPLACE FUNCTION public.get_available_data_types_for_deletion()
RETURNS jsonb AS $$
BEGIN
    RETURN jsonb_build_object(
        'transactions', jsonb_build_object(
            'name', 'Transaction History',
            'description', 'All your financial transactions and transaction records',
            'warning', 'This will delete all your transaction history but keep your accounts'
        ),
        'accounts', jsonb_build_object(
            'name', 'Financial Accounts',
            'description', 'Your bank accounts, balances, and associated transactions',
            'warning', 'This will delete selected accounts and all their transactions'
        ),
        'categories', jsonb_build_object(
            'name', 'Custom Categories',
            'description', 'Categories you created for organizing transactions',
            'warning', 'Transactions using these categories will be uncategorized'
        ),
        'cards', jsonb_build_object(
            'name', 'Credit/Debit Cards',
            'description', 'Your saved payment cards information',
            'warning', 'This will remove your saved card information'
        ),
        'notifications', jsonb_build_object(
            'name', 'Notification History',
            'description', 'Past notifications and notification settings',
            'warning', 'This will clear your notification history'
        ),
        'biometric_credentials', jsonb_build_object(
            'name', 'Biometric Authentication',
            'description', 'Fingerprint and biometric login data',
            'warning', 'You will need to re-register your biometric authentication'
        ),
        'monthly_snapshots', jsonb_build_object(
            'name', 'Monthly Snapshots',
            'description', 'Historical monthly financial summaries',
            'warning', 'This will delete your financial history reports'
        ),
        'push_subscriptions', jsonb_build_object(
            'name', 'Push Notification Settings',
            'description', 'Push notification subscription data',
            'warning', 'You may need to re-enable push notifications'
        ),
        'email_preferences', jsonb_build_object(
            'name', 'Email Preferences',
            'description', 'Email notification settings and preferences',
            'warning', 'Your email preferences will be reset to defaults'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create partial deletion request
CREATE OR REPLACE FUNCTION public.request_partial_deletion(
    p_data_types TEXT[],
    p_reason TEXT DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
    v_user_id UUID;
    v_email TEXT;
    v_request_id UUID;
    v_existing_request RECORD;
    v_data_types_json JSONB;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User must be authenticated to request partial deletion'
        );
    END IF;
    
    -- Validate data types
    IF p_data_types IS NULL OR array_length(p_data_types, 1) = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'At least one data type must be selected for deletion'
        );
    END IF;
    
    -- Convert array to JSONB
    v_data_types_json := to_jsonb(p_data_types);
    
    -- Get user email
    SELECT email INTO v_email 
    FROM auth.users 
    WHERE id = v_user_id;
    
    -- Check if there's already a pending request for the same data types
    SELECT * INTO v_existing_request
    FROM public.partial_deletion_requests
    WHERE user_id = v_user_id 
    AND status IN ('pending', 'processing')
    AND data_types = v_data_types_json;
    
    IF v_existing_request.id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Partial deletion request for these data types already exists',
            'request_id', v_existing_request.id
        );
    END IF;
    
    -- Create new partial deletion request
    INSERT INTO public.partial_deletion_requests (
        user_id, email, data_types, reason
    ) VALUES (
        v_user_id, v_email, v_data_types_json, p_reason
    ) RETURNING id INTO v_request_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'request_id', v_request_id,
        'message', 'Partial deletion request submitted successfully',
        'data_types', v_data_types_json
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get partial data summary for specific data types
CREATE OR REPLACE FUNCTION public.get_partial_data_summary(
    p_data_types TEXT[],
    p_user_id UUID DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
    v_user_id UUID;
    v_summary jsonb := '{}';
    v_data_type TEXT;
    v_count INTEGER;
BEGIN
    -- Use provided user_id or current user
    v_user_id := COALESCE(p_user_id, auth.uid());
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('error', 'User ID required');
    END IF;
    
    -- Count data for each requested type
    FOREACH v_data_type IN ARRAY p_data_types
    LOOP
        CASE v_data_type
            WHEN 'transactions' THEN
                SELECT COUNT(*) INTO v_count FROM public.transactions WHERE user_id = v_user_id;
            WHEN 'accounts' THEN
                SELECT COUNT(*) INTO v_count FROM public.accounts WHERE user_id = v_user_id;
            WHEN 'categories' THEN
                SELECT COUNT(*) INTO v_count FROM public.categories WHERE user_id = v_user_id;
            WHEN 'cards' THEN
                SELECT COUNT(*) INTO v_count FROM public.cards WHERE user_id = v_user_id;
            WHEN 'notifications' THEN
                SELECT COUNT(*) INTO v_count FROM public.notifications WHERE user_id = v_user_id;
            WHEN 'biometric_credentials' THEN
                SELECT COUNT(*) INTO v_count FROM public.biometric_credentials WHERE user_id = v_user_id;
            WHEN 'monthly_snapshots' THEN
                SELECT COUNT(*) INTO v_count FROM public.monthly_snapshots WHERE user_id = v_user_id;
            WHEN 'push_subscriptions' THEN
                SELECT COUNT(*) INTO v_count FROM public.push_subscriptions WHERE user_id = v_user_id;
            WHEN 'email_preferences' THEN
                SELECT COUNT(*) INTO v_count FROM public.user_email_preferences WHERE user_id = v_user_id;
            ELSE
                v_count := 0;
        END CASE;
        
        v_summary := v_summary || jsonb_build_object(v_data_type, v_count);
    END LOOP;
    
    RETURN jsonb_build_object(
        'user_id', v_user_id,
        'data_types', v_summary,
        'requested_types', to_jsonb(p_data_types)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to perform partial deletion of user data
CREATE OR REPLACE FUNCTION public.delete_partial_user_data(
    p_user_id UUID,
    p_data_types TEXT[],
    p_admin_user_id UUID DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
    v_caller_id UUID;
    v_is_super_admin BOOLEAN := false;
    v_data_type TEXT;
    v_deletion_summary jsonb := '{}';
    v_deleted_count INTEGER;
    v_request_id UUID;
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
                'error', 'Only super admins can delete other users data'
            );
        END IF;
    ELSIF v_caller_id != p_user_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Users can only delete their own data'
        );
    END IF;
    
    -- Mark any pending partial deletion requests as processing
    UPDATE public.partial_deletion_requests 
    SET status = 'processing', processed_at = NOW()
    WHERE user_id = p_user_id 
    AND status = 'pending'
    AND data_types = to_jsonb(p_data_types)
    RETURNING id INTO v_request_id;
    
    -- Delete data based on specified types
    FOREACH v_data_type IN ARRAY p_data_types
    LOOP
        CASE v_data_type
            WHEN 'transactions' THEN
                DELETE FROM public.transactions WHERE user_id = p_user_id;
                GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
                v_deletion_summary := v_deletion_summary || jsonb_build_object('transactions_deleted', v_deleted_count);
                
            WHEN 'accounts' THEN
                -- This will cascade to delete related transactions and cards
                DELETE FROM public.accounts WHERE user_id = p_user_id;
                GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
                v_deletion_summary := v_deletion_summary || jsonb_build_object('accounts_deleted', v_deleted_count);
                
            WHEN 'categories' THEN
                -- Set category_id to NULL for transactions that use these categories
                UPDATE public.transactions SET category_id = NULL 
                WHERE category_id IN (
                    SELECT category_id FROM public.categories WHERE user_id = p_user_id
                );
                DELETE FROM public.categories WHERE user_id = p_user_id;
                GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
                v_deletion_summary := v_deletion_summary || jsonb_build_object('categories_deleted', v_deleted_count);
                
            WHEN 'cards' THEN
                DELETE FROM public.cards WHERE user_id = p_user_id;
                GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
                v_deletion_summary := v_deletion_summary || jsonb_build_object('cards_deleted', v_deleted_count);
                
            WHEN 'notifications' THEN
                DELETE FROM public.notifications WHERE user_id = p_user_id;
                GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
                v_deletion_summary := v_deletion_summary || jsonb_build_object('notifications_deleted', v_deleted_count);
                
            WHEN 'biometric_credentials' THEN
                DELETE FROM public.biometric_credentials WHERE user_id = p_user_id;
                GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
                v_deletion_summary := v_deletion_summary || jsonb_build_object('biometric_credentials_deleted', v_deleted_count);
                
            WHEN 'monthly_snapshots' THEN
                DELETE FROM public.monthly_snapshots WHERE user_id = p_user_id;
                GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
                v_deletion_summary := v_deletion_summary || jsonb_build_object('monthly_snapshots_deleted', v_deleted_count);
                
            WHEN 'push_subscriptions' THEN
                DELETE FROM public.push_subscriptions WHERE user_id = p_user_id;
                GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
                v_deletion_summary := v_deletion_summary || jsonb_build_object('push_subscriptions_deleted', v_deleted_count);
                
            WHEN 'email_preferences' THEN
                DELETE FROM public.user_email_preferences WHERE user_id = p_user_id;
                GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
                v_deletion_summary := v_deletion_summary || jsonb_build_object('email_preferences_deleted', v_deleted_count);
                
            ELSE
                v_deletion_summary := v_deletion_summary || jsonb_build_object(v_data_type || '_error', 'Unknown data type');
        END CASE;
    END LOOP;
    
    -- Update partial deletion request as completed
    IF v_request_id IS NOT NULL THEN
        UPDATE public.partial_deletion_requests 
        SET status = 'completed', deletion_summary = v_deletion_summary
        WHERE id = v_request_id;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Partial data deletion completed successfully',
        'deletion_summary', v_deletion_summary,
        'data_types_deleted', to_jsonb(p_data_types),
        'request_id', v_request_id
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- Mark deletion request as failed
        IF v_request_id IS NOT NULL THEN
            UPDATE public.partial_deletion_requests 
            SET status = 'failed', notes = SQLERRM
            WHERE id = v_request_id;
        END IF;
        
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Failed to delete partial user data: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_available_data_types_for_deletion() TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_partial_deletion(TEXT[], TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_partial_data_summary(TEXT[], UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_partial_user_data(UUID, TEXT[], UUID) TO authenticated;

-- Add helpful comments
COMMENT ON TABLE public.partial_deletion_requests IS 'Tracks user partial data deletion requests for compliance and audit purposes';
COMMENT ON FUNCTION public.get_available_data_types_for_deletion() IS 'Returns available data types that can be partially deleted';
COMMENT ON FUNCTION public.request_partial_deletion(TEXT[], TEXT) IS 'Allows users to request deletion of specific data types';
COMMENT ON FUNCTION public.get_partial_data_summary(TEXT[], UUID) IS 'Returns summary of specific data types for a user';
COMMENT ON FUNCTION public.delete_partial_user_data(UUID, TEXT[], UUID) IS 'Performs partial deletion of specified user data types'; 