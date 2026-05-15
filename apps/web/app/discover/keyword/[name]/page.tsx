// apps/web/app/discover/keyword/[name]/page.tsx
// [T74-B] Keyword detail page — public logs tagged with a given keyword

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

  // Fetch the tag
  const { data: tag } = await supabase
    .from("tags")
    .select("id, name, use_count")
    .eq("name", tagName.toLowerCase())
    .maybeSingle();

  if (!tag) notFound();

  // Fetch logs with this tag
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

  // Filter to public logs and normalize to DiscoverLog[]
  const logs: DiscoverLog[] = (logTagRows ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((row: any) => row.log)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((l: any) => l && l.is_public)
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

  return (
    <PageWrapper dots glow="cyan">
      <PageHeader />
      <main className="pt-14 pb-24">
        {/* Back button */}
        <div className="px-4 pt-4 mb-2">
          <Link
            href="/discover/keyword"
            className="inline-flex items-center gap-2 text-sm"
            style={{ color: "rgba(245,245,245,0.45)" }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
            Back to Keywords
          </Link>
        </div>

        {/* Header */}
        <div className="px-4 mb-6">
          <h1 className="text-2xl font-black" style={{ color: "#00F0FF" }}>
            #{tag.name}
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "rgba(245,245,245,0.45)" }}
          >
            {logs.length} log{logs.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Reuse TypeLogsClient for display + sort */}
        <TypeLogsClient logs={logs} baseType="" />
      </main>
    </PageWrapper>
  );
}
