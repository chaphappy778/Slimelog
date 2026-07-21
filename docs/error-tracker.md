# SlimeLog — Error Tracker

Living log of bugs, gotchas, and their fixes. Keep entries dated. Newest at
top. When a class of error keeps recurring, note the pattern so future-us
recognizes it faster.

Categories used below (pick one per entry):

- **Auth** — sign in / sign up / recovery / session state
- **DB** — schema, RLS, triggers, CHECK constraints, migrations
- **UI** — rendering, layout, stacking contexts, hydration
- **Perf** — slow queries, wasteful renders, oversized bundles
- **Ingest** — brand claims, brand ingestion, image uploads
- **Stripe** — subscriptions, webhooks, tier sync
- **Ops** — deploys, env config, third-party outages
- **CORS / External** — anything cross-origin or cross-service

Template for new entries:

```
### YYYY-MM-DD — Short title (Category)

**Symptom:** what the user saw
**Root cause:** what actually broke
**Fix:** what we did / where it lives in code
**Regression check:** how we'd notice if it comes back
**Related:** links to tracker item IDs, other errors, or PRs
```

---

### 2026-07-21 — Optimistic toggle never rolls back when the network is down (UI)

**Symptom:** Jennifer's T127 smoke test — turn the network off, tap a
reaction emoji, the count optimistically bumped to +1 and stayed there
forever. No error, no revert, the button also looked wedged.

**Root cause:** the toggle handler did `const result = await
toggleReaction(...)` and only handled the `{ ok: false }` branch. When
the network is down the server action never resolves to a result — the
promise *rejects* (fetch throws). With no try/catch, the rejection blew
past the reconcile logic entirely: the optimistic `setState` had already
applied, `setPending(false)` never ran, and nothing reverted the count.
A returned validation error was handled; a thrown/offline error was not.
`startTransition` makes this worse (it can swallow the throw), but the
plain-await version has the same hole.

