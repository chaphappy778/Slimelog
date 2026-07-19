// apps/web/app/discover/type/[base_type]/page.tsx
// [T74-B] Type detail page — public logs filtered by slime base type
// [T33a 2026-07-13] Redesigned per Design's Discover results pack.
// Hero card uses the real base-type photo from
// `apps/web/public/guide/textures/` with a bottom gradient wash for
// text legibility (matches TypeCarousel on /discover). Type name in
// Montserrat black 42px, signature color, "N logs in the community"
// sub. Below: `TypeLogsClient` renders the subtype chip row + sort
// tabs + log cards + empty CTA.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import PageWrapper from "@/components/PageWrapper";
import BackLink from "@/components/BackLink";
import TypeLogsClient from "@/components/discover/TypeLogsClient";
import { SLIME_BASE_TYPE_LABELS, type SlimeBaseType } from "@/lib/types";
import {
  BASE_TYPE_HERO_PHOTO,
  BASE_TYPE_HERO_TINT,
  DEFAULT_HERO_TINT,
} from "@/lib/base-type-hero";

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

  const validTypes = Object.keys(SLIME_BASE_TYPE_LABELS) as SlimeBaseType[];
  if (!validTypes.includes(base_type as SlimeBaseType)) {
    notFound();
  }

  const validBaseType = base_type as SlimeBaseType;
  const typeLabel = SLIME_BASE_TYPE_LABELS[validBaseType];
  const typeTint = BASE_TYPE_HERO_TINT[validBaseType] ?? DEFAULT_HERO_TINT;
  const typePhoto = BASE_TYPE_HERO_PHOTO[validBaseType] ?? null;

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

  const logCount = normalizedLogs.length;

  return (
    <PageWrapper dots glow="cyan" orbs>
      <PageHeader />
      <main className="pt-14 pb-24">
        {/* Back link — [Item #28 Phase C hotfix 2026-07-18] uses
            router.back() so users arriving from /search return to
            their search results rather than being kicked out to
            /discover. Falls back to /discover for direct-link opens. */}
        <div className="px-4 pt-4 mb-3">
          <BackLink fallbackHref="/discover" label="Back" />
        </div>

        {/* Hero card — real photo with gradient wash for legibility */}
        <div className="px-4 mb-5">
          <div
            className="relative w-full rounded-3xl overflow-hidden"
            style={{
              height: 186,
              border: `1px solid ${typeTint}55`,
              boxShadow: `0 0 32px ${typeTint}22`,
            }}
          >
            {typePhoto ? (
              <Image
                src={typePhoto}
                alt=""
                fill
                priority
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 400px"
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(120% 120% at 40% 30%, ${typeTint}55, rgba(16,0,32,0.85))`,
                }}
                aria-hidden="true"
              />
            )}
            {/* Bottom gradient wash so the type name reads over any
                photo. Also a top halo bar so the color is visible even
                when the photo dominates. */}
            <div
              className="absolute inset-x-0 bottom-0"
              aria-hidden="true"
              style={{
                height: "70%",
                background:
                  "linear-gradient(0deg, rgba(10,4,18,0.94) 25%, rgba(10,4,18,0.65) 60%, transparent 100%)",
              }}
            />
            <div
              className="absolute inset-x-0 top-0 pointer-events-none"
              aria-hidden="true"
              style={{
                height: 3,
                background: `linear-gradient(90deg, transparent, ${typeTint}, transparent)`,
                opacity: 0.8,
              }}
            />

            {/* Text stack — bottom-left, over the wash */}
            <div
              className="absolute left-5 right-5 bottom-4"
              style={{ zIndex: 2 }}
            >
              <h1
                style={{
                  fontFamily: "Montserrat, sans-serif",
                  fontWeight: 900,
                  fontSize: 42,
                  color: typeTint,
                  lineHeight: 0.95,
                  letterSpacing: "-0.01em",
                  margin: 0,
                  textShadow: `0 0 20px ${typeTint}55`,
                }}
              >
                {typeLabel}
              </h1>
              <p
                className="mt-1.5 text-[15px] font-semibold"
                style={{
                  color:
                    logCount > 0
                      ? "rgba(255,255,255,0.72)"
                      : "rgba(255,255,255,0.6)",
                  margin: 0,
                }}
              >
                {logCount > 0
                  ? `${logCount} log${logCount !== 1 ? "s" : ""} in the community`
                  : "Be the first to log one"}
              </p>
            </div>
          </div>
        </div>

        <TypeLogsClient
          logs={normalizedLogs}
          baseType={validBaseType}
          emptyLabel={`${typeLabel} slime`}
          emptyAccent={typeTint}
        />
      </main>
    </PageWrapper>
  );
}
