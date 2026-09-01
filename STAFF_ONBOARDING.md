# Staff & admin login — internal onboarding

One-page runbook for clinic managers and QFlow admins. **Do not publish this page on the customer help centre.**

## How a new hire finds staff login

1. Open QFlow in the browser (or installed PWA) and go to **`/login`**.
2. On the brand block (logo + “Welcome back” title):
   - **Staff:** long-press (~**2.5 seconds**) on the brand area until the staff sign-in screen opens. Uses Pointer Events — **mouse click-and-hold** on desktop works the same as touch-and-hold.
   - **Admin:** click the brand area **7 times** in a row (no more than **~2 seconds** between clicks). There is no visible counter or on-screen hint — on the 7th click, admin OTP opens.
3. Sign in with the credentials an admin created for them (staff: email + password + email OTP; admin: cellphone + email OTP).

If unlock works once, that browser tab’s `sessionStorage` stays unlocked for `/login/staff` or `/login/admin` until the tab/session ends.

## When the long-press fails

Some environments steal the long-press (text selection, “Open in app”, accessibility menus). Known problem areas:

| Situation | Typical issue |
|-----------|----------------|
| **Android Chrome / Samsung Internet** | Long-press starts text selection or a context menu before 2.5s |
| **In-app WebViews** (some MDM / kiosk wrappers) | Pointer events cancelled or delayed |
| **Desktop with trackpad “force click”** | Gesture may not map cleanly to pointer hold |
| **TalkBack / VoiceOver focus** | Focus can leave the brand target mid-press |

### Fallbacks (in order)

1. **In person:** Walk them through the gesture once on a known-good device (Chrome desktop or iOS Safari usually fine). On desktop, prefer click-and-hold on the brand for staff, or seven quick clicks for admin.
2. **One-time link (emergency / onboarding only):** Share  
   `https://<your-domain>/login?unlock=staff`  
   or `?unlock=admin`. That sets `sessionStorage` and opens the gated login. **Not** the routine path — prefer the logo gestures. Treat links like temporary keys — do not post them publicly.
3. **Direct URL after unlock:** After unlock in that browser, `/login/staff` or `/login/admin` works for the rest of the session. Without unlock, those URLs redirect back to `/login` (see E2E).
4. **Stuck / locked out:** Email **support@qflow.co.za** (or your clinic’s QFlow admin). Customers only see “Contact your manager for login access” — no gesture details.

## Who to contact if locked out

| Role | Contact |
|------|---------|
| New staff | Clinic manager / location admin who created their account |
| Admins / bootstrap | Env owners (`ADMIN_OTP_PHONE` / `ADMIN_OTP_EMAIL`) or `support@qflow.co.za` |
| Product / unlock bugs | `support@qflow.co.za` with device + browser version |

## Related code

- Unlock keys: `lib/private-access.ts` (`qflow_staff_unlock` / `qflow_admin_unlock`)
- Gate: `components/qflow/private-login-gate.tsx`
- Gestures: `components/qflow/screens/login-screen.tsx` (`data-testid="login-brand"`)
- E2E: `e2e/buttons.spec.ts` — redirect without unlock + unlock success
