-- QFlow Supabase Schema
-- Run this in Supabase Dashboard → SQL Editor (safe to run on a fresh project)

-- Enums
create type user_role as enum ('user', 'staff', 'admin');
create type location_type as enum ('clinic', 'bank', 'government', 'other');
create type queue_status as enum ('waiting', 'almost', 'your-turn', 'served', 'cancelled', 'no-show');
create type queue_priority as enum ('emergency', 'fast-track', 'standard');
create type notification_icon as enum ('queue', 'turn', 'feedback', 'info');

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  email text not null,
  role user_role not null default 'user',
  location_id uuid,
  avatar_url text,
  language text not null default 'en',
  cell_number text,
  sms_notifications boolean not null default false,
  staff_suspended_at timestamptz,
  created_at timestamptz not null default now()
);

-- Locations
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type location_type not null default 'other',
  address text not null,
  lat double precision not null,
  lng double precision not null,
  capacity integer not null default 50,
  is_open boolean not null default true,
  description text,
  -- Admin-written list of what to bring. Shown to customers as written, not translated.
  required_documents text,
  constraint locations_required_documents_len check (
    required_documents is null or char_length(required_documents) <= 1000
  ),
  -- Denormalised so anyone can see how busy a location is without being able to
  -- read other people's queue_entries rows (which RLS hides).
  queue_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_location_id_fkey
  foreign key (location_id) references public.locations(id) on delete set null;

-- Queue entries
create table public.queue_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  position integer not null,
  status queue_status not null default 'waiting',
  priority queue_priority not null default 'standard',
  priority_category text,
  is_walk_in boolean not null default false,
  walk_in_name text,
  walk_in_notes text,
  joined_at timestamptz not null default now(),
  served_at timestamptz,
  constraint queue_entries_party_check check (
    (is_walk_in = false and user_id is not null)
    or (
      is_walk_in = true
      and walk_in_name is not null
      and length(btrim(walk_in_name)) > 0
    )
  )
);

-- Only one active queue entry per user per location
create unique index queue_entries_active_unique
  on public.queue_entries (user_id, location_id)
  where status in ('waiting', 'almost', 'your-turn');

create index queue_entries_location_active_idx
  on public.queue_entries (location_id, position)
  where status in ('waiting', 'almost', 'your-turn');

-- Notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  icon notification_icon not null default 'info',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- Visit ratings after a served queue entry
create table public.visit_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  queue_entry_id uuid references public.queue_entries(id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (queue_entry_id)
);

create index visit_ratings_user_idx on public.visit_ratings (user_id, created_at desc);

-- Queue history (kept separate so completed visits survive queue cleanup)
create table public.queue_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  location_name text not null,
  status queue_status not null,
  created_at timestamptz not null default now()
);

create index queue_history_user_idx on public.queue_history (user_id, created_at desc);

-- Audit log (admin screen)
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text,
  action text not null,
  detail text,
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Lower rank is served first
create or replace function public.priority_rank(p public.queue_priority)
returns integer
language sql
immutable
as $$
  select case p
    when 'emergency' then 1
    when 'fast-track' then 2
    else 3
  end;
$$;

-- Assign the next queue position automatically, slotting priority entries in
-- ahead of everyone with a lower priority who is still waiting.
create or replace function public.assign_queue_position()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  target_position integer;
begin
  if new.position is null or new.position <= 0 then
    select coalesce(max(position), 0) + 1
      into target_position
      from public.queue_entries
     where location_id = new.location_id
       and status in ('waiting', 'almost', 'your-turn')
       and public.priority_rank(priority) <= public.priority_rank(new.priority);

    update public.queue_entries
       set position = position + 1
     where location_id = new.location_id
       and status in ('waiting', 'almost', 'your-turn')
       and position >= target_position;

    new.position := target_position;
  end if;
  return new;
end;
$$;

create trigger queue_entries_assign_position
  before insert on public.queue_entries
  for each row execute function public.assign_queue_position();

