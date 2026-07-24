# Lint Triage — 112 pre-existing problems (2026-07-23)

**Ticket:** T199. **Enabled by:** T197 (made `npm run lint` runnable again after Next 16 removed `next lint`).

**Source of truth:** `cd apps/web && npm run lint`
**Snapshot:** 112 problems (85 errors, 27 warnings) at commit `1d90ee6`.
**Config:** `apps/web/eslint.config.mjs`, flat config, extends `next/core-web-vitals` only. `next/typescript` is NOT enabled — this matters a lot for cluster 3 below.

**Nothing in this batch was fixed.** This document is the triage so the fixes can be prioritized.

---

## Headline

There is **one genuinely scary item** and a handful of small real bugs. The other ~95 problems are either false positives from the new React Compiler rule set in `eslint-plugin-react-hooks` v6, or cosmetic.

The single most important context for whoever picks up the fix batches: **most of the 27 `set-state-in-effect` errors are flagging code we deliberately wrote to fix hydration bugs** (T191 / Sentry `81b58fcb`, Sentry `SLIMELOG-1`). Naively "fixing" them would re-open closed Sentry issues. Read the comment above each effect before touching it.

---

## Cluster table

| # | Rule | Err | Warn | Total | Risk | Est. | One-line verdict |
| --- | --- | ---: | ---: | ---: | --- | --- | --- |
| 1 | `react-hooks/refs` | 36 | 0 | 36 | **MEDIUM** | 2–3h | ~4 real render-staleness bugs, ~32 false positives from refs passed as props. |
| 2 | `react-hooks/set-state-in-effect` | 27 | 0 | 27 | **LOW** | 3–4h to refactor, 15m to scope-down | Almost all deliberate mount-gates / prop-resyncs. Refactoring risks regressing fixed hydration bugs. |
| 3 | Unused `eslint-disable` directive | 0 | 20 | 20 | **LOW (trap)** | 30m | 11 of these are only "unused" because `next/typescript` is off. Deleting them is the wrong fix. |
| 4 | `react-hooks/purity` | 12 | 0 | 12 | **LOW** | 1h | 10 of 12 are `Date.now()` in **server** components, which is fine. 2 are in a client component. |
| 5 | `react/no-unescaped-entities` | 9 | 0 | 9 | **LOW** | 20m | Raw `'` and `"` in JSX text. 6 of 9 are admin-only surfaces. Purely cosmetic. |
| 6 | `@next/next/no-img-element` | 0 | 4 | 4 | **MEDIUM** | 1–2h | Raw `<img>` on user-uploaded Supabase Storage URLs. Bandwidth + LCP cost, not correctness. |
| 7 | `react-hooks/exhaustive-deps` | 0 | 2 | 2 | **MEDIUM** | 10m | Missing dep on a **marketing-consent** flag. Guarded in practice, but consent data. |
| 8 | `react-hooks/immutability` | 1 | 0 | 1 | **LOW** | 5m | False positive: setting `.value` on a DOM node reached through a prop ref. |
| 9 | `jsx-a11y/role-has-required-aria-props` | 0 | 1 | 1 | **LOW-MED** | 10m | `role="combobox"` without `aria-controls` on the slime search input. |
|   | **Total** | **85** | **27** | **112** |  | **~9–12h** |  |

---

## Fix before launch

Short list. Everything else can wait for a post-launch cleanup batch.

### 1. HIGH — `app/log/page.tsx:247`

```tsx
if (typeof window !== "undefined" && !userIdFetchedRef.current) {
  userIdFetchedRef.current = true;
  const supabase = createClient();
  supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
}
```

**What could go wrong:** a network auth call is fired from the render body, guarded only by a ref. A render that React discards (concurrent rendering, Suspense retry, StrictMode) still fires the request and still calls `setUserId` — and because the ref latch is already flipped, the retained render never re-fires it, so `userId` can end up permanently `null` on the log flow. A null `userId` on the log page is the difference between a log saving and silently not saving.

