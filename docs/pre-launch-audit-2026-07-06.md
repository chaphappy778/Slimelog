# SlimeLog Pre-Launch Audit — 2026-07-06

## Executive Summary

SlimeLog is a solid Next.js 14 + Supabase app with a well-structured RLS-first data model and clean Stripe webhook signature verification. However, the security posture leans heavily on client-side gates and RLS with too few belt-and-suspenders server checks: `/settings`, `/log`, and `/brand-dashboard` are not in `proxy.ts`'s protected prefixes, several browser-side writes push unvalidated URLs and metadata straight to Supabase, and admin authorization is a single `NEXT_PUBLIC_ADMIN_EMAIL` string comparison. The most urgent items are account-deletion without re-auth, a stored-XSS path through user profile links, unvalidated Stripe checkout URLs/prices, and DOB PII being logged to Vercel from the auth callback. Fix the Blockers before the next public push; the High-priority items are worth a focused sprint after.

---

## 🚨 Blockers — Fix Before ANY Production User Access

### 1. `/settings/*`, `/log`, `/brand-dashboard` not protected by proxy.ts
- **File:** `apps/web/proxy.ts:14`
- **Issue:** `PROTECTED_PREFIXES = ["/logs", "/collection", "/profile"]` misses `/settings`, `/log` (singular — actual route), `/wishlist`, `/brand-dashboard`, `/admin`. Every settings page relies on a client-side `useEffect` calling `supabase.auth.getUser()` to redirect, and the full HTML/JS ships to unauthenticated visitors.
- **Why:** Defense-in-depth failure; any JS-off scraper or hydration-race edge case bypasses the gate.
- **Fix:** Add missing prefixes to `PROTECTED_PREFIXES` and convert settings pages to server components using `createClient()` server-side, mirroring `app/admin/page.tsx`.

### 2. Stored XSS via `profile_links.url`
- **Files:** write at `apps/web/app/settings/profile/page.tsx:597-618`; render at `apps/web/app/users/[username]/page.tsx:648`
- **Issue:** URL validation is client-only (`!trimUrl.startsWith("https://")`) then written to `profile_links` via the browser Supabase client. Rendered raw as `<a href={link.url} target="_blank">`. Bypassing the UI lets any authenticated user store `href="javascript:..."`.
- **Why:** Stored XSS on every viewer of that user's public profile.
- **Fix:** Add DB check-constraint `CHECK (url ~* '^https?://')`; guard at render:
  ```tsx
  href={/^https?:\/\//i.test(link.url) ? link.url : "#"}
  ```

### 3. `/api/account/delete` — no re-auth, no CSRF check, deprecated cookie API
- **File:** `apps/web/app/api/account/delete/route.ts:7-36`
- **Issue:** Calls `admin.auth.admin.deleteUser(user.id)` with only Supabase session cookie auth, no password re-prompt, no origin check, no confirm-token. Uses the deprecated single-cookie `get` shape.
- **Why:** Irreversible destruction behind one fetch — highest blast radius endpoint. Combined with any XSS or a stolen cookie, one click wipes the account.
- **Fix:** Migrate to `createClient` from `lib/supabase/server.ts`. Require the user to re-enter their password (`signInWithPassword`) and verify `Origin`/`Sec-Fetch-Site` equals the site origin before the destructive call.

### 4. `/api/stripe/checkout` trusts client-supplied `price_id`, `success_url`, `cancel_url`
- **File:** `apps/web/app/api/stripe/checkout/route.ts:27-46`
- **Issue:** No allowlist on price IDs, no origin check on redirect URLs.
- **Why:** A user can check out at any active Stripe price (a $0.01 test SKU) and earn PRO. Attacker-crafted checkout links become a signed post-payment open redirect to a phishing site.
- **Fix:** Server-side price allowlist keyed by product mode; enforce `new URL(success_url).origin === process.env.NEXT_PUBLIC_SITE_URL` (same in `/api/stripe/portal/route.ts:34-39`).

### 5. `drops` table's "manage" policy has no `WITH CHECK`
- **File:** `supabase/migrations/20260324000001_slimelog_initial_schema.sql:700-705`
- **Issue:** `FOR ALL USING (auth.uid() = announced_by OR auth.uid() = (SELECT owner_id FROM brands WHERE id = brand_id))` with no `WITH CHECK`. Postgres falls back to `USING`, so on INSERT any authenticated user passes by setting `announced_by = auth.uid()`; on UPDATE they can rewrite `brand_id`.
- **Why:** Any signed-in user can create or edit drops on any brand's behalf.
- **Fix:**
  ```sql
  DROP POLICY "Brand owners can manage drops" ON public.drops;
  CREATE POLICY drops_owner_write ON public.drops FOR ALL TO authenticated
    USING  (auth.uid() = (SELECT owner_id FROM public.brands WHERE id = brand_id))
    WITH CHECK (auth.uid() = (SELECT owner_id FROM public.brands WHERE id = brand_id));
  ```

