-- Queue priority: emergency and fast-track entries are served before standard ones.
-- Safe to run on an existing database.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'queue_priority') then
    create type queue_priority as enum ('emergency', 'fast-track', 'standard');
  end if;
end
$$;

alter table public.queue_entries
  add column if not exists priority queue_priority not null default 'standard',
  add column if not exists priority_category text;

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

-- Slot priority entries in ahead of everyone with a lower priority who is still waiting
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

drop trigger if exists queue_entries_reprioritise on public.queue_entries;

create trigger queue_entries_reprioritise
  before update of priority on public.queue_entries
  for each row execute function public.reposition_on_priority_change();