**Also:** this directly violates the CLAUDE.md rule "Never call `getUser()` from client code — use `useAuth()` from `AuthProvider`." The fix is not a lint suppression, it is deleting this block and reading `user.id` off `useAuth()`. This is the one item that should land this sprint, before T139 / RevenueCat, because the log flow is the core loop.

### 2. MEDIUM — `components/collection/TimelineView.tsx:361`

```tsx
{!animDone.current && sortedLogs.length > 0 && ( /* progress indicator */ )}
```

**What could go wrong:** render branches on a ref. Mutating `animDone.current` does not schedule a re-render, so the "animating" progress indicator stays on screen after the timeline animation finishes until some unrelated state change re-renders the component. Visible stale UI on My Shelf.

### 3. MEDIUM — `components/notifications/NotificationsFeed.tsx:201`

```tsx
const refreshRef = useRef(refreshList);
refreshRef.current = refreshList;   // written during render
```

**What could go wrong:** the "latest ref" pattern written in the render body rather than an effect. A discarded render can publish a `refreshList` closure that was never committed, so the 30s auto-poll (T169) can call into a stale render's state setters. Low frequency, hard to reproduce, but this is the notification poller and it runs on every page.

### 4. MEDIUM — `app/welcome/page.tsx:358` and `:382`

`handleFinish` and `handleSkip` are `useCallback`s that read `showMarketingConsent` but do not list it as a dependency.

**What could go wrong:** `showMarketingConsent` is set in a mount effect once auth resolves. If a callback is memoized before that effect runs and no other dep changes, an OAuth signup submits **without** `marketing_consent` and the opt-in is silently dropped. In practice `username` is also a dep and changes on every keystroke, so the button cannot be enabled without re-memoizing. Guarded today, but it is consent data and the guard is incidental, not intentional. Cheap fix: add the dep.

### 5. LOW-MED — `components/collection/GalaxyView.tsx:827`, `components/collection/SpiralView.tsx:627`

```tsx
cursor: dragging.current ? "grabbing" : "grab"
```

**What could go wrong:** same class as #2. The grab/grabbing cursor never actually changes, because mutating `dragging.current` does not re-render. Cosmetic only, but these are the two showcase shelf views.

### 6. LOW — `components/SlimeMenu.tsx:58`

The `// eslint-disable-next-line @next/next/no-img-element` sits above `return (` on line 59, one line short of the `<img>` on line 60. Result: it produces both an unused-directive warning **and** the warning it was meant to suppress. Two of the 112 come from one misplaced comment.

---

## Cluster detail

### 1. `react-hooks/refs` — 36 errors

New React Compiler rule: reading or writing `ref.current` during render.

By file: `components/brand/ClaimBrandForm.tsx` ×16, `components/collection/TimelineView.tsx` ×8, `components/dashboard/BrandImageryEditor.tsx` ×6, `app/log/page.tsx` ×2, then one each in `GalaxyView`, `SpiralView`, `BrandSettingsForm`, `NotificationsFeed`.

**False positives (~32).** The `ClaimBrandForm` ×16 are all `props.fileInputRef.current?.click()` inside `onClick` handlers. That is correct React — the access is deferred to an event — the rule just cannot see through the props boundary. Same story for `BrandImageryEditor` and `BrandSettingsForm`, which read `original.current` during render to compute `hasChanges` / "Unsaved" pills. `original` is a `useRef` initialised once and never mutated, so it is effectively a constant.

**Real (~4).** Items 2, 3, 5 in the fix-before-launch list, plus the `app/log/page.tsx` pair (item 1).

**Suggested approach:** do not blanket-suppress. Fix the 4 real ones, then decide whether to suppress per-file or teach the rule via `useSyncExternalStore` / state for the two cursor cases.

### 2. `react-hooks/set-state-in-effect` — 27 errors

Every one of the 27 was inspected. They fall into four benign patterns:

