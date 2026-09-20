/**
 * Reset a staff Auth password via service role (local ops helper).
 * Usage: node scripts/reset-staff-password.mjs email@x.com 'NewPassword1!'
 */
import { readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const env = Object.fromEntries(
  readFileSync(resolve(root, ".env.local"), "utf8")
    .split(/\r?\n/)
    .map((line) => {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line)
      return m ? [m[1], m[2].trim()] : null
    })
    .filter(Boolean)
)

const email = (process.argv[2] || "").trim().toLowerCase()
const password = process.argv[3] || ""
if (!email || !password) {
  console.error("Usage: node scripts/reset-staff-password.mjs email password")
  process.exit(1)
}

const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("Missing Supabase env in .env.local")
  process.exit(1)
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
}

const list = await fetch(
  `${url}/auth/v1/admin/users?page=1&per_page=200`,
  { headers }
)
if (!list.ok) {
  console.error("list users failed", list.status, await list.text())
  process.exit(1)
}
const payload = await list.json()
const users = payload.users || payload || []
const user = users.find((u) => (u.email || "").toLowerCase() === email)
if (!user) {
  console.error("No Auth user for", email)
  process.exit(1)
}

const upd = await fetch(`${url}/auth/v1/admin/users/${user.id}`, {
  method: "PUT",
  headers,
  json: undefined,
  body: JSON.stringify({ password, email_confirm: true }),
})
if (!upd.ok) {
  console.error("update failed", upd.status, await upd.text())
  process.exit(1)
}

const login = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: {
    apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ email, password }),
})
console.log("password reset ok for", email, "id", user.id)
console.log("login probe", login.status, (await login.text()).slice(0, 120))
