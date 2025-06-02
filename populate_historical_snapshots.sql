-- Script to populate monthly snapshots for all existing transactions
-- Run this in Supabase SQL Editor after setting up the monthly_snapshots table

-- First, let's create a helper function to populate all historical data
CREATE OR REPLACE FUNCTION populate_all_monthly_snapshots()
RETURNS TABLE(user_id UUID, months_processed INTEGER) AS $$
DECLARE
    user_record RECORD;
    month_record RECORD;
    months_count INTEGER;
BEGIN
    -- Loop through each user
    FOR user_record IN 
        SELECT DISTINCT t.user_id 
        FROM public.transactions t
        JOIN auth.users au ON t.user_id = au.id
    LOOP
        months_count := 0;
        
        -- Get all unique year-month combinations for this user
        FOR month_record IN
            SELECT DISTINCT 
                EXTRACT(YEAR FROM t.date)::INTEGER as year,
                EXTRACT(MONTH FROM t.date)::INTEGER as month
            FROM public.transactions t
            WHERE t.user_id = user_record.user_id
            ORDER BY year, month
        LOOP
            -- Calculate snapshot for this month
            PERFORM public.calculate_monthly_snapshot(
                user_record.user_id, 
                month_record.year, 
                month_record.month
            );
            
            months_count := months_count + 1;
        END LOOP;
        
        RETURN QUERY VALUES (user_record.user_id, months_count);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the population function
SELECT * FROM populate_all_monthly_snapshots();

-- Show a summary of created snapshots
SELECT 
    COUNT(*) as total_snapshots,
    COUNT(DISTINCT user_id) as users_with_snapshots,
    MIN(year || '-' || LPAD(month::text, 2, '0')) as earliest_month,
    MAX(year || '-' || LPAD(month::text, 2, '0')) as latest_month
FROM public.monthly_snapshots;

-- Show recent snapshots (for verification)
SELECT 
    year,
    month,
    opening_balance,
    closing_balance,
    total_income,
    total_expenses,
    transaction_count,
    created_at
FROM public.monthly_snapshots 
ORDER BY year DESC, month DESC 
LIMIT 10;

-- Clean up the helper function
DROP FUNCTION IF EXISTS populate_all_monthly_snapshots(); 