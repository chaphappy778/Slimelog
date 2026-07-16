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

## Known potential issues (not-yet-hit, worth watching)

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
