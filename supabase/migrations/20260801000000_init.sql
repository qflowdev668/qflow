-- QFlow Supabase Schema
-- Run this in Supabase Dashboard → SQL Editor (safe to run on a fresh project)

-- Enums
create type user_role as enum ('user', 'staff', 'admin');
create type location_type as enum ('clinic', 'bank', 'government', 'other');
create type queue_status as enum ('waiting', 'almost', 'your-turn', 'served', 'cancelled', 'no-show');
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
  user_id uuid not null references public.profiles(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  position integer not null,
  status queue_status not null default 'waiting',
  joined_at timestamptz not null default now(),
  served_at timestamptz
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
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    ),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'user')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Assign the next queue position automatically
create or replace function public.assign_queue_position()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.position is null or new.position <= 0 then
    select coalesce(max(position), 0) + 1
      into new.position
      from public.queue_entries
     where location_id = new.location_id
       and status in ('waiting', 'almost', 'your-turn');
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

create policy "Users can leave their queue"
  on public.queue_entries for update
  using (auth.uid() = user_id);

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

-- Queue history
create policy "Users can view own history"
  on public.queue_history for select
  using (auth.uid() = user_id);

create policy "Users can insert own history"
  on public.queue_history for insert
  with check (auth.uid() = user_id);

create policy "Admins can view all history"
  on public.queue_history for select
  using (public.current_user_role() = 'admin');

-- Audit log
create policy "Admins can view audit log"
  on public.audit_log for select
  using (public.current_user_role() = 'admin');

create policy "Authenticated users can append to audit log"
  on public.audit_log for insert
  with check (auth.uid() is not null);

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