-- Close the gap when someone is served, skipped, or leaves
create or replace function public.resequence_queue()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if old.status in ('waiting', 'almost', 'your-turn')
     and new.status not in ('waiting', 'almost', 'your-turn') then
    update public.queue_entries
       set position = position - 1
     where location_id = new.location_id
       and status in ('waiting', 'almost', 'your-turn')
       and position > old.position;
  end if;
  return new;
end;
$$;

create trigger queue_entries_resequence
  after update of status on public.queue_entries
  for each row execute function public.resequence_queue();

-- Staff can demote an unverified priority claim; re-slot the entry accordingly
create or replace function public.reposition_on_priority_change()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  target_position integer;
begin
  if new.priority is distinct from old.priority
     and new.status in ('waiting', 'almost', 'your-turn') then
    -- Close the gap the entry leaves behind before re-inserting it
    update public.queue_entries
       set position = position - 1
     where location_id = new.location_id
       and id <> new.id
       and status in ('waiting', 'almost', 'your-turn')
       and position > old.position;

    select coalesce(max(position), 0) + 1
      into target_position
      from public.queue_entries
     where location_id = new.location_id
       and id <> new.id
       and status in ('waiting', 'almost', 'your-turn')
       and public.priority_rank(priority) <= public.priority_rank(new.priority);

    update public.queue_entries
       set position = position + 1
     where location_id = new.location_id
       and id <> new.id
       and status in ('waiting', 'almost', 'your-turn')
       and position >= target_position;

    new.position := target_position;
  end if;
  return new;
end;
$$;

create trigger queue_entries_reprioritise
  before update of priority on public.queue_entries
  for each row execute function public.reposition_on_priority_change();

create or replace function public.prevent_queue_self_rewrite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if public.current_user_role() in ('staff'::public.user_role, 'admin'::public.user_role) then
    return new;
  end if;

  if new.status is distinct from 'cancelled'::public.queue_status then
    raise exception 'You can only leave the line'
      using errcode = '42501';
  end if;

  if new.user_id is distinct from old.user_id
     or new.location_id is distinct from old.location_id
     or new.priority is distinct from old.priority
     or new.position is distinct from old.position then
    raise exception 'You cannot change this queue entry'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger queue_entries_prevent_self_rewrite
  before update on public.queue_entries
  for each row execute function public.prevent_queue_self_rewrite();

create or replace function public.notify_queue_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  loc_name text;
  hist_status public.queue_status;
begin
  if new.user_id is null then
    return coalesce(new, old);
  end if;

  select name into loc_name
    from public.locations
   where id = coalesce(new.location_id, old.location_id);

  if tg_op = 'INSERT' and new.status in ('waiting', 'almost', 'your-turn') then
    begin
      insert into public.notifications (user_id, message, icon)
      values (
        new.user_id,
        'You joined the line at ' || coalesce(loc_name, 'a location') || '.',
        'queue'::public.notification_icon
      );
    exception when others then
      null;
    end;
    return new;
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'almost' then
      if old.status = 'waiting' and new.joined_at > now() - interval '5 seconds' then
        null;
      else
        begin
          insert into public.notifications (user_id, message, icon)
          values (
            new.user_id,
            'You are almost next at ' || coalesce(loc_name, 'the location') || '.',
            'queue'::public.notification_icon
          );
        exception when others then
          null;
        end;
      end if;
    elsif new.status = 'your-turn' then
      begin
        insert into public.notifications (user_id, message, icon)
        values (
          new.user_id,
          'It is your turn at ' || coalesce(loc_name, 'the location') || '.',
          'turn'::public.notification_icon
        );
      exception when others then
        null;
      end;
    elsif new.status in ('served', 'no-show', 'cancelled') then
      hist_status := new.status;
      begin
        insert into public.queue_history (user_id, location_id, location_name, status)
        values (
          new.user_id,
          new.location_id,
          coalesce(loc_name, 'Location'),
          hist_status
        );
      exception when others then
        null;
      end;

      if new.status = 'served' then
        begin
          insert into public.notifications (user_id, message, icon)
          values (
            new.user_id,
            'How was your visit at ' || coalesce(loc_name, 'the location') || '? Tap to rate.',
            'feedback'::public.notification_icon
          );
        exception when others then
          null;
        end;
      elsif new.status = 'no-show' then
        begin
          insert into public.notifications (user_id, message, icon)
          values (
            new.user_id,
            'You were marked as a no-show at ' || coalesce(loc_name, 'the location') || '.',
            'info'::public.notification_icon
          );
        exception when others then
          null;
        end;
      end if;
    end if;
  end if;

  return new;
