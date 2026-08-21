-- Short-lived password-reset flow tokens (service-role only; no client RLS).

create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  stage text not null default 'otp_sent'
    check (stage in ('otp_sent', 'verified')),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists password_reset_tokens_email_idx
  on public.password_reset_tokens (email, created_at desc);

create index if not exists password_reset_tokens_expires_idx
  on public.password_reset_tokens (expires_at);

alter table public.password_reset_tokens enable row level security;

-- No policies for authenticated/anon — only service role (bypasses RLS) may access.
