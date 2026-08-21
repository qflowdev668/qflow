# QFlow

Skip the line. Not the service.

QFlow is a Next.js queue app for clinics, banks, and government desks. People join a line from their phone; staff call the next person; admins manage locations and staff.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript + Tailwind
- **Supabase** — Auth, Postgres, RLS, Realtime
- **Resend** — admin/staff login codes and password-reset emails

## Roles

| Role | How they sign in |
|------|------------------|
| **User** | Email + password, Google, or email OTP |
| **Staff** | Email + password, then Resend OTP (admin-created accounts only) |
| **Admin** | Cellphone number → OTP emailed via Resend (`ADMIN_OTP_*` in env) |

Public sign-up is always a normal user. Staff and admin roles cannot be set from the client.

## Features

- Join / leave queues with emergency and fast-track priority
- Live staff dashboard (call next, walk-ins, break, complete / no-show)
- **Serving lock** — calling next sets `serving` status (atomic `FOR UPDATE SKIP LOCKED`); another staff member cannot claim the same person or start a second serve at that location
- Walk-ins stored in `queue_entries` with the rest of the line
- **DB unique index** `queue_entries_active_unique` — one active row (`waiting` / `almost` / `your-turn` / `serving`) per registered user per location
- In-app notifications (joined, almost next, your turn, served, no-show)
- Visit ratings after service
- Admin: locations, staff accounts, audit log
- Languages: English, Afrikaans, Zulu, Sesotho, Xhosa, Setswana
- Accessibility settings, session expiry banners, offline / outage banners
- **PWA** — installable app, service worker, Web Push for queue turn alerts

## Setup

### 1. Install

```bash
npm install
cp .env.local.example .env.local
```

### 2. Environment (`.env.local`)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only — staff create, account delete, admin OTP |
| `RESEND_API_KEY` | Send login / reset codes |
| `RESEND_FROM_EMAIL` | e.g. `QFlow <onboarding@resend.dev>` |
| `ADMIN_OTP_PHONE` | Authorized admin cellphone (normalized SA format) |
| `ADMIN_OTP_EMAIL` | Inbox that receives the admin OTP |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push public key (browser subscribe) |
| `VAPID_PRIVATE_KEY` | Web Push private key (server only) |
| `VAPID_SUBJECT` | `mailto:` contact for VAPID |
| `PUSH_DISPATCH_SECRET` | Bearer token for `/api/push/dispatch` (DB webhook) |

With Resend’s free `onboarding@resend.dev` sender, mail only delivers to your Resend account email until you verify a domain.

### 3. Database

Apply migrations in the Supabase SQL Editor (in order), or link the CLI and push:

```bash
npm run db:link
npm run db:push
```

Migration files live in `supabase/migrations/`. Important later ones:

- `20260816180000_lock_profile_role.sql` — users cannot self-promote
- `20260816190000_lock_queue_and_audit.sql` — users may only cancel their own queue row; audit inserts are staff/admin only
- `20260816200000_walkins_notify_ratings.sql` — walk-ins, lifecycle notifications, `visit_ratings`
- `20260821000000_push_subscriptions.sql` — Web Push subscriptions + optional dispatch webhook
- `20260821120000_serving_enum.sql` + `20260821120100_serving_lock_and_unique.sql` — `serving` status, claim RPCs, unique active entry per user/location
- `20260821140000_password_reset_tokens.sql` — short-lived server tokens for password reset (`?rt=`)
- `20260821150000_client_errors.sql` — ErrorBoundary reports for admin monitoring

After the push migration, point Postgres at your deployed API (so every in-app notification can fan out to devices):

```sql
insert into public.app_settings (key, value) values
  ('push_dispatch_url', 'https://YOUR_DOMAIN/api/push/dispatch'),
  ('push_dispatch_secret', 'same-as-PUSH_DISPATCH_SECRET')
on conflict (key) do update set value = excluded.value;
```

Also set a matching **password policy** in Supabase Auth (Dashboard → Authentication). The app already requires 12+ characters with mixed case, digit, and symbol.

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful scripts:

```bash
npm run check:supabase   # quick API / table health check
npm run build
npm run lint
```

## Routes

| Path | Screen |
|------|--------|
| `/` | Splash (then last route or role home) |
| `/onboarding` | Onboarding |
| `/login`, `/register` | Auth |
| `/home`, `/map`, `/queue`, `/profile` | User app |
| `/location/[id]` | Location detail |
| `/notifications` | Notifications |
| `/staff`, `/staff/serving` | Staff |
| `/admin`, `/admin/locations/new`, `/admin/audit` | Admin |

`proxy.ts` refreshes the Supabase session and redirects by role. The last path is stored in `sessionStorage` (`qflow_last_route`) so refresh returns to the same screen after splash.

## Auth notes

- Restart `npm run dev` after changing `.env.local` (env is loaded at process start).
- Admin cannot use password / Google / user email OTP — cellphone gate only.
- Password reset uses a **server-side one-time token** (`password_reset_tokens`) passed as `?rt=` in the URL, so new tabs / refresh / multi-tab stay on the same step. Recovery email links land on `/forgot-password/reset?rt=…`.

## Project layout

```
app/                  # App Router pages + API routes
components/qflow/     # Screens, banners, staff/admin UI
lib/                  # App context, routes map, i18n, Supabase, password rules
proxy.ts              # Session refresh + role route guards
supabase/migrations/  # Schema and RLS changes
scripts/              # Supabase health checks
```

## Known gaps

- OTP send rate limits use an **in-memory** Map (`lib/rate-limit.ts`). Fine for a single Node process; on multi-instance serverless each instance has its own counters.
- Real SMS notifications are not implemented; in-app rows + Web Push cover the phone alert path.
- Web Push from DB triggers needs `app_settings.push_dispatch_url` set (and `pg_net` on the Supabase project). Staff actions also dispatch push from the app as a fallback.
