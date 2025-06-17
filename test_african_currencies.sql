-- Test African Currency Integration
-- Run this in Supabase SQL Editor to test the enhanced African currency support

-- 1. Check if we can create accounts with African currencies
DO $$
DECLARE
    test_user_id UUID;
    test_account_id UUID;
    african_currencies TEXT[] := ARRAY['NGN', 'ZAR', 'GHS', 'KES', 'EGP', 'MAD', 'TND', 'UGX', 'TZS', 'ETB', 'XOF', 'XAF', 'BWP', 'ZMW', 'AOA', 'MZN', 'RWF', 'MWK', 'SZL', 'LSL', 'NAD'];
    currency_code TEXT;
BEGIN
    -- Get a test user (use the first available user)
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'No users found in the system. Please create a user first.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Testing African currency integration for user: %', test_user_id;
    
    -- Test creating accounts with different African currencies
    FOREACH currency_code IN ARRAY african_currencies
    LOOP
        BEGIN
            INSERT INTO accounts (
                user_id,
                account_name,
                account_type,
                institution,
                balance,
                currency,
                is_default
            ) VALUES (
                test_user_id,
                'Test ' || currency_code || ' Account',
                'savings',
                'Test Bank',
                1000.00,
                currency_code,
                false
            ) RETURNING account_id INTO test_account_id;
            
            RAISE NOTICE 'Successfully created % account with ID: %', currency_code, test_account_id;
            
            -- Test creating a transaction with this currency
            INSERT INTO transactions (
                user_id,
                account_id,
                amount,
                description,
                category_name,
                category_type,
                transaction_date
            ) VALUES (
                test_user_id,
                test_account_id,
                100.00,
                'Test transaction in ' || currency_code,
                'Testing',
                'EXPENSE',
                CURRENT_DATE
            );
            
            RAISE NOTICE 'Successfully created transaction in %', currency_code;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error with currency %: %', currency_code, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'African currency integration test completed!';
    
END $$;

-- 2. Summary of African currency accounts created
SELECT 
    'African Currency Accounts Summary' as test_result,
    currency,
    COUNT(*) as account_count,
    SUM(balance) as total_balance
FROM accounts 
WHERE currency IN ('NGN', 'ZAR', 'GHS', 'KES', 'EGP', 'MAD', 'TND', 'UGX', 'TZS', 'ETB', 'XOF', 'XAF', 'BWP', 'ZMW', 'AOA', 'MZN', 'RWF', 'MWK', 'SZL', 'LSL', 'NAD')
GROUP BY currency
ORDER BY currency;

-- 3. Clean up test data (uncomment to remove test accounts)
-- DELETE FROM transactions WHERE description LIKE 'Test transaction in %';
-- DELETE FROM accounts WHERE account_name LIKE 'Test % Account'; 