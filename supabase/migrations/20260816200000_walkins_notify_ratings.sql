-- Walk-ins share queue_entries. App users get notifications + history from
-- queue status changes. Visit ratings persist after service.

alter table public.queue_entries
  alter column user_id drop not null;

alter table public.queue_entries
  add column if not exists is_walk_in boolean not null default false;

alter table public.queue_entries
  add column if not exists walk_in_name text;

alter table public.queue_entries
  add column if not exists walk_in_notes text;

alter table public.queue_entries
  drop constraint if exists queue_entries_party_check;

alter table public.queue_entries
  add constraint queue_entries_party_check
  check (
    (
      is_walk_in = false
      and user_id is not null
    )
    or (
      is_walk_in = true
      and walk_in_name is not null
      and length(btrim(walk_in_name)) > 0
    )
  );

drop policy if exists "Staff can add walk-ins at their location" on public.queue_entries;

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

create table if not exists public.visit_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  queue_entry_id uuid references public.queue_entries(id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (queue_entry_id)
);

create index if not exists visit_ratings_user_idx
  on public.visit_ratings (user_id, created_at desc);

alter table public.visit_ratings enable row level security;

drop policy if exists "Users can view own ratings" on public.visit_ratings;
drop policy if exists "Users can insert own ratings" on public.visit_ratings;
drop policy if exists "Staff and admins can view ratings" on public.visit_ratings;

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

drop trigger if exists queue_entries_notify_lifecycle on public.queue_entries;

create trigger queue_entries_notify_lifecycle
  after insert or update of status on public.queue_entries
  for each row
  execute function public.notify_queue_lifecycle();

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

drop trigger if exists queue_entries_refresh_almost on public.queue_entries;

create trigger queue_entries_refresh_almost
  after insert or update of position, status or delete on public.queue_entries
  for each row
  execute function public.refresh_almost_status();
