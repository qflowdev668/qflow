-- Staff/admin accounts provisioned via the service role set app_metadata.profile_role.
-- Public sign-up cannot set app_metadata, so role stays 'user' for self-registration.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  provisioned_role public.user_role := 'user'::public.user_role;
begin
  if new.raw_app_meta_data->>'profile_role' in ('staff', 'admin') then
    provisioned_role := (new.raw_app_meta_data->>'profile_role')::public.user_role;
  end if;

  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    ),
    new.email,
    provisioned_role
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
