-- Client-side error reports from the React ErrorBoundary (service-role inserts via API).

create table if not exists public.client_errors (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  name text,
  stack text,
  component_stack text,
  path text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists client_errors_created_idx
  on public.client_errors (created_at desc);

alter table public.client_errors enable row level security;

-- Admins can review reports in the dashboard / SQL editor.
drop policy if exists "Admins can view client errors" on public.client_errors;
create policy "Admins can view client errors"
  on public.client_errors for select
  using (public.current_user_role() = 'admin');

grant select on public.client_errors to authenticated;
