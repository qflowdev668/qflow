-- Serving lock + unique active entry (requires serving enum from prior migration).

alter table public.queue_entries
  add column if not exists serving_by uuid references public.profiles(id) on delete set null;

alter table public.queue_entries
  add column if not exists serving_started_at timestamptz;

drop index if exists public.queue_entries_active_unique;

create unique index queue_entries_active_unique
  on public.queue_entries (user_id, location_id)
  where user_id is not null
    and status in ('waiting', 'almost', 'your-turn', 'serving');

drop index if exists public.queue_entries_location_active_idx;

create index queue_entries_location_active_idx
  on public.queue_entries (location_id, position)
  where status in ('waiting', 'almost', 'your-turn');

create or replace function public.refresh_location_queue_count()
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

  update public.locations loc
     set queue_count = (
       select count(*)::int
         from public.queue_entries q
        where q.location_id = target
          and q.status in (
            'waiting'::public.queue_status,
            'almost'::public.queue_status,
            'your-turn'::public.queue_status
          )
     )
   where loc.id = target;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function public.claim_next_queue_entry(p_location_id uuid)
returns public.queue_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  role public.user_role;
  staff_loc uuid;
  claimed public.queue_entries;
begin
  role := public.current_user_role();
  staff_loc := public.current_user_location();

  if role is null or role not in ('staff'::public.user_role, 'admin'::public.user_role) then
    raise exception 'Only staff or admin can claim the queue'
      using errcode = '42501';
  end if;

  if role = 'staff'::public.user_role and staff_loc is distinct from p_location_id then
    raise exception 'Staff can only claim at their assigned location'
      using errcode = '42501';
  end if;

  if exists (
    select 1
      from public.queue_entries
     where location_id = p_location_id
       and status = 'serving'::public.queue_status
  ) then
    raise exception 'Someone is already being served at this location'
      using errcode = 'P0001';
  end if;

  update public.queue_entries q
     set status = 'serving'::public.queue_status,
         serving_by = auth.uid(),
         serving_started_at = now()
   where q.id = (
     select e.id
       from public.queue_entries e
      where e.location_id = p_location_id
        and e.status in (
          'waiting'::public.queue_status,
          'almost'::public.queue_status,
          'your-turn'::public.queue_status
        )
      order by e.position asc, e.joined_at asc
      for update skip locked
      limit 1
   )
   and q.status in (
     'waiting'::public.queue_status,
     'almost'::public.queue_status,
     'your-turn'::public.queue_status
   )
  returning * into claimed;

  return claimed;
end;
$$;

create or replace function public.claim_queue_entry(p_entry_id uuid)
returns public.queue_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  role public.user_role;
  staff_loc uuid;
  claimed public.queue_entries;
  entry_loc uuid;
begin
  role := public.current_user_role();
  staff_loc := public.current_user_location();

  if role is null or role not in ('staff'::public.user_role, 'admin'::public.user_role) then
    raise exception 'Only staff or admin can claim a queue entry'
      using errcode = '42501';
  end if;

  select location_id into entry_loc
    from public.queue_entries
   where id = p_entry_id;

  if entry_loc is null then
    return null;
  end if;

  if role = 'staff'::public.user_role and staff_loc is distinct from entry_loc then
    raise exception 'Staff can only claim at their assigned location'
      using errcode = '42501';
  end if;

  if exists (
    select 1
      from public.queue_entries
     where location_id = entry_loc
       and status = 'serving'::public.queue_status
       and id is distinct from p_entry_id
  ) then
    raise exception 'Someone is already being served at this location'
      using errcode = 'P0001';
  end if;

  update public.queue_entries q
     set status = 'serving'::public.queue_status,
         serving_by = auth.uid(),
         serving_started_at = now()
   where q.id = p_entry_id
     and q.status in (
       'waiting'::public.queue_status,
       'almost'::public.queue_status,
       'your-turn'::public.queue_status
     )
  returning * into claimed;

  return claimed;
end;
$$;

revoke all on function public.claim_next_queue_entry(uuid) from public;
revoke all on function public.claim_queue_entry(uuid) from public;
grant execute on function public.claim_next_queue_entry(uuid) to authenticated;
grant execute on function public.claim_queue_entry(uuid) to authenticated;

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

  if tg_op = 'INSERT' and new.status in ('waiting', 'almost', 'your-turn', 'serving') then
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
    elsif new.status in ('your-turn', 'serving') and old.status is distinct from 'your-turn' and old.status is distinct from 'serving' then
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

  if old.status = 'serving'::public.queue_status then
    raise exception 'You cannot leave the line while being served'
      using errcode = '42501';
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

create or replace function public.resequence_queue_positions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status in ('waiting', 'almost', 'your-turn')
     and new.status not in ('waiting', 'almost', 'your-turn') then
    update public.queue_entries
       set position = position - 1
     where location_id = old.location_id
       and status in ('waiting', 'almost', 'your-turn')
       and position > old.position;
  end if;
  return new;
end;
$$;
