-- Per-user alert preference flags (client + push-dispatch filter).
alter table public.profiles
  add column if not exists notification_preferences jsonb
  not null
  default '{
    "notify5Away": true,
    "notify2Away": true,
    "notifyTurn": true,
    "notifyFaster": false,
    "notifyPaused": false
  }'::jsonb;

comment on column public.profiles.notification_preferences is
  'User alert checkboxes from /profile/notifications';