### 6. Auth callback logs DOB + username PII to Vercel logs
- **File:** `apps/web/app/auth/callback/route.ts:66-75`
- **Issue:** `[T96-debug]` block dumps `date_of_birth`, `username`, and metadata for every login via `console.error`, landing in the error stream. Comment says "remove after Vercel log verification."
- **Why:** DOB PII in log storage is a compliance issue (COPPA-adjacent for under-13 branch, GDPR/CCPA for everyone).
- **Fix:** Delete the block. If needed for debug, gate on `NODE_ENV !== "production"` and log only booleans (`hasDob`, `needsUsernameSetup`).

### 7. `/auth/confirm` has no open-redirect protection on `next`
- **File:** `apps/web/app/auth/confirm/route.ts:18, 74, 79`
- **Issue:** Reads `next` from `searchParams` and passes it to `NextResponse.redirect(\`${origin}${next}\`)`. Unlike `/auth/callback` (which uses `safeRedirect`), this route accepts any string.
- **Why:** `next=//evil.com` becomes an open redirect right after account confirmation — the highest-trust moment in the user lifecycle.
- **Fix:**
  ```ts
  import { safeRedirect } from "@/lib/safe-redirect";
  const next = safeRedirect(searchParams.get("next"), "/");
  ```

---

## ⚠️ High Priority — Fix Before Public Launch

### 8. `profiles` billing/trust columns are user-writable
- **File:** `supabase/migrations/20260324000001_slimelog_initial_schema.sql:580-583` (also cols added by migs 28/31, and `is_verified` at `:89`, `brands.is_premium` at `:117`)
- **Issue:** Self-update policy has no column gate. Users can `UPDATE profiles SET subscription_tier='pro', subscription_status='active', is_verified=true` via PostgREST, bypassing Stripe and forging trust badges.
- **Why:** Total bypass of paid-tier gating and trust signaling.
- **Fix:** `BEFORE UPDATE` trigger reverting changes to billing/trust columns unless caller is `service_role`, or move billing to a service-role-only table.

### 9. `NEXT_PUBLIC_ADMIN_EMAIL` is the sole admin identity check
- **Files:** `app/admin/page.tsx:127`, `app/admin/waitlist/page.tsx:126`, `app/admin/brand-claims/page.tsx:172`, and 3 admin API routes (`.../approve/route.ts:85`, `.../reject/route.ts:114`, `.../document-url/route.ts:27`)
- **Issue:** The `NEXT_PUBLIC_` prefix inlines the admin's email into every browser bundle, giving attackers a precise phishing target and a single string-equality point of failure.
- **Why:** Any future weakening of email confirmation (e.g., an unverified-email OAuth provider) turns admin escalation into a signup.
- **Fix:** Rename to `ADMIN_EMAIL` (server-only). Better, add `profiles.role = 'admin'` and gate on that, also asserting `email_confirmed_at IS NOT NULL`.

### 10. Stripe webhook has no idempotency table
- **Files:** `supabase/migrations/20260414000028_stripe_subscriptions.sql`, `20260420000031_stripe_subscription_periods.sql`
- **Issue:** Subscription state is denormalized onto `profiles`/`brands` with no `stripe_webhook_events` table logging processed `event_id`. Stripe retries; any handler bug replays state.
- **Why:** Subscription state can silently drift on retries or handler failures.
- **Fix:**
  ```sql
  CREATE TABLE public.stripe_webhook_events (
    event_id text PRIMARY KEY,
    event_type text NOT NULL,
    processed_at timestamptz NOT NULL DEFAULT now(),
    payload jsonb
  );
  ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
  ```
  Short-circuit in the webhook route on replay.

