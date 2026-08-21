-- Admin can manage staff profiles (role + location assignment).
-- Public sign-up always creates role = 'user' (staff are added by admins only).

create policy "Admins can update any profile"
  on public.profiles for update
  using (public.current_user_role() = 'admin');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  -- Role is never taken from client metadata. Staff/admin are provisioned by admins.
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    ),
    new.email,
    'user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
