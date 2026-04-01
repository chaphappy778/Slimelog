# SlimeLog Brand Dashboard — Integration Guide

## What's in this build

```
app/brand-dashboard/
  page.tsx                          Root: redirects to slug or shows brand picker
  [slug]/
    page.tsx                        Overview — 5 stat cards + 4 chart rows
    slimes/page.tsx                 Slimes — desktop split panel + mobile sheet
    drops/page.tsx                  Drops — desktop split panel + mobile sheet
    analytics/page.tsx              Analytics — Pro-gated full analytics + table + export
    settings/page.tsx               Settings — wrapped in DashboardLayout

components/
  BottomNavWrapper.tsx              Updated: hides on /brand-dashboard/* routes
  dashboard/
    DashboardLayout.tsx             Sidebar (240px desktop) + mobile tab bar + radial glow bg
    BrandSettingsForm.tsx           Brand profile form — grouped Identity / Links / Details
    ProGate.tsx                     Blur + lock overlay for non-verified brands
    SlimesSplitPanel.tsx            Slime list + detail/add/edit panel — mobile sheet included
    DropsSplitPanel.tsx             Drop list + detail/create panel — mobile sheet included
    charts/
      LogsOverTimeChart.tsx         Area chart — 7D/30D/90D toggle, green gradient fill
      RatingsRadarChart.tsx         Radar chart — 6 dimensions averaged across official slimes
      TopSlimesChart.tsx            Horizontal bar chart — top 5 by logs, green-to-cyan gradient bars
      DropPerformanceChart.tsx      Vertical bar chart — logs per drop, cyan bars
```

---

## 1. Install dependencies

```bash
npm install recharts
```

Recharts is the only new dependency. All charts are `'use client'` components — no SSR issues.

---

## 2. Add fonts

In `app/layout.tsx`, import Montserrat and Inter from Google Fonts:

```tsx
import { Montserrat, Inter } from 'next/font/google'

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  weight: ['400', '600', '700', '800'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
})

// On <html>:
<html className={`${montserrat.variable} ${inter.variable}`}>
```

Then in `tailwind.config.ts`:

```ts
theme: {
  extend: {
    fontFamily: {
      montserrat: ['var(--font-montserrat)', 'sans-serif'],
      inter: ['var(--font-inter)', 'sans-serif'],
    },
  },
},
```

> The dashboard components use inline `fontFamily` style props (`'Montserrat, sans-serif'` and `'Inter, sans-serif'`) so fonts will fall back gracefully even without Tailwind config. The Next.js font setup above ensures they load from the CDN.

---

## 3. Replace DashboardNav

Delete `components/dashboard/DashboardNav.tsx`. It is fully replaced by `DashboardLayout.tsx`.

Update every existing page that imported `DashboardNav` to import `DashboardLayout` instead, passing the `brand` object and `active` prop.

---

## 4. Update BottomNavWrapper

Replace the existing `components/BottomNavWrapper.tsx` with the version in this build. The key change:

```tsx
// Before
const hideRoutes = ["/login", "/signup", "/landing", "/waitlist"];

// After — uses startsWith to catch all /brand-dashboard/* dynamic segments
if (pathname.startsWith("/brand-dashboard")) return null;
```

---

## 5. Auth pattern (same as before)

Every server component follows this pattern:

```ts
const supabase = await createClient();
const {
  data: { user },
} = await supabase.auth.getUser();
if (!user) redirect("/auth/login");

const { data: brand } = await supabase
  .from("brands")
  .select("...")
  .eq("slug", slug)
  .eq("owner_id", user.id) // security: only owner can access
  .single();

if (!brand) redirect("/brands");
```

---

## 6. Database views required

The Overview and Analytics pages query two Supabase views:

| View                | Columns used                                                                         |
| ------------------- | ------------------------------------------------------------------------------------ |
| `brand_weekly_logs` | `brand_id`, `week`, `log_count`                                                      |
| `brand_top_slimes`  | `brand_id`, `id`, `name`, `slime_type`, `avg_overall`, `total_ratings`, `total_logs` |

These are referenced in the original schema card. If they don't exist yet, the queries will fail gracefully (returning empty arrays), and all charts will show their empty states.

---

## 7. Pro / Verified gating

`verification_tier` values that unlock Pro features: `'verified'` or `'partner'`.

The Analytics page wraps its entire content in `<ProGate isPro={isPro}>`. Community and Claimed brands see a blur overlay with an upgrade CTA.

The sidebar shows a `PRO` badge on the Analytics nav item for non-verified brands.

---

## 8. Mobile behavior

- **Below `md` (768px):** Sidebar is hidden. A horizontal scrollable tab bar appears at the top.
- **Slimes + Drops pages:** The right split panel is `hidden md:flex`. A fixed bottom sheet slides up on mobile when a slime/drop is tapped or the add button is pressed.
- **Overview:** Charts render on all screen sizes. A notice at the bottom of mobile overview says "Visit slimelog.com on desktop for full analytics."

---

## 9. Known placeholders

- **Drop performance log counts** — `dropPerformanceData` maps drops with `log_count: 0`. This needs a real JOIN or a view that aggregates `collection_logs` per drop. Replace when that view exists.
- **Rating trend chart (Analytics)** — Shows "Coming Soon" state. Requires a time-series view of `avg_overall` per week per brand.
- **Follower growth chart (Analytics)** — Shows "Coming Soon" state. Requires a historical follower count table.
- **CSV export buttons** — Rendered but not wired. Implement with Supabase `.csv()` response format or a server action.
- **Image upload** — Slimes form includes a retail price / colors / scent but not the `ImageUpload` component, as that component is internal to your codebase. Add it to the Add/Edit form where indicated.
