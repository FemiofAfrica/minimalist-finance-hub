-- Fix database issues with financial_goals and budgets tables

-- 1. Fix financial_goals table issues
-- First, check if the financial_goals table exists
DO $$
BEGIN
  -- Drop the table if it exists with issues
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_goals') THEN
    -- Drop existing RLS policies
    DROP POLICY IF EXISTS "Users can view their own financial goals" ON public.financial_goals;
    DROP POLICY IF EXISTS "Users can insert their own financial goals" ON public.financial_goals;
    DROP POLICY IF EXISTS "Users can update their own financial goals" ON public.financial_goals;
    DROP POLICY IF EXISTS "Users can delete their own financial goals" ON public.financial_goals;
    
    -- Drop the trigger if it exists
    DROP TRIGGER IF EXISTS set_updated_at ON public.financial_goals;
    
    -- Drop the table
    DROP TABLE IF EXISTS public.financial_goals;
  END IF;
  
  -- Create the financial_goals table with correct structure
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
  
  -- Enable RLS for financial_goals
  ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;
  
  -- Add RLS policies for financial_goals
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
  CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.financial_goals
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
END;
$$;

-- 2. Fix budgets table issues with categories JSONB field
DO $$
BEGIN
  -- Check if the budgets table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'budgets') THEN
    -- Check if categories column exists and is not JSONB
    IF EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'budgets' 
      AND column_name = 'categories' 
      AND data_type != 'jsonb'
    ) THEN
      -- Drop the validate_budget_categories trigger if it exists
      DROP TRIGGER IF EXISTS validate_budget_categories_trigger ON public.budgets;
      
      -- Alter the categories column to be JSONB
      ALTER TABLE public.budgets ALTER COLUMN categories TYPE JSONB USING categories::jsonb;
    END IF;
    
    -- Ensure the categories column exists and is JSONB
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'budgets' 
      AND column_name = 'categories'
    ) THEN
      -- Add the categories column as JSONB
      ALTER TABLE public.budgets ADD COLUMN categories JSONB;
    END IF;
    
    -- Ensure the month and year columns exist
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'budgets' 
      AND column_name = 'month'
    ) THEN
      ALTER TABLE public.budgets ADD COLUMN month VARCHAR(2) NOT NULL DEFAULT '01';
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'budgets' 
      AND column_name = 'year'
    ) THEN
      ALTER TABLE public.budgets ADD COLUMN year VARCHAR(4) NOT NULL DEFAULT '2024';
    END IF;
    
    -- Create or replace the validation function for budget categories
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
    DROP TRIGGER IF EXISTS validate_budget_categories_trigger ON public.budgets;
    CREATE TRIGGER validate_budget_categories_trigger
      BEFORE INSERT OR UPDATE ON public.budgets
      FOR EACH ROW
      WHEN (NEW.categories IS NOT NULL)
      EXECUTE FUNCTION validate_budget_categories();
  END IF;
END;
$$;

-- 3. Ensure the set_updated_at function exists
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Ensure the updated_at trigger exists for budgets
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'budgets') THEN
    -- Check if the trigger exists
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.triggers 
      WHERE trigger_name = 'set_updated_at' 
      AND event_object_table = 'budgets'
    ) THEN
      -- Create the trigger
      CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON public.budgets
        FOR EACH ROW
        EXECUTE FUNCTION public.set_updated_at();
    END IF;
  END IF;
END;
$$;

-- 5. Fix any foreign key references in the budgets table
DO $$
BEGIN
  -- Check if the category_id column exists in budgets table
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'budgets' 
    AND column_name = 'category_id'
  ) THEN
    -- Check if the foreign key constraint exists
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu 
      ON tc.constraint_name = ccu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_name = 'budgets' 
      AND ccu.column_name = 'category_id'
    ) THEN
      -- Add the foreign key constraint
      ALTER TABLE public.budgets 
      ADD CONSTRAINT budgets_category_id_fkey 
      FOREIGN KEY (category_id) REFERENCES public.categories(category_id);
    END IF;
  END IF;
END;
$$;