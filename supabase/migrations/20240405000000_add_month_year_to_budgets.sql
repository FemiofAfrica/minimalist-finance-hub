-- Add month and year columns to budgets table
ALTER TABLE public.budgets
ADD COLUMN IF NOT EXISTS month VARCHAR(2) NOT NULL,
ADD COLUMN IF NOT EXISTS year VARCHAR(4) NOT NULL;

-- Add index for month and year columns
CREATE INDEX IF NOT EXISTS idx_budgets_month_year ON public.budgets(month, year);

-- Create financial_goals table if not exists
CREATE TABLE IF NOT EXISTS public.financial_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  goal_type TEXT NOT NULL CHECK (goal_type IN ('financial_freedom', 'saving_goal', 'expense_management', 'investment_growth')),
  goal_name TEXT NOT NULL,
  target_amount DECIMAL(15, 2) NOT NULL CHECK (target_amount > 0),
  current_amount DECIMAL(15, 2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  target_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT current_amount_check CHECK (current_amount <= target_amount)
);

-- Add RLS policies for financial_goals
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own financial goals"
  ON public.financial_goals
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own financial goals"
  ON public.financial_goals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own financial goals"
  ON public.financial_goals
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own financial goals"
  ON public.financial_goals
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger for financial_goals
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.financial_goals
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();