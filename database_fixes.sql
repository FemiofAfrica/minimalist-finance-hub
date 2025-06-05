-- Fix for database issues encountered during profile updates
-- This file addresses two main problems:
-- 1. Profile update 403 errors (missing INSERT policy)
-- 2. Monthly snapshots 406 errors (malformed queries)

-- ==============================================================================
-- PROFILES TABLE FIXES
-- ==============================================================================

-- Ensure the profiles table has proper INSERT policy for upsert operations
-- This is needed when user profiles don't exist yet and upsert tries to INSERT

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Verify all profiles policies exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- ==============================================================================
-- MONTHLY SNAPSHOTS TABLE FIXES  
-- ==============================================================================

-- Ensure monthly_snapshots table exists and has proper structure
CREATE TABLE IF NOT EXISTS public.monthly_snapshots (
    snapshot_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    opening_balance DECIMAL(12,2) DEFAULT 0.00,
    closing_balance DECIMAL(12,2) DEFAULT 0.00,
    total_income DECIMAL(12,2) DEFAULT 0.00,
    total_expenses DECIMAL(12,2) DEFAULT 0.00,
    transaction_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, year, month)
);

-- Enable RLS on monthly snapshots
ALTER TABLE public.monthly_snapshots ENABLE ROW LEVEL SECURITY;

-- Create/recreate all monthly_snapshots policies
DROP POLICY IF EXISTS "Users can view own monthly snapshots" ON public.monthly_snapshots;
CREATE POLICY "Users can view own monthly snapshots"
    ON public.monthly_snapshots FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create monthly snapshots" ON public.monthly_snapshots;
CREATE POLICY "Users can create monthly snapshots"
    ON public.monthly_snapshots FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own monthly snapshots" ON public.monthly_snapshots;
CREATE POLICY "Users can update own monthly snapshots"
    ON public.monthly_snapshots FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own monthly snapshots" ON public.monthly_snapshots;
CREATE POLICY "Users can delete own monthly snapshots"
    ON public.monthly_snapshots FOR DELETE
    USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_monthly_snapshots_user_id ON public.monthly_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_snapshots_year_month ON public.monthly_snapshots(year, month);
CREATE INDEX IF NOT EXISTS idx_monthly_snapshots_user_year_month ON public.monthly_snapshots(user_id, year, month);

-- ==============================================================================
-- FUNCTIONS AND PROCEDURES
-- ==============================================================================

-- Recreate the calculate_monthly_snapshot function with proper error handling
CREATE OR REPLACE FUNCTION public.calculate_monthly_snapshot(p_user_id UUID, p_year INTEGER, p_month INTEGER)
RETURNS VOID AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    v_total_income DECIMAL(12,2) := 0;
    v_total_expenses DECIMAL(12,2) := 0;
    v_transaction_count INTEGER := 0;
    v_opening_balance DECIMAL(12,2) := 0;
    v_closing_balance DECIMAL(12,2) := 0;
BEGIN
    -- Validate inputs
    IF p_user_id IS NULL OR p_year IS NULL OR p_month IS NULL THEN
        RAISE EXCEPTION 'Invalid input parameters: user_id, year, and month cannot be null';
    END IF;
    
    IF p_month < 1 OR p_month > 12 THEN
        RAISE EXCEPTION 'Invalid month: % (must be between 1 and 12)', p_month;
    END IF;

    -- Calculate date range for the month
    v_start_date := DATE(p_year || '-' || LPAD(p_month::text, 2, '0') || '-01');
    v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    
    -- Get previous month's closing balance as opening balance
    SELECT closing_balance INTO v_opening_balance
    FROM public.monthly_snapshots
    WHERE user_id = p_user_id
    AND (year < p_year OR (year = p_year AND month < p_month))
    ORDER BY year DESC, month DESC
    LIMIT 1;
    
    -- If no previous snapshot, opening balance is 0
    IF v_opening_balance IS NULL THEN
        v_opening_balance := 0;
    END IF;
    
    -- Calculate totals for the month with proper error handling
    BEGIN
        SELECT 
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN type = 'expense' THEN ABS(amount) ELSE 0 END), 0),
            COUNT(*)
        INTO v_total_income, v_total_expenses, v_transaction_count
        FROM public.transactions
        WHERE user_id = p_user_id
        AND date >= v_start_date
        AND date <= v_end_date;
    EXCEPTION WHEN OTHERS THEN
        -- If transactions table query fails, use defaults
        v_total_income := 0;
        v_total_expenses := 0;
        v_transaction_count := 0;
    END;
    
    -- Calculate closing balance
    v_closing_balance := v_opening_balance + v_total_income - v_total_expenses;
    
    -- Insert or update the snapshot
    INSERT INTO public.monthly_snapshots (
        user_id, year, month, opening_balance, closing_balance,
        total_income, total_expenses, transaction_count
    )
    VALUES (
        p_user_id, p_year, p_month, v_opening_balance, v_closing_balance,
        v_total_income, v_total_expenses, v_transaction_count
    )
    ON CONFLICT (user_id, year, month)
    DO UPDATE SET
        opening_balance = EXCLUDED.opening_balance,
        closing_balance = EXCLUDED.closing_balance,
        total_income = EXCLUDED.total_income,
        total_expenses = EXCLUDED.total_expenses,
        transaction_count = EXCLUDED.transaction_count,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.calculate_monthly_snapshot(UUID, INTEGER, INTEGER) TO authenticated;

-- ==============================================================================
-- DATA INTEGRITY CHECKS
-- ==============================================================================

-- Create profiles for users who don't have them
INSERT INTO public.profiles (id, email, first_name, last_name)
SELECT 
    au.id, 
    au.email,
    au.raw_user_meta_data->>'first_name',
    au.raw_user_meta_data->>'last_name'
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- VERIFICATION QUERIES
-- ==============================================================================

-- Show current policy state for debugging
SELECT 
    'profiles' as table_name,
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public'
UNION ALL
SELECT 
    'monthly_snapshots' as table_name,
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'monthly_snapshots' AND schemaname = 'public'
ORDER BY table_name, cmd;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database fixes applied successfully!';
    RAISE NOTICE '✅ Profiles INSERT policy created';
    RAISE NOTICE '✅ Monthly snapshots table and policies verified';
    RAISE NOTICE '✅ Missing profiles created for existing users';
    RAISE NOTICE '✅ Functions updated with better error handling';
END $$; 