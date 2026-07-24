// apps/web/app/discover/keyword/[name]/page.tsx
// [T74-B] Keyword detail page — public logs tagged with a given keyword
// [T33a 2026-07-13] Redesigned per Design's Discover results pack.
// Cyan Montserrat 900 44px `#tag` hero title, "N logs tagged with
// #tag in the community" sub, `TypeLogsClient` renders the sort tabs
// + log cards + empty CTA. No subtype chip row here (base type is
// unset for the keyword surface). Related-keywords row deferred to
// T33e.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import PageWrapper from "@/components/PageWrapper";
import TypeLogsClient from "@/components/discover/TypeLogsClient";
import type { DiscoverLog } from "@/app/discover/type/[base_type]/page";

interface PageProps {
  params: Promise<{ name: string }>;
}

export default async function KeywordDetailPage({ params }: PageProps) {
  const { name } = await params;
  const tagName = decodeURIComponent(name);

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } },
  );

  const { data: tag } = await supabase
    .from("tags")
    .select("id, name, use_count")
    .eq("name", tagName.toLowerCase())
    .maybeSingle();

  if (!tag) notFound();

  const { data: logTagRows } = await supabase
    .from("log_tags")
    .select(
      `
      log:collection_logs(
        id, slime_name, brand_name_raw, base_type, subtype_id, colors,
        image_url, rating_overall, created_at, is_public,
        subtype:subtypes(name),
        user:profiles_public(username, avatar_url)
      )
    `,
    )
    .eq("tag_id", tag.id)
    .limit(50);

  const logs: DiscoverLog[] = (logTagRows ?? [])
    // KEEP: latent (T199 A3, needs next/typescript in flat config)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((row: any) => row.log)
    // KEEP: latent (T199 A3, needs next/typescript in flat config)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((l: any) => l && l.is_public)
    // KEEP: latent (T199 A3, needs next/typescript in flat config)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((l: any) => ({
      id: l.id,
      slime_name: l.slime_name,
      brand_name_raw: l.brand_name_raw,
      base_type: l.base_type,
      subtype_name: Array.isArray(l.subtype)
        ? (l.subtype[0]?.name ?? null)
        : (l.subtype?.name ?? null),
      colors: l.colors,
      image_url: l.image_url,
      rating_overall: l.rating_overall,
      created_at: l.created_at,
      username: Array.isArray(l.user)
        ? (l.user[0]?.username ?? null)
        : (l.user?.username ?? null),
      avatar_url: Array.isArray(l.user)
        ? (l.user[0]?.avatar_url ?? null)
        : (l.user?.avatar_url ?? null),
    }));

  const logCount = logs.length;

  return (
    <PageWrapper dots glow="cyan" orbs>
      <PageHeader />
      <main className="pt-14 pb-24">
        {/* Back link */}
        <div className="px-4 pt-4 mb-3">
          <Link
            href="/discover/keyword"
            className="inline-flex items-center gap-2 text-[15px]"
            style={{ color: "rgba(245,245,245,0.55)" }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
            Back to keywords
          </Link>
        </div>

        {/* Header — big cyan `#tag` title + count sub */}
        <div className="px-4 mb-6">
          <h1
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 900,
              fontSize: 44,
              color: "#00F0FF",
              lineHeight: 0.95,
              letterSpacing: "-0.01em",
              margin: 0,
              textShadow: "0 0 22px rgba(0,240,255,0.4)",
            }}
          >
            #{tag.name}
          </h1>
          <p
            className="mt-2"
            style={{
              fontSize: 15,
              color: "rgba(245,245,245,0.7)",
              fontWeight: 600,
              margin: 0,
            }}
          >
            {logCount > 0
              ? `${logCount} log${logCount !== 1 ? "s" : ""} tagged with #${tag.name} in the community`
              : `0 logs tagged with #${tag.name} yet`}
          </p>
        </div>

        <TypeLogsClient
          logs={logs}
          baseType=""
          emptyLabel={`#${tag.name}`}
          emptyAccent="#00F0FF"
        />
      </main>
    </PageWrapper>
  );
}
