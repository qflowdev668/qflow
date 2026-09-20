/**
 * Fix hosted Supabase Auth Site URL + redirect allowlist for useqflow.app.
 *
 * 1. Create a token: https://supabase.com/dashboard/account/tokens
 * 2. Run:
 *      $env:SUPABASE_ACCESS_TOKEN="sbp_..."
 *      node scripts/fix-supabase-auth-urls.mjs
 */
const PROJECT_REF = "wotmaediyoapavlnhtmt"
const SITE_URL = "https://useqflow.app"
const ALLOW_LIST = [
  "https://useqflow.app",
  "https://useqflow.app/**",
  "https://useqflow.app/auth/callback",
  "https://useqflow.app/auth/callback/",
  "http://127.0.0.1:8000",
  "http://127.0.0.1:8000/**",
  "http://127.0.0.1:8000/auth/callback",
  "http://127.0.0.1:8000/auth/callback/",
  "http://localhost:8000",
  "http://localhost:8000/**",
  "http://localhost:8000/auth/callback",
  "http://localhost:8000/auth/callback/",
].join(",")

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim()
if (!token) {
  console.error(
    "Missing SUPABASE_ACCESS_TOKEN.\n" +
      "Create one at https://supabase.com/dashboard/account/tokens\n" +
      "Then:  $env:SUPABASE_ACCESS_TOKEN=\"sbp_...\" ; node scripts/fix-supabase-auth-urls.mjs"
  )
  process.exit(1)
}

const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`

const before = await fetch(url, {
  headers: { Authorization: `Bearer ${token}` },
})
if (!before.ok) {
  console.error("GET failed:", before.status, await before.text())
  process.exit(1)
}
const current = await before.json()
console.log("BEFORE site_url:", current.site_url)
console.log("BEFORE uri_allow_list:", current.uri_allow_list)

const patch = await fetch(url, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    site_url: SITE_URL,
    uri_allow_list: ALLOW_LIST,
  }),
})
if (!patch.ok) {
  console.error("PATCH failed:", patch.status, await patch.text())
  process.exit(1)
}
const updated = await patch.json()
console.log("AFTER site_url:", updated.site_url)
console.log("AFTER uri_allow_list:", updated.uri_allow_list)
console.log("\nDone. Hard-refresh https://useqflow.app/login/ and try Google again.")