- **Mount gates** (`setMounted(true)` in a `[]` effect) — `FormattedDropDate`, `SlimeMenu`, `LeaderboardClient`, `FeedListClient`. These exist *specifically* to fix SSR/client timezone hydration mismatches. `FormattedDropDate` cites Sentry `SLIMELOG-1`; `FeedListClient` cites Sentry `81b58fcb` / T191. **Do not refactor these away.**
- **Prop resync** — `ReactionRow`, `LikeButton`, `FeedListClient:356`, `TimelineView`. `LikeButton` even carries a comment explaining a previous dep-array fix. Leave alone.
- **Async data fetch** — `SlimeMenu:189`, `collection/page.tsx:546`, `SlimeDetailCard`, `BrandVariantPicker`, `SearchTypeaheadDropdown`, `search/page.tsx:708`, `NotificationsFeed:191`, `ClaimDocumentPreview`. Setting state from a fetch resolution is the intended pattern; the rule flags the synchronous reset branch at the top of the effect.
- **Query/param resync** — `search/page.tsx:1067`, `SlimeSearchInput`, `guide/ExpandableSection`, `welcome/page.tsx:242`, `settings/page.tsx:152`.

**No infinite-render risk found.** No effect in the set writes state that appears in its own dependency array.

**Recommendation:** downgrade this rule to `warn` in `eslint.config.mjs` rather than spending 3–4 hours refactoring working, comment-documented code. That single config line clears 27 of the 85 errors and keeps the signal for new code. Revisit if/when the React Compiler is actually turned on.

### 3. Unused `eslint-disable` directives — 20 warnings

**This is a trap. Do not run `--fix` on this cluster.** Breakdown:

- **11 × `@typescript-eslint/no-explicit-any`** (`app/discover/keyword/[name]/page.tsx` ×3, `app/users/[username]/followers` ×2, `.../following` ×2, `app/log/edit/[id]/page.tsx`, `app/search/page.tsx`, `components/discover/SearchTypeaheadDropdown.tsx`, `lib/rate-limit.ts`). These report as unused **only because `next/typescript` is not in the flat config**, so the rule they suppress is not running. Deleting them means every one of those `any` casts becomes an error the moment TypeScript lint rules get enabled. Correct fix: leave them, and decide separately whether to add `next/typescript` (which will surface a fresh wave of `no-explicit-any` errors, so that is its own ticket).
- **5 × `@next/next/no-img-element`** — 4 in `opengraph-image.tsx` files (the rule genuinely does not apply to Satori `ImageResponse` JSX), safe to delete. 1 in `SlimeMenu.tsx` is misplaced by one line, see fix item 6.
- **4 × `react-hooks/exhaustive-deps`** (`app/settings/profile/page.tsx`, `SlimeDetailCard`, `TimelineView`, `FeedListClient`) — genuinely stale. `eslint-plugin-react-hooks` v6 relaxed `exhaustive-deps` and these no longer fire. Safe to delete.

Net: 9 of 20 are safe deletions, 11 should stay.

### 4. `react-hooks/purity` — 12 errors

All 12 are `Date.now()` / `new Date()` / `Math.random()` called during render.

**10 are in server components** (`app/admin/page.tsx` ×2, `app/brand-dashboard/[slug]/page.tsx`, `app/brands/[slug]/page.tsx`, `app/brands/page.tsx`, `app/collection/aging/page.tsx`, `app/collection/care/page.tsx` ×2, `app/page.tsx`, `app/slimes/[id]/page.tsx`). A server component renders once per request; there is no client re-render to mismatch against. This is ordinary Next.js App Router code and the rule has no concept of the server/client boundary. **False positives.** `app/brands/page.tsx:121` uses `Math.random()` to pick the featured brand, which is intentional rotation.

**2 are in a client component** — `app/collection/page.tsx:520` and `:523` compute `weeksActive` from `Date.now()` during render on `"use client"` My Shelf. Worth cleaning up (the value can drift between server HTML and first client render), but the derived value is a week count, so a mismatch requires the render to straddle a week boundary. Low practical risk, real in principle.

