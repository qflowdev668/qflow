# QFlow

**Skip the line. Not the service.**

[![Status](https://img.shields.io/badge/status-page-2563EB?style=flat&logo=statuspage&logoColor=white)](https://qflow.co.za/status)
[![Uptime](https://img.shields.io/uptimerobot/status/REPLACE_WITH_MONITOR_API_KEY?label=uptime)](https://qflow.co.za/status)

> After creating monitors in UptimeRobot, replace `REPLACE_WITH_MONITOR_API_KEY` with the **monitor-specific API key** (Dashboard → My Monitors → monitor → API / Integrations). Format looks like `m778918918-3e92c097147760ee39d02d36`.

QFlow is a Progressive Web App for South African clinics, banks, and government desks. Customers join a queue from their phone; staff call the next person at the counter; admins manage locations and staff accounts.

| | |
|---|---|
| **Repository** | [github.com/qflowdev668/qflow](https://github.com/qflowdev668/qflow) |
| **Live status** | [qflow.co.za/status](https://qflow.co.za/status) · [API](https://qflow.co.za/api/status) |
| **Counter display** | `/display/_/?id=<locationId>` (public kiosk / TV) |
| **Stack** | FastAPI · Next.js 16 — build tool only, static export, no SSR/API routes · React 19 · TypeScript · Tailwind · Supabase · Resend · Web Push · Upstash |
| **Package** | `qflow` (`package.json`) |
| **Production** | [https://useqflow.app](https://useqflow.app) (once deployed) |
| **Local** | `http://127.0.0.1:8000` |

### Architecture

| Layer | Role |
|-------|------|
| **FastAPI** (`backend/`) | Runtime on port **8000** — serves `/api/*` and the static UI from `out/` |
| **Next.js** | Build tool only — static export, no SSR/API routes (`output: "export"`) → `out/` |
| **Supabase** | Auth, Postgres, RLS, Realtime |
| **Browser** | React SPA; calls FastAPI via same-origin `/api/*` |

---

## Table of contents

1. [Roles](#roles)
2. [Features](#features)
3. [Quick start](#quick-start)
4. [Environment variables](#environment-variables)
5. [Database](#database)
6. [API reference](#api-reference)
7. [Auth & Session Handling](#auth--session-handling)
8. [App routes](#app-routes)
9. [Counter display](#counter-display)
10. [Health & Status Endpoints](#health--status-endpoints)
11. [Notifications](#notifications)
12. [PWA](#pwa)
13. [Testing](#testing)
14. [Scripts](#scripts)
15. [Project layout](#project-layout)
16. [Security & POPIA](#security--popia)
17. [Operations notes](#operations-notes)
18. [External uptime monitoring](#external-uptime-monitoring)

---

## Roles

| Role | How they sign in | Notes |
|------|------------------|--------|
| **User** | Email + password, Google, or email OTP | Public self-registration always creates `user` |
| **Staff** | Email + password, then Resend email OTP | Accounts created by admin only; login route is **hidden** from the public UI (see [Private staff/admin access](#private-staffadmin-access)) |
| **Admin** | Cellphone → OTP emailed via Resend | Bootstrap via `ADMIN_OTP_PHONE` / `ADMIN_OTP_EMAIL`; more admins in `admin_accounts` (`/admin/admins`); login route is **hidden** from the public UI |

Staff and admin roles cannot be self-assigned from the client (column grants + privilege trigger). Google sign-in is blocked for staff/admin. Customer-facing login does **not** show Staff or Admin buttons.

### Private staff/admin access

Staff and admin sign-in URLs are gated so customers never see them in normal use:

| Route | Unlock | Gate |
|-------|--------|------|
| `/login/admin` | Click the QFlow logo/brand on `/login` **7 times** (≤2s between clicks; no visible feedback). | `PrivateLoginGate` + `lib/private-access.ts` (sessionStorage) |
| `/login/staff` | **Long-press ~2.5s** on the logo/title (Pointer Events — mouse click-and-hold or touch) | Same |

Direct navigation to `/login/staff` or `/login/admin` redirects to `/login` until unlocked in that browser session. E2E: `e2e/buttons.spec.ts` (redirect-without-unlock **and** unlock-success).

**Fallbacks:** Staff who cannot long-press can use `/login?unlock=staff` once shared by an admin. For admin, `/login?unlock=admin` remains an **emergency / onboarding** fallback only — daily access should use the 7-click logo gesture, not the query link. Treat query unlock links like temporary keys; do not post them publicly.

Customers who need staff/admin help see a discreet line on Login and Help: “Staff or admin? Contact your manager for login access” (mailto `support@qflow.co.za`) — it does **not** reveal the phrase or gestures.

Internal runbook: [STAFF_ONBOARDING.md](./STAFF_ONBOARDING.md).

---

## Features

### Queues
- **Join bottom sheet** — tap a location on Home/Map; a drawer slides up with wait time, optional priority, and **Join the line** (2 taps for standard join; 3 with priority)
- Join / leave with **emergency** and **fast-track** priority
- One active entry per user per location (partial unique index)
- Atomic **serving** claim via Postgres RPCs (`claim_next_queue_entry` / `claim_queue_entry`, `FOR UPDATE SKIP LOCKED`) — one person served per location at a time
- Walk-ins stored in the same `queue_entries` table as app users
- Ticket numbers from `position` (zero-padded, e.g. `047`)

### Staff & admin
- Staff: call next, serve walk-in, break, complete service, mark no-show
- Admin: locations, staff accounts, **multi-admin accounts**, audit log
- Env bootstrap super-admin cannot be removed or deactivated from the console

### Customers
- **Customer UI** — high-contrast white surfaces, QFlow blue/amber tokens (`app/globals.css`), illustration-led layouts, SVG queue scenes (`components/qflow/illustrations/`)
- In-app notifications + optional **Web Push** (no SMS)
- Visit ratings after service — only if most recent entry is **`served` within 2 hours** and not already rated
- Help centre (FAQ, `support@qflow.co.za`, system status, clear local data, accessibility)
- **POPIA**: download my data + delete account (anonymises queue tickets for stats)
- Languages: English, Afrikaans, Zulu, Sesotho, Xhosa, Setswana
- Accessibility settings (including **Show big text** on My line), session expiry banner (FastAPI `X-Session-Expires-In` + client countdown), offline / outage banners

### Platform
- Static export with placeholder dynamic routes (`/location/_/?id=…`, `/display/_/?id=…`); FastAPI rewrites legacy `/location/{uuid}` URLs
- Last route (including query) restored after splash (`sessionStorage`)
- PWA: manifest, service worker, installable icons (`any maskable`)
- Password reset via Resend + short-lived `password_reset_tokens` (`?rt=` survives refresh / new tabs)
- Public **`/status`** page, **`/health`**, and **`/api/status`** (see [Health & Status Endpoints](#health--status-endpoints)); **`/display/_/?id=`** counter screen (outside the app shell)
- ESLint flat config + GitHub Actions CI and Test Suite workflows
- Jest · Playwright · Lighthouse CI config · pytest for FastAPI

---

## Quick start

```bash
npm install
cp .env.local.example .env.local
# Fill required keys (see Environment variables)

npx supabase link --project-ref <your-project-ref>   # or: npm run db:link
npm run db:push                                      # apply migrations

npm run check:supabase                               # verify tables + RLS + pg_net
npm run build:web                                    # Next.js static export → out/
npm run dev                                          # FastAPI on http://127.0.0.1:8000
```

**Workflow:** change UI → `npm run build:web` → refresh the browser on port **8000**. FastAPI reloads Python automatically (`--reload`). For Next-only HMR while iterating on components, use `npm run dev:web` (port 3000) or `npm run dev:full` (Next + FastAPI together).

Restart FastAPI after any `.env.local` change.

| Check | URL |
|-------|-----|
| App | [http://127.0.0.1:8000](http://127.0.0.1:8000) |
| Health | [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health) · [http://127.0.0.1:8000/status](http://127.0.0.1:8000/status) · [http://127.0.0.1:8000/api/status](http://127.0.0.1:8000/api/status) — see [Health & Status Endpoints](#health--status-endpoints) |
| Counter display | `http://127.0.0.1:8000/display/_/?id=<location-uuid>` |

Python dependency (once):

```bash
cd backend && pip install -r requirements.txt
```

---

## Environment variables

Copy from `.env.local.example`. Never commit `.env.local`.

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (server) | Staff/admin APIs, OTP, delete/export, push, **queue join**, counter display |
| `RESEND_API_KEY` | Yes (auth email) | Login / reset codes |
| `RESEND_FROM_EMAIL` | Recommended | e.g. `QFlow <onboarding@resend.dev>` |
| `ADMIN_OTP_PHONE` | Yes (admin) | Bootstrap super-admin cellphone (never removable) |
| `ADMIN_OTP_EMAIL` | Yes (admin) | Bootstrap super-admin OTP inbox |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Push | Web Push public key (also required on the FastAPI host) |
| `VAPID_PRIVATE_KEY` | Push | Web Push private key (FastAPI `pywebpush` sender) |
| `VAPID_SUBJECT` | Push | `mailto:` contact for VAPID |
| `PUSH_DISPATCH_SECRET` | Push webhook | Bearer for DB/Edge → `/api/push/dispatch` (staff JWT also allowed) |
| `NEXT_PUBLIC_APP_URL` | Production | Canonical app URL (`https://useqflow.app`) |
| `ALLOWED_ORIGINS` | Production | Comma-separated CORS origins for FastAPI (e.g. `https://useqflow.app`) |
| `NEXT_PUBLIC_API_URL` | Optional | Leave empty when UI and API share one host |
| `UPSTASH_REDIS_REST_URL` | Optional | Distributed OTP rate limits |
| `UPSTASH_REDIS_REST_TOKEN` | Optional | Upstash REST token |
| `SUPABASE_DB_PASSWORD` | Optional | For `npm run db:backup` / linked dumps |

Notes:
- Resend’s free `onboarding@resend.dev` sender only delivers to your Resend account email until you verify a domain.
- Without Upstash, OTP limits fall back to an in-memory Map (fine for local single-process use).
- Generate VAPID keys: `npm run pwa:vapid`
- Web Push is **operational** on `/api/status` only when **both** VAPID keys and `PUSH_DISPATCH_SECRET` are set on the FastAPI host. VAPID alone marks Push as **degraded** (staff JWT can still send; DB/Edge webhooks cannot authorize).

### GitHub Actions CI

| Workflow | File | What it runs |
|----------|------|----------------|
| CI | [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | `tsc` → `lint` → `build` → **FastAPI static smoke** (`:8000`) |
| Test Suite | [`.github/workflows/test.yml`](.github/workflows/test.yml) | Jest coverage · **FastAPI pytest + coverage (≥70%)** · Playwright (Chromium) · security pattern |

Triggers: push to `main`/`develop`, PRs to `main`.

Repository secrets (Settings → Secrets and variables → Actions):

| Secret | Used for |
|--------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production build + E2E |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production build + E2E |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Production build + E2E |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL (prefer the live domain, not localhost) |

---

## Database

Migrations live in `supabase/migrations/`. Apply with:

```bash
npm run db:push
# equivalent: npx supabase db push
```

| Migration | Purpose |
|-----------|---------|
| `…_init` | Core schema, RLS, realtime |
| `…_queue_priority` | Emergency / fast-track ordering |
| `…_admin_manage_staff` | Admin staff management |
| `…_lock_profile_role` | Block self-promotion |
| `…_lock_queue_and_audit` | Safer queue updates + audit policy |
| `…_walkins_notify_ratings` | Walk-ins, lifecycle notifications, ratings |
| `…_push_subscriptions` | Web Push + optional `app_settings` webhook |
| `…_serving_enum` / `…_serving_lock_and_unique` | `serving` status, claim RPCs, unique active entry |
| `…_password_reset_tokens` | Server-side reset flow tokens |
| `…_client_errors` | `client_errors` table — React ErrorBoundary reports via `POST /api/errors` |
| `…_profile_sms` | `cell_number` (retained for admin contact; SMS channel removed) |
| `…_anonymize_queue_entries` | Allow `user_id` null after account deletion (stats retention) |
| `…_admin_accounts` | Multi-admin cellphone OTP (`admin_accounts`; env remains bootstrap) |

After production deploy, optionally configure DB → HTTP push (needs **`pg_net`**):

```sql
insert into public.app_settings (key, value) values
  ('push_dispatch_url', 'https://YOUR_DOMAIN/api/push/dispatch'),
  ('push_dispatch_secret', 'same-as-PUSH_DISPATCH_SECRET')
on conflict (key) do update set value = excluded.value;
```

Check extension availability:

```bash
npm run check:supabase
# or scripts/check-pg-net.sql in the SQL Editor
```

**If `pg_net` is unavailable**, deploy the Edge Function fallback:

```bash
npm run functions:deploy
```

Then use Database Webhooks or cron polling against `…/functions/v1/push-dispatch` (see `supabase/functions/push-dispatch/`). Staff “call next” still creates **in-app** notifications via the `notify_queue_lifecycle` DB trigger; the app (and optional webhooks) can also hit FastAPI `/api/push/dispatch` for OS push.

Mirror password rules in **Supabase Auth → Password policy** (12+ characters, mixed case, digit, symbol).

### Database backups

Supabase backup policy by plan:

| Plan | Point-in-time recovery (PITR) |
|------|-------------------------------|
| Free | No PITR — manual backups only |
| Pro | 7-day PITR |
| Team | 14-day PITR |

**For production clinics (recommended):**

1. Upgrade to **Supabase Pro** ($25/month).
2. Enable **PITR** in the Supabase Dashboard.
3. Run a weekly logical dump (Unix/macOS/Git Bash — `date` formatting):

```bash
mkdir -p backups
npm run db:backup
# creates: backups/qflow-YYYY-MM-DD.sql
```

Requires a linked project (`npm run db:link`) and the database password when prompted (or `SUPABASE_DB_PASSWORD` in `.env.local`). On Windows PowerShell, run the dump via Git Bash or WSL so `$(date +%Y-%m-%d)` expands correctly.

4. Schedule weekly (example cron, Sundays 02:00):

```cron
0 2 * * 0 cd /app && npm run db:backup
```

Store backup files in a **separate** location (object storage, encrypted drive) — not only inside the same Supabase project. The `backups/` folder is gitignored.

---

## API reference

All routes are served by **FastAPI** on the same origin as the UI (port 8000 locally).

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/health` | Public | API process alive — see [Health & Status Endpoints](#health--status-endpoints) |
| `GET` | `/api/status` | Public | Component health JSON (app, DB, auth, push) — see [Health & Status Endpoints](#health--status-endpoints) |
| `GET` | `/api/display/[locationId]` | Public | Counter display tickets (no PII) |
| `POST` | `/api/queue/join` | User Bearer JWT | Join queue (service-role write after auth) |
| `POST` | `/api/queue/leave` | User Bearer JWT | Leave queue |
| `GET` | `/api/queue/health` | Public | Queue service health |
| `POST` | `/api/push/subscribe` | User session | Store Web Push subscription |
| `POST` | `/api/push/dispatch` | Staff/admin JWT **or** `Bearer ${PUSH_DISPATCH_SECRET}` | Send Web Push via FastAPI `pywebpush` (`qflow_api/push_service.py`) |
| `POST` | `/api/staff/login` | — | Staff password verify + email OTP (rate limited) |
| `POST` | `/api/staff/queue/claim` | Staff | Call / claim next or specific entry (`claim_*` RPCs as the staff JWT; no duplicate turn notify insert) |
| `POST` | `/api/staff/walk-in` | Staff | Add walk-in |
| `POST` | `/api/admin/otp/send` | — | Admin cellphone OTP (rate limited) |
| `POST` | `/api/admin/otp/verify` | — | Verify admin OTP |
| `POST` | `/api/admin/staff` | Admin | Create staff account |
| `GET`/`POST`/`PATCH` | `/api/admin/admins` | Admin | List / add / deactivate admin accounts |
| `POST` | `/api/auth/reset/send` | — | Password reset OTP (rate limited) |
| `POST` | `/api/auth/reset/advance` | — | Advance reset token stage |
| `GET` | `/api/auth/reset/session` | — | Resolve `?rt=` reset token |
| `POST` | `/api/rate` | User session | Submit visit rating (served within 2h, once per entry) |
| `GET` | `/api/user/export-data` | User session | POPIA JSON data export download |
| `DELETE` | `/api/user/delete-account` | User session + `{ confirm: "DELETE" }` | Erase account; anonymise queue rows |
| `POST` | `/api/errors` | Public | React `ErrorBoundary` → insert into `client_errors` (message, stack, path, `created_at`) |
| `GET` | `/auth/callback` | OAuth / magic link | Client page for session exchange |

OTP rate limits: **3 / 15 min** per identity, **10 / hour** per IP (Upstash when configured).

---

## Auth & Session Handling

Next.js no longer runs Edge `proxy.ts` / middleware (static export). Session refresh and role guarding are split between the **browser** and **FastAPI**.

### Role guards (API)

| Guard | File | Pattern | Used by |
|-------|------|---------|---------|
| Authenticated user | `backend/qflow_api/auth.py` → `get_current_user` | `Depends(get_current_user)` — Bearer JWT required | `/api/queue/*`, `/api/user/*`, `/api/rate`, push subscribe |
| Admin only | `backend/qflow_api/admin_auth.py` → `require_admin_dep` | JWT + `profiles.role == "admin"` | `/api/admin/*` |
| Staff (or admin) | `backend/qflow_api/staff_auth.py` → `require_staff` | JWT + `profiles.role in ("staff","admin")` + `location_id` + access token for claim RPCs | `/api/staff/*` |

There is no shared `dependencies.py`; routers import these deps directly.

### Role guards (UI)

| Layer | File | What it does |
|-------|------|----------------|
| Client navigation | `lib/routes.ts` → `pathAllowedForRole` | Redirects wrong-role paths to role home / login |
| App navigation | `lib/app-context.tsx` → `navigateTo` / `goToRoleHome` | Applies `pathAllowedForRole` on every screen change; honors `?returnUrl=` after re-login |
| Staff/admin login URLs | `components/qflow/private-login-gate.tsx` + `lib/private-access.ts` | Hides `/login/staff` and `/login/admin` until unlocked |

A leftover `proxy.ts` in the repo is **not wired** (no `middleware.ts`; static export). Do not rely on it.

### Session refresh & expiry banner

`proxy.ts` session refresh is gone (static export). Expiry UX is now client + FastAPI headers:

| Piece | Role |
|-------|------|
| **Banner UI** | `components/qflow/session-expiry-banner.tsx` — amber bar when ≤ **5 minutes** remain; “Stay Logged In” calls `refreshSession()` |
| **Client clock** | `lib/app-context.tsx` seeds `sessionExpiresAt` from Supabase `session.expires_at` / `onAuthStateChange` |
| **API signal** | FastAPI middleware on Bearer requests sets **`X-Session-Expires-In: <seconds>`** (JWT `exp` − now). CORS exposes the header. |
| **`lib/api-client.ts`** | After every response, reads `X-Session-Expires-In` via `lib/session-expiry-signal.ts` and updates `sessionExpiresAt` so the banner matches the token the API accepted |
| **Expired tokens** | FastAPI returns **401** `{ "code": "session_expired" }`. Client tries one `refreshSession()` + retry, else `/login?returnUrl=` |

FastAPI does **not** refresh Supabase tokens; only the browser (`supabase.auth.refreshSession`) does.

### What protects specific surfaces

| Surface | Protection |
|---------|------------|
| **`/rate` (page)** | Client: users only via `pathAllowedForRole`; `RateExperienceScreen` / `findRateableVisit` redirect to `/home?toast=rate_denied` when ineligible |
| **`POST /api/rate`** | `Depends(get_current_user)` + entry must be `served` for that user + **served within 2 hours** (`VISIT_RATING_WINDOW_SECONDS` in `routers/user.py`) + one rating per entry |
| **`/admin/*` (pages)** | Client `pathAllowedForRole` (admin only) |
| **`/api/admin/*`** | `require_admin_dep` (JWT + admin profile) |
| **`/staff/*` (pages)** | Client `pathAllowedForRole` (staff only; admins are sent to `/admin`) |
| **`/api/staff/*`** | `require_staff` (staff **or** admin JWT + assigned `location_id`) |

Backend tests: `backend/tests/test_auth_session.py` (expired JWT, wrong-role admin/staff, rating window).

---

## App routes

Static export only prerenders known paths. Dynamic location/display IDs use a placeholder segment `_` plus `?id=`.

Dynamic routes are static shells — all data is fetched client-side via FastAPI after auth resolves. No SSR data exposure risk.

| Path | Access | Description |
|------|--------|-------------|
| `/` | Public | Splash → last route or role home |
| `/onboarding` | Public | First-run onboarding |
| `/login`, `/register` | Public | User auth (Google allowed) |
| `/login/staff`, `/login/admin`, `/login/otp`, `/login/email` | Gated / public | Staff / admin / OTP flows |
| `/forgot-password`, `/forgot-password/verify`, `/forgot-password/reset` | Public | Password reset (`?rt=`) |
| `/status` | **Public** | System status (no app shell; usable during outages) |
| `/display/_/?id=` | **Public** | Counter display shell → `GET /api/display/{id}` (tickets only; no auth) |
| `/home`, `/map`, `/queue`, `/profile` | User | Core customer app |
| `/location/_/?id=` | User | Empty shell until session; then join sheet. Unauthenticated → `/login?returnUrl=` |
| `/location/_/join/?id=` | User | Same join sheet (deep link / legacy) |
| `/notifications`, `/rate`, `/help` | User | Alerts, rating (gated), help & support |
| `/profile/edit`, `/profile/language`, `/profile/accessibility`, `/profile/notifications` | User | Profile settings |
| `/staff`, `/staff/serving` | Staff | Dashboard + serving |
| `/admin`, `/admin/locations/new`, `/admin/staff`, `/admin/admins`, `/admin/audit` | Admin | Admin console |

There is no `/api/locations/[id]` route — location lists come from Supabase (client) after sign-in. Counter boards use only `/api/display/{locationId}`.

---

## Counter display

Fullscreen **now serving** board for a tablet or TV at the service desk.

| | |
|---|---|
| **URL** | `/display/_/?id=<locationId>` (legacy `/display/<uuid>` redirects here) |
| **Auth** | None — pin the URL on the device |
| **Data** | `GET /api/display/[locationId]` (ticket numbers only; no names or phones) |
| **Live updates** | Supabase Realtime + periodic refresh when staff call next |

Layout:
- Top (~40%): **NOW SERVING** + large ticket (e.g. `047`)
- Bottom (~60%): **RECENTLY CALLED** — last 5 served tickets with times
- Footer: QFlow mark, location name, clock (1s), pulsing **● Live**

Brand colour: `#2563EB`. Outside `AppShell` (same pattern as `/status`).

---

## Health & Status Endpoints

Three related surfaces — do not treat them as interchangeable:

| Endpoint | Layer checked | Use for |
|----------|---------------|---------|
| `/health` | FastAPI process only — is the API server itself alive (`service: "qflow-api"`, env/static flags) | Load balancer / process supervisor health checks |
| `/api/status` | App + DB + Auth + Push component status (JSON) | Programmatic monitoring, dashboards |
| `/status` | Human-readable page rendering `/api/status` data | UptimeRobot browser check, public status page link |

**Push component** on `/api/status`:

| Status | Meaning |
|--------|---------|
| `operational` | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` + `PUSH_DISPATCH_SECRET` all set |
| `degraded` | Incomplete VAPID, or VAPID set but secret missing (staff JWT can still dispatch; webhooks cannot) |
| `down` | VAPID keys not set — `/api/push/dispatch` cannot send |

---

## Notifications

| Channel | When |
|---------|------|
| In-app | Queue lifecycle DB trigger `notify_queue_lifecycle` → `notifications` (join, almost, your-turn/serving, served, no-show). Staff claim does **not** insert a second turn row. |
| Web Push | FastAPI `POST /api/push/dispatch` (`pywebpush`) — staff/admin session from the app (`lib/push-client.ts`), and/or `PUSH_DISPATCH_SECRET` from `pg_net` / Edge Function |

SMS is **not** used. UI copy refers to phone / in-app alerts only. Customers get alerts in the app and (when permitted) as OS push banners.

Multilingual alert copy (`almost_next`, `your_turn`, `no_show`, `rate_visit`) lives in `lib/notification-templates.ts` (en, af, zu, st, xh, tn). The client localizes stored English bodies on the notifications screen; staff/Edge push still sends English.

Canonical Node helper `lib/push.ts` remains for local scripts; production delivery is FastAPI.

### Known gaps

- SMS notifications were removed. Customers who decline Web Push and do not keep the app open will not receive turn alerts. In-app notifications require an active session.

---

## PWA

Required assets in `public/`:

| File | Use |
|------|-----|
| `icon-192x192.png` | Android home screen |
| `icon-512x512.png` | Android splash |
| `apple-touch-icon.png` | iOS (180×180) |
| `favicon.ico` | Browser tab |
| `manifest.json` | `purpose: "any maskable"`, theme `#2563EB` |
| `sw.js` | Offline precache + push; navigations are network-first (avoids cached splash on deep links) |

Regenerate icons: `npm run pwa:icons`

---

## Testing

QFlow uses **Jest** (unit, components, API, a11y, integration), **Playwright** (E2E against port **8000**), and **pytest** for FastAPI. Config: `jest.config.ts`, `jest.setup.ts`, `playwright.config.ts`, `backend/pytest.ini`.

### Commands

```bash
npm test                 # all Jest suites
npm run test:watch       # Jest watch mode
npm run test:coverage    # Jest + coverage report (gated metrics)
npm run test:report      # HTML coverage under coverage/
npm run test:api         # API-related Jest tests
npm run test:a11y        # jest-axe accessibility tests
npm run test:api:python  # FastAPI pytest + coverage gate (≥70%)
npm run test:staff-flow  # Live staff walk-in → claim → finish script
# ⚠️  Runs against live Supabase — creates real queue entries. Never run against
#     production. Requires SUPABASE_TEST_CONFIRM=yes if the project URL doesn't
#     match a recognized dev/test naming pattern (-dev, -test, staging, …).
#     Follow-up: use a dedicated Supabase test project separate from staging/prod.
npm run test:e2e         # Playwright (expects FastAPI on :8000 + built out/)
npm run test:e2e:ui      # Playwright UI mode
npm run test:e2e:debug   # Playwright debug
npm run test:perf        # Lighthouse CI
npm run test:all         # coverage then full E2E
```

First-time Playwright browsers:

```bash
npx playwright install --with-deps
# or Chromium only: npx playwright install chromium
```

Before E2E: `npm run build:web` and `npm run dev` (or let Playwright start the server if configured).

### Layout

| Path | Purpose |
|------|---------|
| `__tests__/unit/` | Password, rate-limit, i18n, visit-rating, admin-access, queue helpers |
| `__tests__/components/` | Staff/admin/serving, walk-in modal, map/register, join drawer wiring |
| `__tests__/api/` | Status, queue, rate, export, push, display smoke |
| `__tests__/integration/` | Staff + admin flows, queue messaging |
| `__tests__/accessibility/` | jest-axe + keyboard |
| `__tests__/helpers/` | Shared `useApp` mocks |
| `backend/tests/` | FastAPI health, auth/session gates, push dispatch, display privacy, service coverage (≥70% `qflow_api`) |
| `e2e/` | Splash, login, display, onboarding, status, mobile, a11y, queue API |
| `__mocks__/msw/` | Optional MSW handlers |

### Coverage gate

**Jest** (`npm run test:coverage`) enforces thresholds on the measured frontend surface (see `collectCoverageFrom` in `jest.config.ts`):

| Metric (Jest) | Gate |
|---------------|------|
| Lines / statements | ≥ 70% |
| Branches | ≥ 70% |
| Functions | ≥ 65% |

**pytest** (`backend/`; CI job `backend-tests`) gates FastAPI package coverage via `backend/pytest.ini` (`fail_under = 70`) and `--cov-fail-under=70`:

| Metric (Python / `qflow_api`) | Gate |
|-------------------------------|------|
| Lines | ≥ 70% |
| Branches | reported (`branch = true` in coverage config) |
| Functions | included in line coverage of `qflow_api` |

Local:

```bash
npm run test:api:python
# or
cd backend && pytest --cov=qflow_api --cov-report=term --cov-fail-under=70
```

Conventions: mock Supabase / Resend; no real secrets in fixtures; Playwright can reuse an existing server on `:8000`.

---

## Scripts

```bash
npm run build:web        # Next.js static export → out/
npm run build            # alias for build:web
npm run dev              # FastAPI (UI + API) on http://127.0.0.1:8000
npm run start            # FastAPI production bind 0.0.0.0:8000
npm run dev:web          # Next.js only (Webpack HMR on :3000)
npm run dev:full         # Next.js + FastAPI concurrently
npm run lint             # ESLint
npm test                 # Jest
npm run test:coverage    # Jest + coverage gates
npm run test:e2e         # Playwright E2E
npm run test:api:python  # pytest in backend/
npm run test:staff-flow  # verify staff queue flow against live Supabase
# ⚠️  Creates real queue entries. Never against production.
#     SUPABASE_TEST_CONFIRM=yes required unless URL looks like -dev/-test/staging.
npm run test:all         # coverage + E2E
npm run test:perf        # Lighthouse CI
npm run check:supabase   # env, tables, RLS, pg_net probe
npm run db:link          # link CLI to Supabase project
npm run db:push          # apply migrations
npm run db:backup        # supabase db dump → backups/qflow-YYYY-MM-DD.sql
npm run functions:deploy # deploy push-dispatch Edge Function
npm run pwa:icons        # regenerate PWA icons + favicon
npm run pwa:vapid        # print new VAPID key pair
```

---

## Project layout

```
app/                      # App Router pages (static export; no Next API routes)
backend/                  # FastAPI app server (API + static out/)
  main.py                 # Health, SPA serve, /location|display redirects
  qflow_api/              # Routers: queue, staff, admin, auth, user, display, status, misc (push)
    push_service.py       # Web Push send (pywebpush) + dispatch auth
  tests/                  # pytest (incl. test_push_service.py)
out/                      # Built static UI (gitignored locally; produced by build:web)
components/qflow/         # Screens, shell, join-queue-drawer, banners, PWA
components/qflow/error-boundary.tsx  # Catches render errors → POST /api/errors → client_errors
components/qflow/illustrations/
components/ui/            # shadcn (drawer, button, …)
lib/                      # Context, routes, i18n, Supabase, push-client, api-client, rate-limit
__tests__/                # Jest
e2e/                      # Playwright
__mocks__/msw/
jest.config.ts
playwright.config.ts
lighthouserc.js
public/                   # manifest, service worker, icons
supabase/migrations/      # includes …_client_errors.sql, claim RPCs, push_subscriptions
supabase/functions/       # Edge Functions (push-dispatch fallback → FastAPI)
STAFF_ONBOARDING.md       # Internal runbook: hidden staff/admin login gestures
scripts/
.github/workflows/
eslint.config.mjs
```

---

## Security & POPIA

- Column-level `UPDATE` on `profiles` (name, avatar, language, contact fields only)
- Privilege-escalation trigger blocks client changes to `role` / `location_id`
- Google OAuth blocked for staff/admin
- Google OAuth `redirectTo` is always `${window.location.origin}/auth/callback` (see `lib/auth-redirect.ts`). After changing `supabase/config.toml` auth URLs, run `npx supabase config push` so the hosted project Site URL is not stuck on `localhost:3000`.
- Multi-admin: `admin_accounts` is **service-role only**
- Visit ratings: server enforces served-within-2h and one rating per `queue_entry`
- Counter display API returns ticket numbers only (no customer PII)
- Queue join authenticates the user JWT, then inserts with the **service role** (same pattern as staff walk-ins)
- Account **export**: `GET /api/user/export-data`
- Account **delete**: cancel active queues → remove push subs → anonymise `queue_entries` → delete personal rows → delete profile → delete auth user
- Support contact (help): `support@qflow.co.za`

---

## Operations notes

| Topic | Status / guidance |
|-------|-------------------|
| Local app | `npm run build:web` then `npm run dev` → [http://127.0.0.1:8000](http://127.0.0.1:8000) |
| UI changes | Rebuild with `npm run build:web` (or use `dev:web` / `dev:full` while iterating) |
| **Pre-ship / merge** | Always verify changes against `npm run dev` (**:8000**, FastAPI + static export) before merging — `npm run dev:web` (**:3000**) uses Next’s own dev server and does **not** reflect FastAPI’s routing rewrites (e.g. legacy `/location/{uuid}` redirects, static export placeholder routes). A route that works on `:3000` can **404 on `:8000`**. CI smoke-tests the FastAPI-served build after `build:web`. |
| Port in use | Stop other processes on 8000; health should report `service: "qflow-api"` |
| Typecheck | `npx tsc --noEmit` |
| Lint | `npm run lint` |
| Unit / coverage | `npm run test:coverage` |
| FastAPI tests | `npm run test:api:python` |
| E2E | `npm run test:e2e` (Playwright against `:8000`) |
| CI | `ci.yml`: build + FastAPI static smoke · `test.yml`: Jest + **pytest (backend-tests)** + Playwright + security |
| Counter display | Pin `/display/_/?id=<locationId>` on desk hardware |
| Visit ratings | Ineligible `/rate` → `/home?toast=rate_denied` |
| Supabase tables / RLS | `npm run check:supabase` |
| `pg_net` | Often unavailable — use staff JWT dispatch and/or Edge Function → FastAPI |
| Push on status page | Needs VAPID **and** `PUSH_DISPATCH_SECRET` for `operational` |
| Upstash | Optional; set for multi-instance OTP limits |
| Uptime | UptimeRobot (external) — see below |
| Backups | Pro + PITR + weekly `npm run db:backup` |

---

## External uptime monitoring

Use [UptimeRobot](https://uptimerobot.com) (free tier) so outages are detected even if hosting dashboards are not watched.

See [Health & Status Endpoints](#health--status-endpoints) for what each URL actually checks.

### Setup checklist

1. Sign up at [uptimerobot.com](https://uptimerobot.com) (free).
2. Add **HTTP(s)** monitors (interval **5 minutes**). Recommended pair:

   | Monitor | URL | Interval | Why |
   |---------|-----|----------|-----|
   | Process health | `https://qflow.co.za/health` | Every 5 min | Fastest failure detection — lightest check (API process only) |
   | Public status page | `https://qflow.co.za/status` | Every 5 min | What users/ops see in a browser |

   **Do not also monitor `/api/status` by default** — it overlaps with `/status` (the page already loads that JSON). Add `/api/status` only if you want raw JSON alerting separate from the HTML page. Monitoring all three is usually redundant.

3. Set **alert contacts**:
   - Email: `support@qflow.co.za`
   - SMS (if available on your plan)
4. Optional: create a public UptimeRobot status page and link it from Help / ops runbooks.
5. Copy each monitor’s **monitor-specific API key** and paste it into the README badge at the top of this file.

```markdown
[![Uptime](https://img.shields.io/uptimerobot/status/mXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXX?label=uptime)](https://qflow.co.za/status)
```

Expect `up` / `down` from Shields.io once the key is valid. Prefer the **status page** (`/status`) monitor key for the badge shown above.

---

## License

Private repository. All rights reserved.
