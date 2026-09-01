-- Multiple admin accounts (cellphone OTP gate). Env ADMIN_OTP_* remains bootstrap.

create table if not exists public.admin_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cell_number text not null unique,
  email text not null unique,
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.admin_accounts is
  'Authorized admin cellphone/email pairs for OTP login. Bootstrap super-admin stays in ADMIN_OTP_PHONE / ADMIN_OTP_EMAIL env.';

comment on column public.admin_accounts.last_login_at is
  'Updated when admin OTP verify succeeds for this account.';

alter table public.admin_accounts enable row level security;

-- No policies for anon/authenticated: only service_role (bypasses RLS) can read/write.
revoke all on table public.admin_accounts from anon, authenticated;
grant all on table public.admin_accounts to service_role;