end;
$$;

create trigger queue_entries_notify_lifecycle
  after insert or update of status on public.queue_entries
  for each row execute function public.notify_queue_lifecycle();

create or replace function public.refresh_almost_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  if tg_op = 'DELETE' then
    target := old.location_id;
  else
    target := new.location_id;
  end if;

  update public.queue_entries
     set status = 'almost'::public.queue_status
   where location_id = target
     and status = 'waiting'::public.queue_status
     and position <= 2;

  update public.queue_entries
     set status = 'waiting'::public.queue_status
   where location_id = target
     and status = 'almost'::public.queue_status
     and position > 2;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger queue_entries_refresh_almost
  after insert or update of position, status or delete on public.queue_entries
  for each row execute function public.refresh_almost_status();

-- Keep locations.queue_count in sync with the number of active entries
create or replace function public.refresh_location_queue_count()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  target uuid;
begin
  -- NEW is unassigned on DELETE, so it can't be referenced there at all
  if tg_op = 'DELETE' then
    target := old.location_id;
  else
    target := new.location_id;
  end if;

  update public.locations l
     set queue_count = (
       select count(*)
         from public.queue_entries q
        where q.location_id = target
          and q.status in ('waiting', 'almost', 'your-turn')
     )
   where l.id = target;
  return null;
end;
$$;

create trigger queue_entries_refresh_count
  after insert or update or delete on public.queue_entries
  for each row execute function public.refresh_location_queue_count();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.locations enable row level security;
alter table public.queue_entries enable row level security;
alter table public.notifications enable row level security;
alter table public.queue_history enable row level security;
alter table public.visit_ratings enable row level security;
alter table public.audit_log enable row level security;

-- Role lookup helper. SECURITY DEFINER avoids the infinite recursion you get
-- when a profiles policy queries profiles.
create or replace function public.current_user_role()
returns public.user_role
language sql
security definer set search_path = ''
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_user_location()
returns uuid
language sql
security definer set search_path = ''
stable
as $$
  select location_id from public.profiles where id = auth.uid();
$$;

-- Profiles
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Staff and admins can view all profiles"
  on public.profiles for select
  using (public.current_user_role() in ('staff', 'admin'));

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Admins can update any profile"
  on public.profiles for update
  using (public.current_user_role() = 'admin');

-- Block self-promotion even if a client sends role/location_id
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

  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

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

revoke update on table public.profiles from anon, authenticated;
grant update (name, avatar_url, language, cell_number, sms_notifications) on table public.profiles to authenticated;

-- Locations
create policy "Anyone can view locations"
  on public.locations for select
  using (true);

create policy "Admins can insert locations"
  on public.locations for insert
  with check (public.current_user_role() = 'admin');

create policy "Admins can update locations"
  on public.locations for update
  using (public.current_user_role() = 'admin');

create policy "Admins can delete locations"
  on public.locations for delete
  using (public.current_user_role() = 'admin');

create or replace function public.guard_location_required_documents()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.required_documents is not distinct from old.required_documents then
    return new;
  end if;
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;
  if public.current_user_role() = 'admin' then
    return new;
  end if;
  raise exception 'Only an admin can change documents required'
    using errcode = '42501';
end;
$$;

drop trigger if exists locations_guard_required_documents on public.locations;

create trigger locations_guard_required_documents
  before insert or update on public.locations
  for each row
  execute function public.guard_location_required_documents();

-- Queue entries
create policy "Users can view own queue entries"
  on public.queue_entries for select
  using (auth.uid() = user_id);