### 5. `react/no-unescaped-entities` — 9 errors

Raw `'` / `"` in JSX text. `BrandSuggestionRow` ×2, `VariantSuggestionRow` ×2, `ProCarePaywall` ×2, `brand-claims/[id]/page.tsx`, `submit-brand/page.tsx`, `SubmitBrandForm`.

Mechanical: swap for `&apos;` / `&quot;` / `&ldquo;`. **Do not reword the copy while fixing** — three of these are user-facing (`ProCarePaywall`, `submit-brand`, `SubmitBrandForm`) and the voice rules apply. No em-dashes may be introduced.

### 6. `@next/next/no-img-element` — 4 warnings

`SlimeMenu.tsx:60` (user avatar), `DashboardLayout.tsx:142` (brand logo), `DropsSplitPanel.tsx:1580`, `SlimesManager.tsx:240` (slime image). All four are **user-uploaded Supabase Storage URLs**, served unoptimized and unresized.

Not a correctness bug, but a real cost and LCP item: every avatar and brand logo ships full-resolution. Converting to `next/image` needs `images.remotePatterns` for the Supabase Storage host in `next.config.js`. Worth a line in `docs/cost-tracker.md` when it lands, since this scales directly with user count.

### 7. `react-hooks/exhaustive-deps` — 2 warnings

Both in `app/welcome/page.tsx`. See fix item 4. Only two warnings in the entire codebase from this rule, which is a good sign — v6's relaxed `exhaustive-deps` plus the existing suppressions account for the rest.

### 8. `react-hooks/immutability` — 1 error

`components/brand/ClaimBrandForm.tsx:712` — `props.fileInputRef.current.value = ""` inside an onClick. The rule treats props as immutable and objects to the assignment. Clearing a file input through its ref is correct DOM handling. **False positive.**

### 9. `jsx-a11y/role-has-required-aria-props` — 1 warning

`components/log/SlimeSearchInput.tsx:255` — `role="combobox"` with `aria-expanded` and `aria-autocomplete` but no `aria-controls` pointing at the results listbox. Real a11y gap on the primary log flow, roughly a 10-minute fix (add an `id` to the dropdown, reference it).

---

## Recommended attack order

Split by risk tier, do not do this as one batch. The clusters have very different review needs and lumping them makes the diff unreviewable.

**Batch A — real bugs (~1.5h, this sprint, before T139 / RevenueCat).**
Fix items 1 through 6 in the "Fix before launch" list. Six targeted changes, seven files, each independently reviewable. Item 1 alone justifies the batch.

**Batch B — config decisions (~45m, no code changes).**
1. Downgrade `react-hooks/set-state-in-effect` to `warn` with a comment explaining why (clears 27 errors).
2. Delete the 9 genuinely-stale `eslint-disable` directives; leave the 11 `no-explicit-any` ones.
3. Open a separate ticket for "add `next/typescript` to the flat config" and size the fallout first.
After A and B the error count drops from 85 to roughly 20.

**Batch C — cosmetic sweep (~30m).**
The 9 `no-unescaped-entities` plus the `aria-controls` fix. Mechanical, safe, easy review. Watch the voice rules on the three user-facing files.

**Batch D — post-launch (~3h).**
`next/image` migration for the 4 raw `<img>` tags (needs `remotePatterns` config plus a cost-tracker entry), the remaining `react-hooks/refs` false positives, and the 2 client-side `purity` items in `app/collection/page.tsx`.

**Not recommended:** a single "fix all 112" batch. Roughly 85 percent of the findings are false positives or deliberate, well-commented hydration fixes, so a bulk pass would produce a huge diff with a real chance of regressing closed Sentry issues while burying the one change that actually matters.

---

## Prevention note

Once Batch A and B land, the remaining count is small enough to gate on. Consider adding `npm run lint` to the pre-commit hook or CI at that point (deferred from T197) so the count cannot drift back up.
