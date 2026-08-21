-- Users may only cancel their own queue row (not rewrite status/priority/position).
-- Audit log inserts are limited to staff and admin (service role still bypasses RLS).

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

drop trigger if exists queue_entries_prevent_self_rewrite on public.queue_entries;

create trigger queue_entries_prevent_self_rewrite
  before update on public.queue_entries
  for each row
  execute function public.prevent_queue_self_rewrite();

drop policy if exists "Users can leave their queue" on public.queue_entries;

create policy "Users can leave their queue"
  on public.queue_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and status = 'cancelled');

drop policy if exists "Authenticated users can append to audit log" on public.audit_log;

create policy "Staff and admins can append to audit log"
  on public.audit_log for insert
  with check (public.current_user_role() in ('staff', 'admin'));