### 11. `slimes` INSERT/UPDATE lets any authed user tamper with brand-linked slimes
- **File:** `supabase/migrations/20260324000001_slimelog_initial_schema.sql:609-617`
- **Issue:** `USING (auth.uid() = created_by)` with no cap on `brand_id` (as long as `is_brand_official=false`), and UPDATE has no column restriction — a user can retroactively rewrite `brand_id`/`image_url` on slimes others have logged against.
- **Why:** Data-integrity attack: rewrite the brand a popular logged slime is attributed to.
- **Fix:** `BEFORE UPDATE` trigger restricting UPDATE columns (block `brand_id`, `is_brand_official` changes); consider a moderation flag on brand-linked slimes.

### 12. `activity_feed` `SELECT USING (true)` — private-log leak surface
- **File:** `supabase/migrations/20260324000001_slimelog_initial_schema.sql:717-719`
- **Issue:** Mig 36 added trigger-side filtering and a backfill delete, but the SELECT policy is still fully public. Any code path that inserts an activity row for a private log becomes anon-readable.
- **Fix:** Tighten SELECT to an `EXISTS` check on `collection_logs.is_public OR user_id = auth.uid()` when `log_id IS NOT NULL`.

### 13. `waitlist` anon INSERT accepts sync-state columns
- **File:** `supabase/migrations/20260331000000_waitlist.sql:15-18`
- **Issue:** `TO anon WITH CHECK (true)` — anon can supply `brevo_contact_id`, `brevo_synced_at`, `notes`, `invited_at`, poisoning Brevo sync state and enabling enumeration (conflict = present).
- **Fix:** Whitelist columns in WITH CHECK:
  ```sql
  WITH CHECK (
    brevo_contact_id IS NULL AND brevo_synced_at IS NULL
    AND notes IS NULL AND invited_at IS NULL
  )
  ```

### 14. No rate limits on Resend/Brevo-backed endpoints
- **Files:** `apps/web/app/api/report/route.ts` (entire), `apps/web/app/api/waitlist/route.ts` (entire), `apps/web/app/api/brand-claims/verify-email/route.ts:132-166`, approve/reject loops
- **Issue:** `/api/report` fires a Resend email per call with no rate limit; `/api/waitlist` posts to Brevo with no throttle; `verify-email` sends two emails per success with no cap.
- **Why:** Provider quota abuse plus a spam-relay vector via `/api/report` (attacker-controlled `details` embedded in the email at line 100).
- **Fix:** IP + user-id sliding-window rate limits (Upstash Redis or a Supabase `rate_limits` table). Truncate `details` to <=2000 chars before including in email.

### 15. `/api/wishlist` and `/api/report` have unvalidated inputs
- **Files:** `apps/web/app/api/wishlist/route.ts:15-27`, `apps/web/app/api/report/route.ts:41-69`
- **Issue:** Wishlist accepts unbounded `slime_name`, `brand_name_raw`, and any `subtype_id` — no UUID check, no FK verification. Report accepts any `content_id` string with no existence check.
- **Why:** DB bloat, junk-data poisoning of public tables, support inbox flooded with reports referencing nothing.
- **Fix:** Zod schemas — validate UUIDs, length-cap strings (<=200 chars), verify referenced IDs exist via `.select("id").maybeSingle()` before insert.

### 16. Client writes trust RLS with no server-side URL validation
- **Files:** `components/dashboard/BrandSettingsForm.tsx:311-354` (brands: `website_url`, `shop_url`, `contact_email`, `bio`); `lib/profile-actions.ts:161-163, 180-182` (`avatar_url`, `background_url`); `components/dashboard/SlimesSplitPanel.tsx:218-227`
- **Issue:** Browser-driven `supabase.from("brands").update(...)` and profile updates accept arbitrary URLs. Any RLS bug or future migration slip lets bad URLs land on public pages.
- **Why:** Same XSS/tracker-beacon vector as #2, but on brand and profile pages viewed by everyone.
- **Fix:** Route mutations through server actions using a shared `assertHttpsUrl(url, allowedHosts?)` helper; add DB check-constraints on all URL columns. For avatar/background, require URL to start with `NEXT_PUBLIC_SUPABASE_URL`.

### 17. `/api/brand-claims/upload-document` trusts client MIME + weak filename sanitizer
- **File:** `apps/web/app/api/brand-claims/upload-document/route.ts:55, 88, 133-139`
- **Issue:** `file.type` is browser-supplied; `sanitizeFilename` doesn't strip leading dots or multiple extensions (`document.pdf.html` passes).
- **Why:** Polyglot uploads become admin-side XSS when the reviewer opens the signed URL and the browser sniffs it as HTML.
- **Fix:** Server-side magic-byte check (PDF `%PDF`, PNG `89 50 4E 47`, JPEG `FF D8 FF`); derive `contentType` from sniff; strip leading dots; serve to admins with `Content-Disposition: attachment`.
- **Status (2026-07-07):** ✅ Shipped. Test deferred to pre-launch validation pass. Verify:
  1. Legit PDF/JPG/PNG upload still works, filename stored canonicalized.
  2. `.txt` or `.exe` upload → 400 "Only PDF/JPG/PNG allowed."
  3. Renaming a real PDF to `evil.exe` still succeeds (sniff catches it) and stores as `.pdf`.
  4. Admin document view downloads to disk instead of rendering inline.

