-- Create a function to update user profile
create or replace function update_user_profile(
  user_id uuid,
  first_name_param text,
  last_name_param text
) returns void as $$
begin
  update profiles
  set 
    first_name = first_name_param,
    last_name = last_name_param,
    updated_at = now()
  where id = user_id;

  if not found then
    raise exception 'Profile not found';
  end if;
end;
$$ language plpgsql security definer; 