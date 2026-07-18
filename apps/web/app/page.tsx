// apps/web/app/page.tsx
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import FeedTabs from "@/components/FeedTabs";
import { type FeedCardLog } from "@/components/FeedCard";
import PageHeader from "@/components/PageHeader";
import PageWrapper from "@/components/PageWrapper";
import OnboardingGate from "@/components/onboarding/OnboardingGate";
// Feed rework batch 1 (2026-07-11): community stats hero.
import CommunityStatsHero, {
  type CommunityStats,
} from "@/components/feed/CommunityStatsHero";
// Feed rework batch 3 (2026-07-11): client wrapper that renders the
// density toggle + day-bucket dividers + card list. Manages its own
// localStorage-backed density state.
import FeedListClient from "@/components/feed/FeedListClient";
// T177 (2026-07-17): shared helpers used by both this SSR page and the
// /api/feed Load More route. Keeps the query shape + FeedCardLog
// assembly in one place so the two paths cannot drift.
import { fetchCommunityFeed, fetchFollowingFeed } from "@/lib/feed";

// T177 (2026-07-17): initial page size for the server-rendered feed.
// The old code was hard-capped at .limit(100) as a stopgap after a
// tester's day of activity already truncated the 20-row limit. With
// cursor-based Load More now landed we drop back to a healthy 50 for
// the initial paint — the button covers the rest.
const INITIAL_PAGE_SIZE = 50;

// (Day-bucket dividers + density toggle now live in the client
// component <FeedListClient>. Feed rework batches 2 + 3, 2026-07-11.)

// ─── Empty states ──────────────────────────────────────────────────────────────

function EmptyFeed() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center bg-slime-surface border border-slime-border"
        aria-hidden="true"
      >
        <svg
          width="36"
          height="36"
          viewBox="0 0 36 36"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="18"
            cy="18"
            r="14"
            stroke="#39FF14"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            opacity="0.4"
          />
          <circle
            cx="18"
            cy="18"
            r="7"
            fill="rgba(57,255,20,0.12)"
            stroke="#39FF14"
            strokeWidth="1"
          />
        </svg>
      </div>
      <p className="text-slime-text font-semibold">No logs yet</p>
      <p className="text-sm text-slime-muted max-w-xs">
        Be the first to log a slime and get this feed poppin&apos;.
      </p>
    </div>
  );
}

