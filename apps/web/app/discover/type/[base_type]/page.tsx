// apps/web/app/discover/type/[base_type]/page.tsx
// [T74-B] Type detail page — public logs filtered by slime base type

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import PageWrapper from "@/components/PageWrapper";
import TypeLogsClient from "@/components/discover/TypeLogsClient";
import {
  SLIME_BASE_TYPE_LABELS,
  SLIME_BASE_TYPE_COLORS,
  type SlimeBaseType,
} from "@/lib/types";

export type DiscoverLog = {
  id: string;
  slime_name: string | null;
  brand_name_raw: string | null;
  base_type: string | null;
  subtype_name: string | null;
  colors: string[] | null;
  image_url: string | null;
  rating_overall: number | null;
  created_at: string;
  username: string | null;
  avatar_url: string | null;
};

interface PageProps {
  params: Promise<{ base_type: string }>;
}

export default async function TypeDetailPage({ params }: PageProps) {
  const { base_type } = await params;

  // Validate base_type is a known SlimeBaseType
  const validTypes = Object.keys(SLIME_BASE_TYPE_LABELS) as SlimeBaseType[];
  if (!validTypes.includes(base_type as SlimeBaseType)) {
    notFound();
  }

  const validBaseType = base_type as SlimeBaseType;
  const typeLabel = SLIME_BASE_TYPE_LABELS[validBaseType];
  const typeColor = SLIME_BASE_TYPE_COLORS[validBaseType].text;

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } },
  );

  const { data: logs } = await supabase
    .from("collection_logs")
    .select(
      `
      id, slime_name, brand_name_raw, base_type, subtype_id, colors,
      image_url, rating_overall, created_at,
      subtype:subtypes(name),
      user:profiles_public(username, avatar_url)
    `,
    )
    .eq("base_type", validBaseType)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(50);

  const normalizedLogs: DiscoverLog[] = (logs ?? []).map((l) => ({
    id: l.id,
    slime_name: l.slime_name,
    brand_name_raw: l.brand_name_raw,
    base_type: l.base_type,
    subtype_name: Array.isArray(l.subtype)
      ? (l.subtype[0]?.name ?? null)
      : ((l.subtype as { name: string } | null)?.name ?? null),
    colors: l.colors,
    image_url: l.image_url,
    rating_overall: l.rating_overall,
    created_at: l.created_at,
    username: Array.isArray(l.user)
      ? (l.user[0]?.username ?? null)
      : ((
          l.user as {
            username: string;
            avatar_url: string | null;
          } | null
        )?.username ?? null),
    avatar_url: Array.isArray(l.user)
      ? (l.user[0]?.avatar_url ?? null)
      : ((
          l.user as {
            username: string;
            avatar_url: string | null;
          } | null
        )?.avatar_url ?? null),
  }));

  return (
    <PageWrapper dots glow="cyan">
      <PageHeader />
      <main className="pt-14 pb-24">
        {/* Back button */}
        <div className="px-4 pt-4 mb-2">
          <Link
            href="/discover"
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
            Back to Discover
          </Link>
        </div>

        {/* Header */}
        <div className="px-4 mb-6">
          <h1 className="text-2xl font-black" style={{ color: typeColor }}>
            {typeLabel}
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "rgba(245,245,245,0.45)" }}
          >
            {normalizedLogs.length} log
            {normalizedLogs.length !== 1 ? "s" : ""} in the community
          </p>
        </div>

        <TypeLogsClient logs={normalizedLogs} baseType={validBaseType} />
      </main>
    </PageWrapper>
  );
}
