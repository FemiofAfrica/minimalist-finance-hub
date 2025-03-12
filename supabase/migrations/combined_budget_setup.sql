-- STEP 1: Create budgets table with month and year columns
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  month VARCHAR(2) NOT NULL,
  year VARCHAR(4) NOT NULL,
  total_income DECIMAL(15, 2) DEFAULT 0,
  total_budget DECIMAL(15, 2) DEFAULT 0,
  categories JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT budget_total_check CHECK (total_budget >= 0),
  CONSTRAINT income_total_check CHECK (total_income >= 0)
);

-- Create index for month and year columns
CREATE INDEX IF NOT EXISTS idx_budgets_month_year ON public.budgets(month, year);

-- Enable RLS for budgets table
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for budgets
CREATE POLICY "Users can view their own budgets"
  ON public.budgets
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own budgets"
  ON public.budgets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budgets"
  ON public.budgets
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budgets"
  ON public.budgets
  FOR DELETE
  USING (auth.uid() = user_id);

-- STEP 2: Create financial_goals table
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

-- STEP 3: Create triggers for automatic timestamp updates and validation
-- Create updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for budgets table
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Create trigger for financial_goals table
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.financial_goals
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Create validation function for budget categories
CREATE OR REPLACE FUNCTION validate_budget_categories()
RETURNS TRIGGER AS $$
DECLARE
  category_obj jsonb;
BEGIN
  IF NEW.categories IS NOT NULL THEN
    IF jsonb_typeof(NEW.categories) != 'array' THEN
      RAISE EXCEPTION 'categories must be a JSON array';
    END IF;
    
    FOR category_obj IN SELECT * FROM jsonb_array_elements(NEW.categories)
    LOOP
      IF NOT (
        category_obj ? 'category_name' AND
        category_obj ? 'allocated_amount' AND
        category_obj ? 'spent_amount' AND
        category_obj ? 'percentage'
      ) THEN
        RAISE EXCEPTION 'Each category must have category_name, allocated_amount, spent_amount, and percentage fields';
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for categories validation
CREATE TRIGGER validate_budget_categories_trigger
  BEFORE INSERT OR UPDATE ON public.budgets
  FOR EACH ROW
  EXECUTE FUNCTION validate_budget_categories();