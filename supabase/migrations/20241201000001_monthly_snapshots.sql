-- Create monthly snapshots table to store historical monthly statistics
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

-- Monthly snapshots policies
CREATE POLICY "Users can view own monthly snapshots"
    ON public.monthly_snapshots FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create monthly snapshots"
    ON public.monthly_snapshots FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own monthly snapshots"
    ON public.monthly_snapshots FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own monthly snapshots"
    ON public.monthly_snapshots FOR DELETE
    USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_monthly_snapshots_user_id ON public.monthly_snapshots(user_id);
CREATE INDEX idx_monthly_snapshots_year_month ON public.monthly_snapshots(year, month);
CREATE INDEX idx_monthly_snapshots_user_year_month ON public.monthly_snapshots(user_id, year, month);

-- Create a function to calculate and update monthly snapshots
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
    v_prev_snapshot RECORD;
BEGIN
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
    
    -- Calculate totals for the month
    SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'expense' THEN ABS(amount) ELSE 0 END), 0),
        COUNT(*)
    INTO v_total_income, v_total_expenses, v_transaction_count
    FROM public.transactions
    WHERE user_id = p_user_id
    AND date >= v_start_date
    AND date <= v_end_date;
    
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

-- Create a function to update snapshots when transactions change
CREATE OR REPLACE FUNCTION public.update_monthly_snapshots_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_year INTEGER;
    v_month INTEGER;
    v_current_year INTEGER;
    v_current_month INTEGER;
    rec RECORD;
BEGIN
    -- Get user_id and date info
    IF TG_OP = 'DELETE' THEN
        v_user_id := OLD.user_id;
        v_year := EXTRACT(YEAR FROM OLD.date);
        v_month := EXTRACT(MONTH FROM OLD.date);
    ELSE
        v_user_id := NEW.user_id;
        v_year := EXTRACT(YEAR FROM NEW.date);
        v_month := EXTRACT(MONTH FROM NEW.date);
    END IF;
    
    -- Update the snapshot for the affected month
    PERFORM public.calculate_monthly_snapshot(v_user_id, v_year, v_month);
    
    -- Also update all subsequent months to recalculate balances
    v_current_year := EXTRACT(YEAR FROM CURRENT_DATE);
    v_current_month := EXTRACT(MONTH FROM CURRENT_DATE);
    
    -- Update snapshots from the affected month to current month
    FOR rec IN 
        SELECT DISTINCT EXTRACT(YEAR FROM month_date)::INTEGER AS year, EXTRACT(MONTH FROM month_date)::INTEGER AS month
        FROM generate_series(
            DATE(v_year || '-' || LPAD(v_month::text, 2, '0') || '-01'),
            DATE(v_current_year || '-' || LPAD(v_current_month::text, 2, '0') || '-01'),
            INTERVAL '1 month'
        ) AS month_date
        ORDER BY year, month
    LOOP
        PERFORM public.calculate_monthly_snapshot(v_user_id, rec.year, rec.month);
    END LOOP;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to update snapshots when transactions change
DROP TRIGGER IF EXISTS update_monthly_snapshots_on_insert ON public.transactions;
CREATE TRIGGER update_monthly_snapshots_on_insert
    AFTER INSERT ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_monthly_snapshots_trigger();

DROP TRIGGER IF EXISTS update_monthly_snapshots_on_update ON public.transactions;
CREATE TRIGGER update_monthly_snapshots_on_update
    AFTER UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_monthly_snapshots_trigger();

DROP TRIGGER IF EXISTS update_monthly_snapshots_on_delete ON public.transactions;
CREATE TRIGGER update_monthly_snapshots_on_delete
    AFTER DELETE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_monthly_snapshots_trigger(); 