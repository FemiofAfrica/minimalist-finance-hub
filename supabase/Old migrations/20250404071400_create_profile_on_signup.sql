-- Function to be triggered upon new user creation in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Allows the function to run with the permissions of the definer, necessary to read from auth.users
SET search_path = public -- Ensures 'profiles' table is found in the correct schema
AS $$
BEGIN
  -- Insert a corresponding row into public.profiles
  -- Uses the id and email from the NEW record in auth.users
  -- Also copy first_name and last_name from user_metadata if available
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id, 
    NEW.email,
    (NEW.raw_user_meta_data->>'first_name'),
    (NEW.raw_user_meta_data->>'last_name')
  );

  -- Note: If you collect first/last name during signup and store it in
  -- user_metadata, you could potentially populate those fields here too.
  -- See commented example within the code block for details.

  RETURN NEW; -- Result is ignored for AFTER triggers, but is standard practice
END;
$$;

-- Drop the trigger if it already exists (for idempotency)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger to call the function after a user is inserted into auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users -- Trigger fires after the insert operation completes
  FOR EACH ROW -- Trigger fires once for every row inserted
  EXECUTE FUNCTION public.handle_new_user(); -- The function to execute