create policy "Staff can view entries at their location"
  on public.queue_entries for select
  using (
    public.current_user_role() = 'staff'
    and public.current_user_location() = location_id
  );

create policy "Admins can view all queue entries"
  on public.queue_entries for select
  using (public.current_user_role() = 'admin');

create policy "Users can join queues"
  on public.queue_entries for insert
  with check (auth.uid() = user_id);

create policy "Staff can add walk-ins at their location"
  on public.queue_entries for insert
  with check (
    is_walk_in = true
    and (
      public.current_user_role() = 'admin'
      or (
        public.current_user_role() = 'staff'
        and public.current_user_location() = location_id
      )
    )
  );

create policy "Users can leave their queue"
  on public.queue_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and status = 'cancelled');

create policy "Staff can update entries at their location"
  on public.queue_entries for update
  using (
    public.current_user_role() = 'admin'
    or (
      public.current_user_role() = 'staff'
      and public.current_user_location() = location_id
    )
  );

-- Notifications
create policy "Users can view own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

create policy "Users can insert own notifications"
  on public.notifications for insert
  with check (auth.uid() = user_id);

create policy "Users can view own ratings"
  on public.visit_ratings for select
  using (auth.uid() = user_id);

create policy "Users can insert own ratings"
  on public.visit_ratings for insert
  with check (auth.uid() = user_id);

create policy "Staff and admins can view ratings"
  on public.visit_ratings for select
  using (public.current_user_role() in ('staff', 'admin'));

grant select, insert on public.visit_ratings to authenticated;

-- Queue history
create policy "Users can view own history"
  on public.queue_history for select
  using (auth.uid() = user_id);

create policy "Users can insert own history"
  on public.queue_history for insert
  with check (auth.uid() = user_id);

-- POPIA: users can erase their own visit history from the profile screen
create policy "Users can delete own history"
  on public.queue_history for delete
  using (auth.uid() = user_id);

create policy "Admins can view all history"
  on public.queue_history for select
  using (public.current_user_role() = 'admin');

-- Audit log
create policy "Admins can view audit log"
  on public.audit_log for select
  using (public.current_user_role() = 'admin');

create policy "Staff and admins can append to audit log"
  on public.audit_log for insert
  with check (public.current_user_role() in ('staff', 'admin'));

-- Admin accounts (cellphone OTP). Service role only; env ADMIN_OTP_* is bootstrap.
create table if not exists public.admin_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cell_number text not null unique,
  email text not null unique,
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.admin_accounts enable row level security;
revoke all on table public.admin_accounts from anon, authenticated;
grant all on table public.admin_accounts to service_role;

-- Realtime: push queue and notification changes to connected clients
alter publication supabase_realtime add table public.queue_entries;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.locations;

-- Seed locations
insert into public.locations (name, type, address, lat, lng, capacity, is_open, description) values
  ('Hillbrow Clinic', 'clinic', '123 Pretoria St, Hillbrow, Johannesburg', -26.1868, 28.0459, 50, true, 'Public health clinic offering general healthcare services.'),
  ('ABSA Bank Sandton', 'bank', '15 Alice Lane, Sandton, Johannesburg', -26.1076, 28.0567, 30, true, 'Full-service bank branch with personal and business banking.'),
  ('Home Affairs Johannesburg', 'government', '77 Harrison St, Johannesburg CBD', -26.2041, 28.0473, 100, true, 'Government department for IDs, passports, and civic services.'),
  ('Netcare Clinic Rosebank', 'clinic', '14 Sturdee Ave, Rosebank', -26.1456, 28.0436, 25, true, 'Private medical clinic with emergency services.'),
  ('FNB Bank Melrose Arch', 'bank', 'Melrose Boulevard, Melrose Arch', -26.1342, 28.0689, 20, false, 'Modern banking facility with digital services.'),
  ('SARS Randburg', 'government', '45 Republic Rd, Randburg', -26.0936, 27.9894, 60, true, 'Tax services and revenue collection office.');
