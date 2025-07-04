-- Migration to fix RLS policies and ensure partial deletion entities exist

-- 1. Create a helper function to check for super admin status
-- This function uses SECURITY DEFINER to safely access auth.users
CREATE OR REPLACE FUNCTION is_super_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  SELECT (raw_app_meta_data ->> 'is_super_admin')::BOOLEAN INTO is_admin
  FROM auth.users
  WHERE id = p_user_id;
  RETURN COALESCE(is_admin, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.is_super_admin(UUID) TO authenticated;

-- 2. Drop the old, problematic RLS policies
DROP POLICY IF EXISTS "Super admins can manage all deletion requests" ON public.account_deletion_requests;
DROP POLICY IF EXISTS "Super admins can view all partial deletion requests" ON public.partial_deletion_requests;

-- 3. Recreate the policies using the secure helper function
CREATE POLICY "Super admins can manage all deletion requests" ON public.account_deletion_requests
    FOR ALL USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can view all partial deletion requests" ON public.partial_deletion_requests
    FOR ALL USING (is_super_admin(auth.uid()));


-- 4. Re-run the partial deletion setup to ensure everything exists
-- Create partial deletion requests table (IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS public.partial_deletion_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    data_types JSONB NOT NULL,
    reason TEXT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    deletion_summary JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_partial_deletion_requests_user_id ON public.partial_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_partial_deletion_requests_status ON public.partial_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_partial_deletion_requests_requested_at ON public.partial_deletion_requests(requested_at);

-- Enable RLS (if not already enabled)
ALTER TABLE public.partial_deletion_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for partial deletion requests (re-asserting them is safe)
DROP POLICY IF EXISTS "Users can view their own partial deletion requests" ON public.partial_deletion_requests;
CREATE POLICY "Users can view their own partial deletion requests" ON public.partial_deletion_requests
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own partial deletion requests" ON public.partial_deletion_requests;
CREATE POLICY "Users can create their own partial deletion requests" ON public.partial_deletion_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to get available data types for partial deletion (re-creating it)
CREATE OR REPLACE FUNCTION public.get_available_data_types_for_deletion()
RETURNS jsonb AS $$
BEGIN
    RETURN jsonb_build_object(
        'transactions', jsonb_build_object('name', 'Transaction History', 'description', 'All your financial transactions and records', 'warning', 'This will delete all transaction history but keep accounts'),
        'accounts', jsonb_build_object('name', 'Financial Accounts', 'description', 'Bank accounts, balances, and associated transactions', 'warning', 'This will delete selected accounts and all their transactions'),
        'categories', jsonb_build_object('name', 'Custom Categories', 'description', 'Categories you created for organizing transactions', 'warning', 'Transactions using these categories will be uncategorized'),
        'cards', jsonb_build_object('name', 'Credit/Debit Cards', 'description', 'Your saved payment card information', 'warning', 'This will remove your saved card information'),
        'notifications', jsonb_build_object('name', 'Notification History', 'description', 'Past notifications and settings', 'warning', 'This will clear your notification history'),
        'biometric_credentials', jsonb_build_object('name', 'Biometric Authentication', 'description', 'Fingerprint and biometric login data', 'warning', 'You will need to re-register biometric authentication'),
        'monthly_snapshots', jsonb_build_object('name', 'Monthly Snapshots', 'description', 'Historical monthly financial summaries', 'warning', 'This will delete your financial history reports'),
        'push_subscriptions', jsonb_build_object('name', 'Push Notification Settings', 'description', 'Push notification subscription data', 'warning', 'You may need to re-enable push notifications'),
        'email_preferences', jsonb_build_object('name', 'Email Preferences', 'description', 'Email notification settings and preferences', 'warning', 'Your email preferences will be reset')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions again to be safe
GRANT EXECUTE ON FUNCTION public.get_available_data_types_for_deletion() TO authenticated;

-- Comment to confirm purpose
COMMENT ON FUNCTION public.get_available_data_types_for_deletion() IS 'Returns available data types that can be partially deleted. Re-created to fix migration issues.'; 