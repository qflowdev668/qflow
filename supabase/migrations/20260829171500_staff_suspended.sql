-- Temporary staff suspension (admin can reactivate without recreating the account).
alter table public.profiles
  add column if not exists staff_suspended_at timestamptz;

comment on column public.profiles.staff_suspended_at is
  'When set, staff cannot sign in until an admin clears this timestamp.';
