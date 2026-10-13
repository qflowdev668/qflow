-- Ask QFlow usage log. Service role inserts (RLS bypass). Users may only read their own rows.

create table if not exists public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  reply text not null,
  created_at timestamptz not null default now()
);

create index if not exists assistant_messages_user_idx
  on public.assistant_messages (user_id, created_at desc);

alter table public.assistant_messages enable row level security;

drop policy if exists "Users read own assistant messages" on public.assistant_messages;
create policy "Users read own assistant messages"
  on public.assistant_messages
  for select
  using (auth.uid() = user_id);

grant select on public.assistant_messages to authenticated;
