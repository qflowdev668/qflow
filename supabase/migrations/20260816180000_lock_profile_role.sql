-- Stop signed-in users from promoting themselves to staff/admin
-- by updating public.profiles.role (or stealing a location_id).
-- Service role (admin staff API) can still change those columns.

create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is not distinct from old.role
     and new.location_id is not distinct from old.location_id then
    return new;
  end if;

  -- Dashboard / API service role may assign staff and promote admins.
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  -- Signed-in admins may change other people's role/location (RLS still applies).
  if exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'::public.user_role
  ) then
    return new;
  end if;

  raise exception 'You cannot change account role or assigned location'
    using errcode = '42501';
end;
$$;

drop trigger if exists profiles_prevent_privilege_escalation on public.profiles;

create trigger profiles_prevent_privilege_escalation
  before update on public.profiles
  for each row
  execute function public.prevent_profile_privilege_escalation();

drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Column privileges: authenticated users may only patch safe fields.
revoke update on table public.profiles from anon, authenticated;
grant update (name, avatar_url, language) on table public.profiles to authenticated;