**Fix:** wrap the awaited server-action call in try/catch/**finally**
(`components/ReactionRow.tsx`, T192). BOTH paths now roll the optimistic
flip back to the captured pre-tap state: the `catch` handles
throw/offline (revert + a "check your connection" toast, `console.warn`
not Sentry — this is an expected offline path, not a bug), the
`{ ok: false }` branch handles server validation (revert + the returned
error toast). `finally` always clears the per-emoji in-flight guard so
the button can never wedge, on any path.

**Regression check:** DevTools → Network → Offline, tap a reaction. The
emoji should bump then snap back within a moment with an error toast, and
be tappable again immediately. Repeat online: it should stick and show
the reconciled count.

**Prevention pattern: any optimistic setState that awaits a server
action MUST catch the rejection, not just the returned-error union.** A
server action can *reject* (network, timeout, serialization) as well as
*resolve to `{ ok: false }`*. Handle both, and clear in-flight/loading
flags in `finally` so a throw can't leave the control disabled.

**Related:** T192 (comment reactions), T127 (the reverted first cut where
the bug was found).

---

### 2026-07-21 — Adding a notification enum value: two things break at once (DB + UI)

**Symptom:** N/A yet — prevention note filed while shipping T127 reactions so
the next person adding a `notification_type` doesn't get bitten.

**Root cause (two traps):**
1. **The exhaustive switch.** `components/notifications/NotificationRow.tsx`
   ends its `renderContent` switch with an exhaustiveness guard
   (`const _exhaustive: never = type`). Add a value to the `NotificationType`
   union in `lib/types.ts` WITHOUT adding a matching `case`, and `tsc` fails on
   the `never` assignment. That's the guard working as designed — but it means
   the enum value, the TS union, and the switch case must all land together.
2. **No payload column.** `public.notifications` had no per-row payload, so a
   notification that needs a detail (which emoji was reacted, which word, etc.)
   has nowhere to put it. T127 added a nullable `metadata jsonb` column
   (additive, all existing rows stay NULL) and threaded it through the API
   route `select` + `RawNotificationRow` + `normalize` + the `Notification`
   type. If you skip any of those four, the field silently reads `undefined`.

**Fix / pattern:** when adding a `notification_type`: (a) `ALTER TYPE ... ADD
VALUE IF NOT EXISTS` in a migration, (b) add it to the `NotificationType` union
in `lib/types.ts`, (c) add a `case` to `NotificationRow`'s switch, (d) if it
carries a detail, write to `notifications.metadata` and read it back through
the notifications API route. Migration ships first (CLAUDE.md rule) — the enum
value must exist before `toggleReaction` inserts a row that uses it.

**Regression check:** `npm run type-check` catches the missing switch case
immediately (the `never` guard). A reaction notification rendering as the
generic "You have a new notification" fallback means the `case` didn't match —
usually a typo between the enum string and the union member.

**Related:** T127 (reactions), T167 (`brand_log_received`, same enum-add flow),
migration `20260721000084_log_reactions.sql`.

---

### 2026-07-21 — Feed day-buckets throw a hydration error near the date line (UI)

**Symptom:** Sentry issue `81b58fcb` (T191) — hydration mismatch on `/` for a
production user (Chrome Mobile, Android 15). The diff pointed at the feed card
region: the server HTML and the client render disagreed on the Today / This
week / Earlier divider structure.

**Root cause:** `FeedListClient` is a `"use client"` component, so it renders
on the server during SSR *and* on the client during hydration. `bucketLogsByDay`
calls `new Date()` at render to find "local midnight." On the server that is the
Vercel box's timezone (UTC); in the browser it is the viewer's. For a viewer
whose evening is already the next UTC day, a log buckets as "Today" on the client
but "This week" on the server. Different bucket counts means a different number
of `DayDivider` blocks, which is a **structural** mismatch, and React throws
(text mismatches it silently recovers, structural ones it does not).

**Fix:** gate the time-based bucketing behind a `mounted` flag
(`apps/web/components/feed/FeedListClient.tsx`). The server and first client
render both use a deterministic single-bucket fallback (all logs under "Today",
no `new Date()`), so the markup matches. `useEffect` flips `mounted` and the real
timezone-aware buckets appear on the post-mount re-render. Reused the existing
mount effect that already hydrates the localStorage density preference.

**Regression check:** set the browser timezone to something west of UTC (e.g.
America/Los_Angeles), seed a log timestamped in the current local evening, load
`/`. No hydration error in the console; the log shows under "Today."

**Prevention pattern: any `Date.now()` / `new Date()` / `Math.random()` /
`localStorage` read *during render* of a `"use client"` component is a hydration
mismatch waiting to happen**, because that component still SSRs. If the value can
differ between the server process and the browser (timezone, clock, storage),
compute a deterministic value for the first render and move the real value into a
`useEffect` + state. The tell is a client component whose JSX branches on
wall-clock time or device state. (Sibling smell still live but lower-severity:
the `formatRelativeTime` "2h ago" text in `FeedCard` / `FeedCardCompact` has the
same root cause but only produces recoverable *text* mismatches, so it was left
alone here.)

**Related:** T191, T177 (added the bucketing), Sentry `81b58fcb`.

### 2026-07-21 — Password reset link dead-ends on /login (Auth)

**Symptom:** clicking "Set a new password" in the recovery email verified the
token but dropped the user on `/login` instead of the reset form.

**Root cause:** `/auth/callback` is a server route. It only acts when it finds a
`code` in the query string. Recovery tokens can instead arrive in the URL **hash**
(implicit flow), which the server never sees, or a cross-device PKCE click can
land with no code-verifier cookie so the exchange fails. In both cases the handler
fell through to its default `/login?error=auth_callback_failed` redirect, even
though `next` clearly asked for `/reset-password?flow=recovery`.

**Fix:** before the final `/login` fallback in `apps/web/app/auth/callback/route.ts`,
forward any recovery hand-off (`next.startsWith("/reset-password")`) to the client
reset page. The browser carries the `#hash` fragment across the 302 (the target
has no fragment of its own), so `/reset-password`'s `PASSWORD_RECOVERY` listener
can read an implicit-flow token, and if there is genuinely no valid token the page
shows its friendly "request a new link" state rather than a raw auth error.

**Regression check:** run the full forgot-password -> email -> click flow. Land on
`/reset-password?flow=recovery` with the "Set a new password" form, not `/login`.

**Related:** #33, T140, `docs/supabase-email-templates.md` (bug 1, same sweep).

---

## Known potential issues (not-yet-hit, worth watching)

### 2026-07-21 — `"use server"` files may only export async functions (Ops)

**Symptom:** `ReferenceError: <TypeName> is not defined` at runtime, pointing at a line in a `"use server"` file where the type is used in a function signature, despite `npm run type-check` passing clean and Vercel build succeeding.

**Root cause:** Next.js is strict that `"use server"` files may only export async functions. Any other export — including `export type { ... }`, `export const`, `export interface`, or `export class` — corrupts the server-actions loader's introspection pass at bundle time. The loader emits a broken module manifest, and the runtime symptom happens to point at the function signature where the type is *used* (not where it's exported), so the error looks like an import problem when it's actually an export problem.

**Fix:** Remove every non-async-function export from every `"use server"` file. If a consumer needs a type or constant defined in a server-actions file, either (a) move the type/constant to a separate non-"use server" module, or (b) redefine it inline in the consumer.

**Regression check:** grep every `"use server"` file for `^export (?!async function)` — if it matches anything other than an async function declaration, that's a latent version of this bug.

**Prevention pattern:** When authoring a server-actions file, treat exports as a strict allowlist: async functions only. Types used in the function's parameters or return value can be imported (`import type { ... }`) or defined locally, but never exported.

**Related:** the T192 rebuild (2026-07-21) hit this after being reverted from T127. Four failed deploy attempts patched the import syntax before we spotted the extra `export type` line at the bottom of the file. Sibling patterns: server-action files also can't export the client-only types they use for props (mount inline in the client component that consumes them).

---

### 2026-07-20 — Pre-seeded check-in modal re-inserts every pill on every save (UI + DB)

**Symptom:** After the 24h pre-seeding change landed, reopening the care check-in modal and adding a single new product wrote a row for the new product *and* a fresh duplicate row for every pill that was already checked. `actions_this_month` climbed by the full selection count on each save, `/care` showed duplicate tiles, and the day pills on already-logged tiles reset to `0D` even though nothing new had happened to those products.

**Root cause:** Two independent halves, each correct alone. `CareCheckinModal` seeds its selection state from the last 24h of actions so the sheet confirms what you just did (good UX). `markLogChecked` inserted `careActions` unconditionally. Nothing in between distinguished "the user just toggled this" from "the server told us this was already true," so the seed round-tripped straight back into the table on every save.

**Fix:** the standard pair — client sends a delta, database enforces uniqueness.

1. `CareCheckinModal` snapshots the seeded rows at mount (`seedBaseline`, via a new `parseSeeded` that applies **no** `knead` fallback) and `handleSave` subtracts it from current `selections`. A seeded pill whose quantity the user edited counts as changed and still ships.
2. `20260720000083_care_action_dedupe.sql` adds a unique index on `(user_id, log_id, action_type, product_key, performed_hour)`; `markLogChecked` upserts against it with `ignoreDuplicates: true` and returns `careActionsWritten` (rows that actually landed, not rows sent).

The baseline deliberately excludes the `knead` UI default. Seeding it would make a plain single-tap check-in diff to empty and write nothing, which is the silent-empty-payload bug in the entry below.

**Regression check:** log baby oil, reopen the sheet, add contact solution, save. Exactly one new row: `select product_key, performed_at from slime_care_actions where log_id = '<id>' order by performed_at desc`. The baby oil tile's day pill must not move. Then save the sheet again unchanged — zero new rows, and a `[markLogChecked] all N care action(s) deduped` warn in the server log.

**Prevention pattern: when a UI pre-fills from server state, the save path owes you a diff.** Any "seed the form from what's already there" change silently converts an insert path into an upsert path. If the write side isn't updated in the same commit, every save re-submits the seed. Grep shape to watch: a `useState(() => seedFrom(props))` whose state object is later iterated wholesale into a payload.

**Prevention pattern: PostgREST `on_conflict` cannot name an index expression.** Writing this dedupe index has two traps that both fail *after* you've written the migration:

1. `date_trunc('hour', <timestamptz>)` is **STABLE, not IMMUTABLE** — the result depends on the session `TimeZone` — so Postgres rejects it in an index expression outright. Pin the zone (`performed_at AT TIME ZONE 'UTC'`) to get the `timestamp` overload, which is immutable.
2. Even with an immutable expression, supabase-js/PostgREST's `onConflict` takes a **comma-separated column list only**. It cannot reference an index expression, and it cannot emit the `WHERE` predicate that a *partial* unique index needs for inference. Either shape fails at runtime with `there is no unique or exclusion constraint matching the ON CONFLICT specification`.

So: expose the expression as a `GENERATED ALWAYS ... STORED` column and index the plain columns. Rely on default `NULLS DISTINCT` for "this column being NULL means never a duplicate" (here, `product_key = NULL` quick re-logs) rather than reaching for a partial index. Also remember a unique index cannot be created over existing duplicates — a backfill `DELETE` has to run in the same migration, ahead of it, or `db push` fails on any table that already has data.

**Related:** T125 phase 2, T188, `apps/web/components/collection/CareCheckinModal.tsx`, `apps/web/lib/aging-actions.ts`, `supabase/migrations/20260720000083_care_action_dedupe.sql`. Direct sequel to the entry below — same modal, and the fix for that one (self-describing `selections`) is what made this delta cheap to compute.

---

### 2026-07-20 — Care check-in reports success while saving zero rows (UI + DB)

**Symptom:** Jennifer selected care products in the check-in modal on `/collection/care`, hit Save, and got the success path (modal closed, no error, card updated optimistically). The aging state reset correctly, so the check-in *looked* fully logged. But `slime_care_actions` had no rows for it, and the recent-care strip stayed empty across reloads. Nothing in the console.

**Root cause:** `CareCheckinModal.handleSave` rebuilt its save payload by looking each selected `product_key` up in the async product catalog (`care_products`, fetched in a `useEffect`) to recover that product's `action_type`. If the catalog hadn't resolved yet, or its query errored, every lookup returned `undefined`, each item was skipped during assembly, and the payload came back as an empty array. `markLogChecked(logId, careActions)` guards on an empty array (by design, so a bare "mark as checked" with no products still resets aging), inserted zero care rows, and returned `{ ok: true }`. The modal read `ok` and reported success.

Every layer behaved exactly as written. The failure lived in the gap between them: the payload was emptied at assembly time, and `{ok: true}` describes the aging reset, which genuinely did succeed. There was no point in the chain where anything could tell that four selections had gone missing.

The catalog-load failure path made this worse rather than better. It sets a soft `loadError` banner reading "Couldn't load care products. Save works, you'll still get credit for checking." That copy is true about the aging reset and actively misleading about the product rows, which is the part the user cares about.

**Fix:** `apps/web/components/collection/CareCheckinModal.tsx` — the `selections` state now carries its own `action_type` per entry, captured at selection time when the product row is already in hand. `handleSave` builds `CareActionInput[]` directly from `Object.entries(selections)` with no catalog lookup, so there is no longer a step that can silently drop items:

```ts
// Build the payload straight from selection state — no catalog
// lookup, so nothing can be silently dropped.
for (const [productKey, sel] of Object.entries(selections)) {
  const action: CareActionInput = {
    action_type: sel.action_type,
    product_key: productKey,
  };
  ...
}
```

**Regression check:** open the check-in modal and hit Save before the catalog finishes loading (throttle to Slow 3G in DevTools, or point the `care_products` select at a bad column). Selections should still persist. Verify with `select action_type, product_key from slime_care_actions order by performed_at desc limit 10` — the row count must match what was checked in the modal, not zero.

**Prevention pattern: a result union's `ok` must cover everything the caller thinks it covers.** Two rules that would each have caught this independently:

1. **Never let payload assembly drop items silently.** If a lookup during assembly can fail, it has to do one of three things: throw, return `{ok: false, error}`, or not exist. Preferring the third is what fixed this — keep enough self-describing state at the point of selection that no later lookup is needed. A `.map()` or loop that can yield fewer items than it consumed is the shape to watch for; if `payload.length < selected.length`, that's a bug, not a filter.
2. **When a guard turns "nothing to do" into success, assert the caller meant it.** `markLogChecked`'s empty-array guard is correct in isolation (bare check-ins are a real flow). The hazard is that it can't distinguish "the user selected nothing" from "the payload got emptied upstream." Either the caller validates non-empty before calling, or the action takes an explicit flag for the intentionally-empty case.

Related smell worth grepping for: any client handler that reads from state hydrated by an async fetch, and treats a missing value as "skip this item" rather than "we are not ready to save yet."

**Related:** T125 phase 2 (structured care actions), T188 Part 4, `apps/web/components/collection/CareCheckinModal.tsx`, `apps/web/lib/aging-actions.ts`. Same family as the 2026-07-12 server-action entry below — both are cases where the failure signal never reached the user.

---

### 2026-07-17 — Capacitor shell opens Safari on first launch instead of loading the WebView (Ops)

**Symptom:** Newly scaffolded Capacitor iOS shell was expected to render `https://slimelog.com` inside its WKWebView on cold launch. Instead, the SlimeLog app icon on the simulator home screen opened to a black screen, and Safari opened in parallel with slimelog.com in its address bar (URL bar visible at the bottom, "◀ SlimeLog" return-to-app affordance visible at the top). Xcode console showed `WebPageProxy::didFailProvisionalLoadForFrame ... code=102` (`WKErrorFrameLoadInterrupted`) followed by `Error: Frame load interrupted` and `TypeError: undefined is not an object (evaluating 'window.Capacitor.triggerEvent')` — the Capacitor bridge script never ran because the frame load was interrupted before it could inject.

**Root cause:** Capacitor 8's default navigation policy treats any request to a domain not in its `server.allowNavigation` whitelist as an external link and hands it off to `UIApplication.shared.open(url)`, which routes to Safari. Setting `server.url` alone is not sufficient. When `allowNavigation` is unspecified AND the initial navigation target is external, WKWebView cancels the load (code 102) after Capacitor's delegate returns `.cancel`, and the OS opens the URL in Safari as the fallback handler.

Two things made this hard to spot:
1. Capacitor's docs describe `server.url` as sufficient for a remote-load shell, but the interaction with the default navigation policy is documented only in a Discord post from the Ionic team. The Frame load interrupted error message is generic (WKWebView produces it for any cancelled navigation).
2. The Xcode log DOES contain `Loading app at https://slimelog.com` right before the failure, which reads as success at first glance. The actual `didFailProvisionalLoadForFrame` line comes several lines later once the WKWebView's async delegate fires.

Also a red herring earlier in debug: I initially suspected `iosScheme: 'https'` was the cause (I had set it in the config for cookie-scheme alignment). Removing it did not fix the issue on its own — the `allowNavigation` whitelist was what actually mattered. Left the `iosScheme` removal in place because setting it made no difference and the default is what Capacitor expects.

**Fix:** Explicit `allowNavigation` whitelist in `apps/web/capacitor.config.ts` covering every domain the WebView is allowed to load in-app:

```ts
server: {
  url: 'https://slimelog.com',
  cleartext: false,
  allowNavigation: [
    'slimelog.com',
    '*.slimelog.com',
    'zxxjpxpchvsjkvslwtvx.supabase.co', // OAuth callbacks
  ],
},
```

Any domain NOT in this list continues to open in Safari via `UIApplication.shared.open`, which is what we want for external links (brand IG profiles, TikTok links, etc.). Domain we absolutely need in-app: `slimelog.com` itself, `*.slimelog.com` for any subdomain (staging.slimelog.com if we ever add it), and the Supabase project host for the OAuth callback round-trip. Stripe checkout, Instagram embeds, or any other third-party domain we integrate later needs to be added to this list at build time.

After the config change, `npx cap sync ios` copies the update into the iOS project, then Clean Build Folder (⌘⇧K) + Play in Xcode. The `WebView loaded` line replaces the `WebView failed provisional navigation` in the log, and the shell renders slimelog.com in-app.

**Regression check:** Every time we add a third-party domain to the app (Stripe checkout, Google Maps embed, Instagram oEmbed, RevenueCat's paywall URLs, etc.), check whether the WebView needs to handle it directly or should open it externally. If in-app, add to `allowNavigation`. If external, do nothing (it opens in Safari automatically). Symptom to watch for: a link click leads to a black screen or opens Safari when we expect an in-app modal — that's an `allowNavigation` gap.

For the very first cold-launch check: Xcode console MUST show `WebView loaded` after `Loading app at https://slimelog.com`. If it shows `WebView failed provisional navigation`, the whitelist is misconfigured and Safari will grab the URL.

**Prevention pattern:** For any Capacitor Pattern B (remote-load) shell setup, `server.allowNavigation` is mandatory, not optional. Every domain the app expects to render in-app must be listed. This is a `should-be-in-Capacitor's-getting-started-doc` gotcha; file docs feedback with Ionic separately if we hit similar landmines with future plugin additions.

**Related:** #23 Capacitor packaging (tracker), 2026-07-17 Capacitor 8 UIScene deprecation warning (T163 filed).

---

### 2026-07-16 — Protective trigger silently reverts migration writes (DB + Ops)

**Symptom:** `supabase db push` on migration `20260716000076_brand_catalog_dedupe_and_expand.sql` failed at the second `SELECT _merge_brand(...)` call with `SQLSTATE 23503`: "update or delete on table 'brands' violates foreign key constraint 'slimes_brand_id_fkey' on table 'slimes'. Key (id)=(<peachybbbies uuid>) is still referenced from table 'slimes'." — but my `_merge_brand` function does `UPDATE slimes SET brand_id = keep WHERE brand_id = del` BEFORE the DELETE. The UPDATE should have reassigned every slime, leaving no references. Why did it fail?

**Root cause:** `slimes_protect_attribution` trigger (added by migration `20260706000053_audit_hp_11_lock_slime_attribution.sql`, security audit HP-11) fires BEFORE UPDATE on `public.slimes` and silently reverts any change to `brand_id` unless the caller is `service_role`. `supabase db push` connects as `postgres` role, NOT `service_role`. The trigger reverted my UPDATE with no error. Then DELETE FROM brands failed because slimes still pointed at the losing brand.

The migration was inside a `BEGIN ... COMMIT` block so the whole thing rolled back atomically — DB was back to pre-migration state, no drift, safe to re-run.

Two things made this hard to spot:
1. The trigger fires silently — no error, just no rows affected. My UPDATE returned success even though it reassigned zero rows.
2. Supabase's CLI reported the error as happening at the NEXT statement (Bleu Slimes SELECT, statement 3) even though the failing operation happened inside the Peachybbies SELECT (statement 2). Debugging the wrong statement wasted a minute.

**Fix:** two-part in the same migration.

(a) Broaden the `slimes_protect_attribution` function to bypass any role that isn't a normal end-user connection, matching the pattern from migration 59 (HP-8 profiles/brands trigger fix):

```sql
CREATE OR REPLACE FUNCTION public.slimes_protect_attribution()
RETURNS trigger LANGUAGE plpgsql
-- SECURITY DEFINER removed; INVOKER lets current_user reflect the actual caller
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  NEW.brand_id          := OLD.brand_id;
  NEW.is_brand_official := OLD.is_brand_official;
  RETURN NEW;
END; $$;
```

Same protection against creator-initiated brand-id hijacks (the HP-11 attack vector) but migration tooling, service_role admin scripts, and background workers all bypass.

(b) Rest of the migration (the actual dedupe work) then runs as before.

**Regression check:** any future migration that UPDATEs `slimes.brand_id` should work under `postgres` role now. Anti-regression query to verify the bypass shape:

```sql
select prosrc from pg_proc where proname = 'slimes_protect_attribution';
-- expect: current_user NOT IN ('authenticated', 'anon')
-- NOT: current_user = 'service_role'
```

**Prevention pattern: audit protective triggers before writing any migration that UPDATEs data.** SECURITY DEFINER triggers with narrow role bypasses (like the old HP-11 pattern) block migration tooling silently. Two-minute check that would have saved the failed apply:

```sh
# Any trigger that could revert my writes on tables I'm updating?
grep -rn "NEW\..*:=.*OLD\." supabase/migrations/*.sql
```

Any function that reassigns NEW-to-OLD is a protective trigger. Check its bypass clause. If it's `current_user = 'service_role'` (narrow), your migration will hit the same issue we did. Broaden it (in the same migration) OR temporarily disable the trigger via `ALTER TABLE ... DISABLE TRIGGER`.

**Also worth doing before any enum surgery / brand-catalog surgery / anything that touches multiple tables:** exhaustive grep for all FK-carrying tables. Migration `20260716000075_remove_clay_base_type.sql` had a similar-class failure the day before: it missed `drop_slimes.base_type` (added by migration 20260516000043 well after the initial schema). Prevention grep:

```sh
# For an enum-type sweep
grep -rn "<enum_name>" supabase/migrations/*.sql
# For a table-column sweep
grep -rn "references public\.<parent_table>" supabase/migrations/*.sql
```

**Related:** T152 clay removal Phase 1, T157 brand catalog dedupe (mig 076), migration 20260706000053 (original HP-11), migration 20260709000059 (HP-8 fix that established the broader-bypass pattern this rework belatedly applies to HP-11).

---

### 2026-07-15 — Multi-file feature commit stranded one file uncommitted (Ops)

**Symptom:** Vercel build failed on `feat(brevo)` push with `Type error: Object literal may only specify known properties, and 'heardFrom' does not exist in type '{ email: string; ... }'`. The failing line was `apps/web/app/api/waitlist/route.ts` calling `addContactToWaitlist({ heardFrom: ... })`, but that call had been committed WEEKS of session-time before this Vercel build attempt — no way TypeScript should have missed it.

**Root cause:** the "waitlist attribution capture" feature spanned 4 files that were staged in one `git add`, but only one commit intent — `git add A B C D && git commit -m ... && git push`. Somewhere in the sequence, `apps/web/lib/brevo.ts` (which added `heardFrom?: string` to the `addContactToWaitlist` param type) got dropped from the actual commit. When later work touched `apps/web/app/api/waitlist/route.ts` in unrelated commits (admin fixes, diagnostic logs), those commits DID pick up route.ts. So the deployed code had route.ts calling brevo.ts with an argument brevo.ts's TYPES didn't accept — because the type change was still uncommitted on disk. `git status` at the point of build showed `modified: apps/web/lib/brevo.ts` sitting there for hours, invisible to Vercel.

The migration file for the same feature had a related but different symptom: `git add supabase/migrations/... && git commit && git push` was intended, but the file appeared as `Untracked` in `git status` after the fact. Suggests the file existed in the outputs directory but not the git working tree at `git add` time, OR the user ran `npx supabase db push` (which applied the migration to Supabase without touching git) and never actually ran the `git add` half of the sequence. Either way — DB was ahead of git.

**Fix:** committed the stranded files in a follow-up push: `git add apps/web/lib/brevo.ts supabase/migrations/20260715000074_waitlist_source_tracking.sql docs/handoffs/... && git commit -m "feat(brevo): heardFrom param + commit migration + handoff briefs" && git push`. Vercel build immediately went green.

**Regression check:** after any multi-file feature push, run `git status` to confirm no `Changes not staged for commit` or `Untracked files` from the feature bundle. If either exists, they DIDN'T get pushed and Vercel will build against a partial state.

**Prevention patterns:**

1. **Before pushing a multi-file feature, always run `git status` at the end.** Any file listed under "Changes not staged" or "Untracked files" that's supposed to be part of the feature MUST be added before the push. Zero exceptions. This session hit the same pattern twice — once with brevo.ts, once with the migration file being untracked. Both would have been visible in a 2-second `git status` glance.

2. **Migration files require BOTH `git add` and `npx supabase db push`.** They live in the repo AND in Supabase. Applying one without the other creates the DB-ahead-of-git or git-ahead-of-DB drift class of bug. Habit: `git add supabase/migrations/...sql && git commit -m ... && git push && npx supabase db push`. All four in sequence.

3. **When TypeScript errors on a call site referencing a param that "should" exist**, check `git log <the-defining-file>` and confirm the defining commit actually landed. If the last commit on the file predates the feature you're building, the intermediate edits are stranded on disk.

**Related:** T149 waitlist attribution capture side quest, migration `20260715000074_waitlist_source_tracking.sql`. Same class as the migration-lag pattern below (2026-07-13 marketplace waitlist) — both involve source-of-truth drift between code and infrastructure.

---

### 2026-07-13 — Marketplace waitlist hydrate silent-fail when migration lags code (DB + UI)

**Symptom:** Jennifer reopened `/marketplace` after already claiming waitlist position #1 the night before. Instead of landing on the success state, the page showed the join form as if she'd never signed up.

**Root cause:** morning push included code that referenced `brand_names_other` (added in migration 0069) but the migration wasn't applied to the same environment. `SELECT ... brand_names_other ...` returned a PostgREST error, the position endpoint 500'd, and the client's hydrate useEffect silently fell back to form mode instead of surfacing the error. Same class of bug as the earlier brand-suggestions rate-limit 500 (fresh column referenced before migration applied).

**Fix:** both `GET /api/marketplace/waitlist/position` and `POST /api/marketplace/waitlist` now retry the SELECT/UPSERT with a legacy column set if the full-column variant errors. Users lose only the freeform "Other" chips until migration lands; everything else still hydrates. Warns to console on fallback so we notice.

**Regression check:** submit and hydrate should work with `brand_names_other` missing from the schema. Once migration 0069 is applied, full column set works and no warning fires.

**Prevention pattern:** when adding a column referenced from an already-live endpoint, prefer additive-safe SQL patterns:

1. **Best:** ship migration first, wait for it to apply everywhere, then push code that references the column. Boring but works.
2. **When #1 isn't possible:** add a fallback path in the code that tolerates the missing column. Cost is a warn log and a one-time slower request during the migration-lag window. Log the fallback loud enough that ops notices.

**Related:** T113 (Marketplace Coming Soon page), migration `20260712000069_marketplace_waitlist_other_brands.sql`. Similar to the earlier `brand-suggestions` fallback (see below).

---

### 2026-07-12 — Server action throws show generic Next error, not the friendly copy (UI)

**Symptom:** trying to log a slime with a profane name showed the user Next.js's stock server error page ("An error occurred in the Server Components render. The specific message is omitted in production builds..."), not the moderation copy "That word doesn't fit the vibe here."

**Root cause:** `logSlime()` and `updateSlimeLog()` in `apps/web/lib/slime-actions.ts` threw a plain `Error` on moderation failures. Next.js server-action error handling strips Error messages in production for security. The client's try/catch received an Error with a generic message and digest.

**Fix:** `logSlime` and `updateSlimeLog` now return a result union — `{ ok: true, ... } | { ok: false, error: string }` — for validation-class failures. A `ModerationValidationError` sentinel is caught at the top-level wrapper and folded into the result. Runtime errors (DB fail, auth) still throw as before. The client checks `result.ok` and surfaces `result.error` inline.

**Regression check:** try to log a slime with `slime_name: "cock"` in production. The inline error should read "That word doesn't fit the vibe here. Try another." — never the generic Next.js error page.

**Prevention pattern:** for user-facing validation, ALWAYS return a result object from server actions. Reserve `throw` for unexpected runtime failures the user shouldn't see verbatim anyway.

**Related:** T111, `apps/web/lib/slime-actions.ts`, `apps/web/app/log/page.tsx`.

---

### 2026-07-12 — Auth-gated loading skeleton stuck app-wide (UI + Perf)

**Symptom:** across `/settings`, `/settings/profile`, `/collection`, and other client pages, the pulsing loading skeleton stayed in front of the actual content indefinitely. No console errors, no failed network requests — just a hang. Fresh page load, DevTools showed ~40 `_rsc` prefetches pending.

**Root cause:** `AuthProvider` kept `loading = true` until BOTH `getSession()` AND `loadProfile()` had resolved. Every client page that gated its content on `useAuth().loading` sat on its skeleton until both finished. When the profile query hit backpressure (many concurrent `_rsc` prefetches saturating the network, or a slow Supabase response), the whole app appeared frozen even though the user was signed in and the session was live.

**Fix:** in `apps/web/components/AuthProvider.tsx`, decoupled the two:

- `setUser(...)` + `setLoading(false)` fires the moment `getSession()` returns (cookie read, effectively instant).
- `loadProfile()` runs fire-and-forget as a `hydrateProfile()` helper; when it lands, it just sets `profile`.
- `onAuthStateChange` follows the same rule: user first, unblock UI, profile in the background.
- 6-second failsafe stays as a hard backstop.

**Regression check:** after the fix, `useAuth().loading` should flip to false within ~100ms of page load. Pages gated on it render immediately. `profile` fields (username, avatar_url, subscription_tier, etc.) may briefly show as null until `loadProfile` returns; consumers should tolerate null gracefully.

**Prevention pattern:** any global provider that gates the app on multiple concerns should release the UI on the FASTEST necessary check and hydrate the rest in the background. Never make the whole tree wait on the slowest thing.

**Related:** T29, T104 (auth provider consolidation), T111.

---

### 2026-07-12 — Obscenity false positives on legitimate words (UI)

**Symptom:** a user tries to save a legitimate slime name, brand suggestion, comment, or username and hits "That word doesn't fit the vibe here. Try another." on text that reads clean.

**Root cause:** `obscenity` (the profanity library behind `lib/moderation.ts`) uses fuzzy matching with transformers (leet, spacing, mixed case) against the English dataset. It has a known non-zero false-positive rate — words like "scunthorpe" or substrings inside otherwise-clean text can trigger a hit.

**Fix:** add the offending phrase to `PROFANITY_WHITELIST` in `apps/web/lib/moderation.ts`. The list feeds `englishDataset.removePhrasesIf(...)` at module load, so the matcher rebuilds without that phrase. Entries are lowercase and must match `phrase.metadata.originalWord` exactly.

**Regression check:** the user's original input now saves without triggering the profanity branch. Other flagged words still get blocked.

**Prevention pattern:** favor allowlisting individual false-positives over disabling the matcher wholesale. If false positives pile up (say 5+ legit words hitting per week), escalate to swapping the English dataset for a hand-curated slime-focused list.

**Related:** T111 (content moderation).

---

### 2026-07-12 — Brand-suggestion "could not verify rate limit" 500s (DB)

**Symptom:** users trying to submit a brand via `/submit-brand` or the log-wizard fallback got a 500 with body `"Could not verify rate limit. Try again shortly."` — even first-time submitters who had never triggered any rate limit before.

**Root cause:** `POST /api/brand-suggestions` selected `profiles.approved_brand_suggestions_count` (a column added by migration `20260712000066_brand_scout_stats.sql`). Any error on that query — most commonly the column not existing yet in an environment where mig 66 hadn't been applied — 500'd the entire submission path. Non-existent-column errors return `status 400` from PostgREST, which fell into the `if (profileErr)` branch and returned a 500 to the user. First-time submitters with no scout history hit this before ever getting to the actual rate-limit count query.

**Fix:** on any error from that profile lookup, log a warning and default `approvedCount = 0` (the safe/strict cap) instead of 500ing the request. Submission continues normally under the 1/day cap. When migration 66 is applied, the query succeeds and the 5/day-for-approved-scouts logic kicks in seamlessly.

**Regression check:** with mig 66 unapplied, first submission still succeeds (up to 1/day). With mig 66 applied, an approved scout can submit up to 5/day.

**Prevention pattern:** when a code path depends on a fresh column, always degrade gracefully if the column read fails. Don't 500 core user flows on migration-lag.

**Related:** T110 (brand suggestion pipeline), migration `20260712000066_brand_scout_stats.sql`.

---

### 2026-07-11 — Log wizard brand auto-fill intermittent (UI + DB)

**Symptom:** Jennifer reported that in the log-slime wizard, the brand auto-fill dropdown "sometimes" didn't populate.

**Root causes (three bugs, one component):**

1. **Silent error swallowing.** `BrandSearchInput.fetchBrands` destructured `const { data } = await supabase...` and ignored `error`. Any failed query (network hiccup, PostgREST 400, expired session) presented as "no matches." Same class as the `name_raw` bug we just fixed — it went undetected until Jennifer spotted the 400s in her devtools.
2. **Race condition on rapid typing.** No stale-response guard. Typing "P → Pi → Pig" could fire three requests; if the "P" response arrived after "Pig", the older broader results overwrote the fresher narrow ones.
3. **URL prefill never linked `brand_id`.** Landing on `/log?brand=Cloud%20Nine` filled the text field but never looked up the catalog, so submissions saved with `brand_id=null` even when the brand existed. Anywhere that keys off `brand_id` (rollups, brand pages) missed the log.

**Fix:** all three in `apps/web/components/BrandSearchInput.tsx`.

- Added `requestIdRef` counter; only apply a response if its id still matches the latest request.
- Added `errored` state; failed queries surface a "brand search failed — keep typing and we'll retry" pill instead of empty silence. Console warns.
- Added one-shot prefill lookup via ref-gated useEffect: on mount, if `value` is populated and no catalog id is known, ILIKE the brand name once and emit the catalog id upstream.

**Regression check:**
- Type quickly in the brand field — no flicker of stale broader results.
- Deliberately break a query (mistype a column in devtools) — user sees the error pill, console logs a warning.
- Visit `/log?brand=Cloud%20Nine` — after page settles, submitting saves a log with `brand_id` populated (verify via `select brand_id from collection_logs order by created_at desc limit 1`).

**Prevention pattern (apply to future Supabase queries in components):**

- Always destructure both `{ data, error }`.
- On error: log with `console.warn` and either surface UI or fall back gracefully — never silently render empty.
- If the fetch depends on user input, add a request-id stale-check.

**Related:** log wizard, `/log?brand=` prefill from feed/leaderboard CTAs (T107 V1 uses this pattern).

---

### 2026-07-11 — Wrong column on brands query (`name_raw` vs `name`) (DB)

**Symptom:** every brand logo request from `/collection` (GalaxyView) and every catalog lookup on `/leaderboard` returned 400 Bad Request. Console flooded with:

```
GET .../rest/v1/brands?select=name_raw,logo_url&name_raw=ilike.Piggy%20Slimes 400
```

**Root cause:** the `brands` catalog table only has `name` and `slug`. The `name_raw` column lives on `collection_logs` (free-text fallback when a user logs a slime whose brand isn't in the catalog). The query was targeting `brands.name_raw`, which doesn't exist — PostgREST 400s any query referencing an unknown column.

**Fix:** replaced `name_raw` with `name` in three places:

- `apps/web/components/collection/GalaxyView.tsx` (T108 brand logo fetch)
- `apps/web/app/leaderboard/page.tsx` — `BrandCatalogRow` interface + both `.select()` / `.ilike()` sites (T107 V1)

**Regression check:** open DevTools → Network on `/collection` and `/leaderboard`. Brand-catalog requests should be 200, no 400s.

**Why this recurred:** we have TWO similarly-named columns across two tables — `collection_logs.brand_name_raw` (the user's free-text brand string) and `brands.name` (the canonical brand name). Easy to mistype "name_raw" when the write-up mentioned both.

**Prevention:** when adding a query against `brands`, cross-check the initial schema migration (`20260324000001_slimelog_initial_schema.sql`) — canonical column is `name`, always.

**Related:** T108 (brand logos in GalaxyView), T107 V1 (leaderboard)

---

### 2026-07-11 — Brand logo CORS on GalaxyView hubs (CORS / External)

**Symptom (if it hits):** brand logo images fail to render in `/collection`
Galaxy view; hub falls back to color puck silently. `<canvas>` may also
throw a security error if we later try to read pixels back.

**Root cause:** GalaxyView loads brand logos into `<img>` via
`crossOrigin="anonymous"` and paints them into a canvas. If Supabase
Storage isn't returning `Access-Control-Allow-Origin` for our web origin,
or if a brand's `logo_url` points to an external CDN that doesn't allow
CORS, the image won't paint. This is a passive issue: nothing breaks
today, but it caps how rich the galaxies can get.

**Prevention / fix path:**

1. Serve all brand logos from Supabase Storage (already the plan). Confirm
   the `brand-logos` bucket is public and has permissive CORS headers.
2. When we add a brand-claim upload flow, always pipe uploads through our
   own bucket; never store an external `logo_url` verbatim.
3. If we ever want to snapshot the galaxy to PNG for share cards, the
   canvas will be tainted the moment a non-CORS image lands. Snapshot
   would need to run server-side or refetch images with a proxy.

**Regression check:** open `/collection` on a browser DevTools Network tab.
Logo requests should be `status 200` with `access-control-allow-origin`
header matching our web origin. Failed CORS logs a warning in console
but is otherwise silent.

**Related:** T108 (brand logos in GalaxyView hubs)

---

## Fixed / resolved

*(entries move here after the fix ships and a week passes without recurrence)*
