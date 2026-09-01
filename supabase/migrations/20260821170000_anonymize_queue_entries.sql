-- Allow anonymized queue_entries (user_id null, is_walk_in false) so account
-- deletion can keep historical tickets for location stats.

alter table public.queue_entries
  drop constraint if exists queue_entries_party_check;

alter table public.queue_entries
  add constraint queue_entries_party_check
  check (
    (
      is_walk_in = true
      and walk_in_name is not null
      and length(btrim(walk_in_name)) > 0
    )
    or (
      is_walk_in = false
    )
  );

comment on constraint queue_entries_party_check on public.queue_entries is
  'Walk-ins need a name; registered tickets may keep or clear user_id (anonymized after account deletion).';
