-- Add necessary columns to budgets table
ALTER TABLE public.budgets
ADD COLUMN IF NOT EXISTS total_income DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_budget DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS categories JSONB;

-- Add validation check for total_budget
ALTER TABLE public.budgets
ADD CONSTRAINT budget_total_check CHECK (total_budget >= 0);

-- Add validation check for total_income
ALTER TABLE public.budgets
ADD CONSTRAINT income_total_check CHECK (total_income >= 0);

-- Add validation check for categories JSONB structure
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