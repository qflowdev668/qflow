/**
 * Apply remaining push migration pieces that may be missing
 * (app_settings + dispatch trigger) via Management API or Postgres.
 */
import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(__dirname, "../.env.local"), "utf8")
    for (const line of raw.split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line)
      if (!match) continue
      const [, key, value] = match
      if (!process.env[key]) process.env[key] = value.trim()
    }
  } catch {
    /* optional */
  }
}

loadEnvLocal()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const ref = url?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
const accessToken = process.env.SUPABASE_ACCESS_TOKEN

const sql = `
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

-- Allow service role full access (bypasses RLS by default)

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
`

async function runSql(query) {
  if (accessToken && ref) {
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${ref}/database/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      }
    )
    const text = await res.text()
    if (!res.ok) throw new Error(`Management API ${res.status}: ${text}`)
    return
  }

  const dbPassword = process.env.SUPABASE_DB_PASSWORD
  const databaseUrl = process.env.DATABASE_URL
  let connectionString = databaseUrl
  if (!connectionString && dbPassword && ref) {
    // Try common pooler hosts
    const hosts = [
      `postgresql://postgres.${ref}:${encodeURIComponent(dbPassword)}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`,
      `postgresql://postgres.${ref}:${encodeURIComponent(dbPassword)}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`,
      `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${ref}.supabase.co:5432/postgres`,
    ]
    let pg = (await import("pg")).default
    for (const cs of hosts) {
      const client = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } })
      try {
        await client.connect()
        await client.query(query)
        await client.end()
        return
      } catch (e) {
        try { await client.end() } catch { /* */ }
        console.warn("pg try failed:", e.message)
      }
    }
    throw new Error("All Postgres connection attempts failed")
  }

  if (!connectionString) {
    throw new Error("No SUPABASE_ACCESS_TOKEN, DATABASE_URL, or SUPABASE_DB_PASSWORD")
  }

  const pg = (await import("pg")).default
  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    await client.query(query)
  } finally {
    await client.end()
  }
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { error: checkErr } = await supabase.from("app_settings").select("key", { head: true, count: "exact" })
const missing = checkErr && /Could not find the table|schema cache/i.test(checkErr.message)

if (missing) {
  console.log("…     creating app_settings + push dispatch trigger")
  try {
    await runSql(sql)
    console.log("ok    DDL applied")
  } catch (e) {
    console.error("FAIL ", e.message)
    console.error(`
Paste this SQL in Supabase → SQL Editor, then re-run:
  node scripts/apply-push-migration.mjs

--- SQL ---
${sql}
`)
    process.exit(1)
  }
} else if (checkErr) {
  console.warn("check:", checkErr.message)
} else {
  console.log("ok    app_settings exists")
}

// Reload schema: wait briefly then upsert
await new Promise((r) => setTimeout(r, 1500))

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "")
const secret = process.env.PUSH_DISPATCH_SECRET || "qflow-push-dispatch-change-me"

for (const row of [
  { key: "push_dispatch_url", value: `${appUrl}/api/push/dispatch` },
  { key: "push_dispatch_secret", value: secret },
]) {
  const { error } = await supabase.from("app_settings").upsert(row, { onConflict: "key" })
  if (error) {
    console.error(`FAIL  upsert ${row.key}:`, error.message)
    process.exitCode = 1
  } else {
    console.log(`ok    ${row.key}`)
  }
}
