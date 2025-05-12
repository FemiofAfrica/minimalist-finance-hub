-- Create default categories including Transfer category

-- Function to ensure users have default categories
CREATE OR REPLACE FUNCTION ensure_default_categories() 
RETURNS TRIGGER AS $$
DECLARE
  default_categories TEXT[] := ARRAY['Food & Dining', 'Transportation', 'Entertainment', 'Utilities', 'Housing', 'Health', 'Shopping', 'Education', 'Income', 'Salary', 'Transfer'];
  default_types TEXT[] := ARRAY['expense', 'expense', 'expense', 'expense', 'expense', 'expense', 'expense', 'expense', 'income', 'income', 'transfer'];
  default_colors TEXT[] := ARRAY['#FF5733', '#33FF57', '#3357FF', '#F3FF33', '#FF33F3', '#33FFF3', '#FF8033', '#8033FF', '#33FF80', '#33FF80', '#A9A9A9'];
  default_icons TEXT[] := ARRAY['🍔', '🚗', '🎬', '💡', '🏠', '🏥', '🛍️', '🎓', '💰', '💵', '↔️'];
  i INTEGER;
BEGIN
  -- Loop through default categories
  FOR i IN 1..array_length(default_categories, 1) LOOP
    -- Insert default category if it doesn't exist for this user
    INSERT INTO categories (
      user_id, 
      name, 
      type,
      color,
      icon,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id, 
      default_categories[i], 
      default_types[i],
      default_colors[i],
      default_icons[i],
      NOW(),
      NOW()
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to add default categories when a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION ensure_default_categories();

-- Run for existing users
DO $$
DECLARE
  user_rec RECORD;
BEGIN
  FOR user_rec IN SELECT id FROM auth.users
  LOOP
    -- Add Transfer category for existing users if it doesn't exist
    INSERT INTO categories (
      user_id, 
      name, 
      type,
      color,
      icon,
      created_at,
      updated_at
    )
    VALUES (
      user_rec.id,
      'Transfer',
      'transfer',
      '#A9A9A9',
      '↔️',
      NOW(),
      NOW()
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql; 