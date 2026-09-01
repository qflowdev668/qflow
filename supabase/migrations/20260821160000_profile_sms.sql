-- SMS notification preferences on profiles

alter table public.profiles
  add column if not exists cell_number text;

alter table public.profiles
  add column if not exists sms_notifications boolean not null default false;

comment on column public.profiles.cell_number is 'E.164 or local SA mobile; normalized to +27 by the app';
comment on column public.profiles.sms_notifications is 'User opted in to Africa''s Talking SMS queue alerts';

-- Column-level UPDATE was locked to name/avatar/language; allow SMS prefs too.
grant update (name, avatar_url, language, cell_number, sms_notifications)
  on table public.profiles to authenticated;
