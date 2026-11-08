-- Documents a customer should bring. Admins type this; it is shown as written.

alter table public.locations
  add column if not exists required_documents text;

alter table public.locations
  drop constraint if exists locations_required_documents_len;

alter table public.locations
  add constraint locations_required_documents_len
  check (required_documents is null or char_length(required_documents) <= 1000);

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
