-- QFlow PWA / Web Push — run once in Supabase SQL Editor
-- Project: wotmaediyoapavlnhtmt

\i is not available in the dashboard; paste the migration + settings below.

-- ========== from 20260821000000_push_subscriptions.sql ==========

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (endpoint)
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Users manage own push subscriptions" on public.push_subscriptions;
create policy "Users manage own push subscriptions"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.push_subscriptions to authenticated;

create table if not exists public.app_settings (
  key text primary key,
  value text not null default ''
);

alter table public.app_settings enable row level security;

drop policy if exists "Admins read app settings" on public.app_settings;
create policy "Admins read app settings"
  on public.app_settings for select
  using (public.current_user_role() = 'admin');

grant select on public.app_settings to authenticated;

create or replace function public.dispatch_web_push_for_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  endpoint text;
  secret text;
begin
  select value into endpoint from public.app_settings where key = 'push_dispatch_url';
  select value into secret from public.app_settings where key = 'push_dispatch_secret';

  if endpoint is null or length(btrim(endpoint)) = 0 then
    return new;
  end if;

  begin
    perform net.http_post(
      url := btrim(endpoint),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(secret, '')
      ),
      body := jsonb_build_object(
        'userId', new.user_id,
        'title', 'QFlow',
        'body', new.message,
        'url', '/notifications'
      )
    );
  exception when others then
    null;
  end;

  return new;
end;
$$;

drop trigger if exists notifications_dispatch_web_push on public.notifications;
create trigger notifications_dispatch_web_push
  after insert on public.notifications
  for each row
  execute function public.dispatch_web_push_for_notification();

-- ========== webhook config (set NEXT_PUBLIC_APP_URL before running; production: https://useqflow.app) ==========

insert into public.app_settings (key, value) values
  ('push_dispatch_url', 'https://useqflow.app/api/push/dispatch'),
  ('push_dispatch_secret', 'qflow-push-dispatch-change-me')
on conflict (key) do update set value = excluded.value;