function EmptyFollowingFeed() {
  // Feed rework batch 2 (2026-07-11): geometric-only empty state.
  // Blob + concentric dashed rings + line sparkles, all built inline
  // with SVG (no AI art). Copy locked with user 2026-07-11.
  return (
    <div className="flex flex-col items-center justify-center pt-14 pb-10 gap-3 text-center">
      <div className="relative w-40 h-40 flex items-center justify-center">
        {/* Dashed ring — outer */}
        <div
          aria-hidden="true"
          className="absolute rounded-full"
          style={{
            width: 160,
            height: 160,
            border: "1px dashed rgba(0,240,255,0.25)",
          }}
        />
        {/* Dashed ring — inner */}
        <div
          aria-hidden="true"
          className="absolute rounded-full"
          style={{
            width: 112,
            height: 112,
            border: "1px dashed rgba(0,240,255,0.35)",
          }}
        />
        {/* Blob */}
        <svg
          width="96"
          height="96"
          viewBox="0 0 150 150"
          fill="none"
          aria-hidden="true"
          style={{ filter: "drop-shadow(0 0 20px rgba(204,68,255,0.4))" }}
        >
          <defs>
            <linearGradient id="emptyBlob" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#CC44FF" />
              <stop offset="1" stopColor="#00F0FF" />
            </linearGradient>
          </defs>
          <path
            fill="url(#emptyBlob)"
            d="M62 20 C94 10 134 26 138 62 C142 96 118 130 82 133 C46 136 16 116 15 80 C14 50 32 28 62 20 Z"
          />
        </svg>
        {/* Line sparkles */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#00F0FF"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
          className="absolute"
          style={{ left: 18, top: 22 }}
        >
          <path d="M12 3v18M3 12h18" />
        </svg>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#39FF14"
          strokeWidth="2.4"
          strokeLinecap="round"
          aria-hidden="true"
          className="absolute"
          style={{ right: 20, bottom: 26 }}
        >
          <path d="M12 4v16M4 12h16" />
        </svg>
      </div>
      <h3
        className="text-[22px] font-black tracking-tight text-white mt-3"
        style={{
          fontFamily: "Montserrat, sans-serif",
          letterSpacing: "-0.01em",
        }}
      >
        Nobody&apos;s logging yet
      </h3>
      <p className="text-sm text-slime-muted max-w-[280px] leading-snug">
        When people you follow log a slime, it shows up here.
      </p>
      <Link
        href="/discover"
        className="mt-4 inline-flex items-center gap-1 px-6 py-3 rounded-2xl text-sm font-black"
        style={{
          background: "linear-gradient(135deg, #39FF14, #00F0FF)",
          color: "#0A0A0A",
          fontFamily: "Montserrat, sans-serif",
        }}
      >
        Find slimers to follow
      </Link>
    </div>
  );
}

function LoginPrompt() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center px-6">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center bg-slime-surface border border-slime-border"
        aria-hidden="true"
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <p className="text-slime-text font-semibold">
        Sign in to see your Following feed
      </p>
      <p className="text-sm text-slime-muted max-w-xs">
        Log in to follow slimers and see their latest ratings here.
      </p>
      <Link
        href="/login"
        className="mt-1 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-slime-bg shadow-glow-green"
        style={{ background: "linear-gradient(135deg, #39FF14, #00F0FF)" }}
      >
        Sign in
      </Link>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = tab === "following" ? "following" : "community";

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  // [Preserved — DO NOT MODIFY] Logged-out users redirect to /landing.
  if (!isLoggedIn) {
    redirect("/landing");
  }

  // ─── Feed pages ────────────────────────────────────────────────────────────
  // T177 (2026-07-17): the community + following queries + FeedCardLog
  // assembly live in `lib/feed.ts` now. Both this SSR path and the
  // /api/feed Load More route call the same helpers.

  let displayLogs: FeedCardLog[] = [];
  let displayError = false;
  let brandSlugMap: Record<string, string> = {};
  let brandLogoMap: Record<string, string> = {};
  let hasMore = false;

  if (activeTab === "community") {
    try {
      const page = await fetchCommunityFeed(supabase, {
        userId: user?.id ?? null,
        limit: INITIAL_PAGE_SIZE,
      });
      displayLogs = page.logs;
      brandSlugMap = page.brandSlugMap;
      brandLogoMap = page.brandLogoMap;
      hasMore = page.hasMore;
    } catch {
      displayError = true;
    }
  } else if (activeTab === "following" && user) {
    const { data: followRows, error: followsErr } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);

    if (followsErr) {
      displayError = true;
    } else {
      const followingIds = (followRows ?? []).map(
        (r) => r.following_id as string,
      );

      try {
        const page = await fetchFollowingFeed(supabase, {
          userId: user.id,
          followingIds,
          limit: INITIAL_PAGE_SIZE,
        });
        displayLogs = page.logs;
        brandSlugMap = page.brandSlugMap;
        brandLogoMap = page.brandLogoMap;
        hasMore = page.hasMore;
      } catch {
        displayError = true;
      }
    }
  }

  // ─── Community stats (feed rework batch 1) ────────────────────────────────
  //
  // Four counts feed the top-of-feed hero. All four fire in parallel with
  // { count: "exact", head: true } so we get row counts without pulling
  // any actual rows. is_public filter on collection_logs matches what the
  // feed shows publicly. sevenDaysAgo is UTC ISO — matches how
  // created_at is stored.
  const sevenDaysAgoIso = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [
    slimersAllTimeRes,
    slimersThisWeekRes,
    slimesAllTimeRes,
    slimesThisWeekRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgoIso),
    supabase
      .from("collection_logs")
      .select("id", { count: "exact", head: true })
      .eq("is_public", true),
    supabase
      .from("collection_logs")
      .select("id", { count: "exact", head: true })
      .eq("is_public", true)
      .gte("created_at", sevenDaysAgoIso),
  ]);

  const stats: CommunityStats = {
    slimersAllTime: slimersAllTimeRes.count ?? 0,
    slimersThisWeek: slimersThisWeekRes.count ?? 0,
    slimesAllTime: slimesAllTimeRes.count ?? 0,
    slimesThisWeek: slimesThisWeekRes.count ?? 0,
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <PageWrapper dots glow="cyan">
      <PageHeader />
      {/* First-login walkthrough — client-side gated by
          profiles.onboarding_completed_at. Renders nothing for repeat
          visitors. */}
      <OnboardingGate />

      <div className="pt-14">
        {/* Feed rework batch 1 (2026-07-11): community stats hero sits
            above the feed tabs. The previous "Community Feed / What the
            community is logging" section-label block was removed since
            the hero + the renamed "For you"/"Following" tabs carry the
            page framing on their own. */}
        <div className="px-4 pt-6 pb-4">
          <CommunityStatsHero stats={stats} />
        </div>

        <div className="px-4 pb-4">
          <FeedTabs activeTab={activeTab} isLoggedIn={isLoggedIn} />
        </div>

        <section className="px-4 pb-24">
          {activeTab === "following" && !isLoggedIn ? (
            <LoginPrompt />
          ) : (
            <>
              {displayError && (
                <div className="mb-4 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                  Couldn&apos;t load the feed right now — try refreshing.
                </div>
              )}
              {displayLogs.length === 0 && !displayError ? (
                activeTab === "following" ? (
                  <EmptyFollowingFeed />
                ) : (
                  <EmptyFeed />
                )
              ) : (
                // Feed rework batches 2 + 3 (2026-07-11): FeedListClient
                // owns the density state and renders either photo-hero
                // (Card A, default) or compact list (Card C) with the
                // same day-bucket dividers around both.
                <FeedListClient
                  logs={displayLogs}
                  brandSlugMap={brandSlugMap}
                  brandLogoMap={brandLogoMap}
                  currentUserId={user?.id ?? null}
                  activeTab={activeTab}
                  hasMore={hasMore}
                />
              )}
            </>
          )}
        </section>
      </div>
    </PageWrapper>
  );
}