### 18. Brand claim skips domain match when `website_url` is null
- **File:** `apps/web/app/api/brand-claims/submit/route.ts:119-130`
- **Issue:** `emailMatchesBrandDomain` only runs when `brandRow.website_url` is truthy. The most fraud-prone brands (no website) have zero domain verification.
- **Fix:** If `website_url` is null, force the document-upload path plus manual review before advancing to `pending_review`.

### 19. Server slime-log actions silently no-op on RLS-blocked writes
- **Status (2026-07-07):** ✅ Shipped. Happy path (edit + delete of own logs) verified. Adversarial test deferred to pre-launch validation pass — needs a walkthrough (user has not done browser-console adversarial testing before). Test plan:
  1. Log in as user A.
  2. Open browser DevTools → Network tab.
  3. Trigger a legit log update/delete to capture the request shape.
  4. Copy the request as fetch/curl, change the logId to a random UUID (or another user's known log id).
  5. Replay. Should return the new error message ("Log not found or you do not have permission to edit/delete it.") instead of silently succeeding.


- **File:** `apps/web/lib/slime-actions.ts:176-230` (`updateSlimeLog`, `deleteSlimeLog`)
- **Issue:** `.update(...).eq("id", logId).eq("user_id", userId)` returns `{success:true}` even when zero rows are affected. UI shows success toast + `router.push`.
- **Why:** Confusing UX; hides a data-integrity blind spot if RLS ever mis-configures.
- **Fix:** Add `.select("id")` and throw when the returned array is empty. Same for delete.

### 20. `next.config.js` — no security headers, `lh3.googleusercontent.com` unrestricted
- **File:** `apps/web/next.config.js`
- **Issue:** No CSP, HSTS, `X-Frame-Options`, or Referrer-Policy. `lh3.googleusercontent.com` has no `pathname` restriction.
- **Fix:** Add `async headers()` returning CSP (allowlist Supabase + Stripe), HSTS, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`. Restrict Google pathname to `/a/**` (profile photos only).

### 21. Broken `/auth/login` redirect target (path doesn't exist)
- **Files:** `app/brand-dashboard/page.tsx:11`, `app/brand-dashboard/[slug]/settings/page.tsx:18`, `app/brand-dashboard/[slug]/slimes/page.tsx:18`
- **Issue:** Redirects to `/auth/login` but the login route is at `/login`. Also uses raw `<img>` at `app/brand-dashboard/page.tsx:76`.
- **Fix:** `redirect("/login?next=" + encodeURIComponent(pathname))`. Convert `<img>` to `next/image` with explicit dimensions.

### 22. Password change accepts no current-password prompt
- **File:** `apps/web/app/settings/password/page.tsx:137`
- **Issue:** Session-hijacker can rotate the password with no re-auth, permanently locking out the real user.
- **Fix:** Require current password via `signInWithPassword` before `updateUser({ password })`.

### 23. Stripe module-scope admin clients silently swallow missing env vars
- **Files:** `apps/web/app/api/stripe/webhook/route.ts:9-12`, `.../checkout/route.ts:7-10`, `.../portal/route.ts:7-10`
- **Issue:** `createClient` runs at module load with `process.env.SUPABASE_SERVICE_ROLE_KEY!`. If the key is missing at deploy, the route accepts events and returns 200 while updating nothing.
- **Fix:** Move client creation inside the handler and throw/500 if env vars are missing.

### 24. Every settings/log page creates its own browser Supabase client
- **Files:** `app/settings/page.tsx:11`, `app/settings/password/page.tsx:10`, `app/settings/email/page.tsx:10`, `app/settings/subscription/page.tsx:12`, `app/log/page.tsx:283`
- **Issue:** Each file calls `createBrowserClient(...)` instead of the singleton at `lib/supabase/client.ts:8`. Duplicate auth listeners, cookie races, memory leaks.
- **Fix:** Replace with `import { createClient } from "@/lib/supabase/client"; const supabase = createClient();`.

### 25. Unescaped `brand.name` interpolated into transactional email HTML
- **File:** `apps/web/app/api/admin/brand-claims/approve/route.ts:212-228` (same in reject)
- **Issue:** A brand name containing `</p><script>...` becomes live payload in some native mail clients.
- **Fix:** Escape before interpolation: `s.replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]!))`.

### 26. `/api/age-verify` trusts client-supplied `age_verified` boolean
- **File:** `apps/web/app/api/age-verify/route.ts:32-37, 94-100`
- **Issue:** The server checks the 13-year floor but takes the client's `age_verified` at face value.
- **Fix:** Compute age server-side from DOB; reject `age_verified` as an input.

### 27. Legacy `log_comments` / `log_likes` tables shadow the new tables
- **Files:** `20260324000001_slimelog_initial_schema.sql:745-766`, migs 15/16 add replacements
- **Issue:** Two parallel tables with independent RLS still exist; historical rows still sit under the old permissive-ish policies.
- **Fix:** Confirm dead code paths, then `DROP TABLE public.log_comments; DROP TABLE public.log_likes;` in a new migration.

---

## 💡 Nice-to-Have — Post-Launch

- **`is_admin()` hard-codes a single email** — Replace with an `admins(user_id uuid primary key)` table.
- **`subscription_status CHECK` includes literal `null` in `IN (...)`** — Rewrite as `IS NULL OR IN (...)`.
- **`waitlist.email UNIQUE` is case-sensitive** — `CREATE UNIQUE INDEX ON waitlist (lower(email));`.
- **`handle_new_user()` swallows unique-username violations** — `ON CONFLICT (id) DO NOTHING` masks username collisions.
- **`user_collection_summary` view keeps regressing on `security_invoker`** — Add a repo lint grepping every `CREATE VIEW` for `security_invoker=on`.
- **`tags` INSERT is unbounded** — `WITH CHECK (true)` for authenticated is a spam vector. Add length/regex constraint.
- **`follows` ignores `profile_visibility='private'`** — Consider a follow-request flow for private profiles.
- **`brand_claims.document_storage_path` has no FK to `storage.objects`** — Orphan files accumulate after claim deletion.
- **Signed admin document URLs are 1 hour** — URLs may contain government IDs; drop to 300s or stream through the route.
- **`waitlist/route.ts` echoes raw Postgres error text** — `detail: insertError?.message` returns DB internals to unauth callers.
- **Literal `…` escape sequences render as text** — Copy-paste artifact across several files. Replace with `…` or `&hellip;`.
- **Signup DOB → age is timezone-sensitive** — `new Date("2013-07-06")` parses as UTC midnight. Use `new Date(y, m-1, d)`.
- **Client fetches lack `AbortController`** — "setState on unmounted component" warnings + stale-data races.
- **`CookieBanner` is cosmetic** — No analytics/trackers yet, so the accept/dismiss doesn't gate anything. Wire it before adding analytics.
- **`package.json` caret-pins security-sensitive deps** — Consider exact-pinning `stripe`; add `"engines": {"node": ">=20"}`.
- **Empty README** — Fix.

---

## ✅ What SlimeLog Does Well

- **Stripe webhook signature verification is correct** — `constructEvent` runs before body parse in `app/api/stripe/webhook/route.ts`, closing the classic webhook forgery hole.
- **`lib/supabase/admin.ts` isolation** — service-role client is walled off in its own module and imported only where it's genuinely needed.
- **`lib/safe-redirect.ts` exists and is used in `/auth/callback`** — the pattern for open-redirect defense is in place (`/auth/confirm` just needs to adopt it).
- **RLS is enabled on every table at creation** — no table ships with RLS off; the audit found tightening opportunities, not fundamental gaps.
- **Server-rendered admin brand-claim pages check status guards and query as the admin user** — `app/brands/[slug]/claim/page.tsx` is a good template for other server-first flows.
- **Neutral response on `/forgot-password`** — prevents account enumeration.
- **Migration hygiene** — 47 well-named, timestamped migrations with visible security follow-ups (mig 25, 34, 35, 36, 47) showing the team already treats RLS as a first-class concern.
- **`opengraph-image.tsx` per public entity** — SEO/social sharing done properly with per-route generated images.
- **Clean separation of client/server Supabase concerns in `lib/supabase/`** — client, server, admin split correctly.
- **Next.js 16 + React 18.3.1 compatibility** — verified compatible.
