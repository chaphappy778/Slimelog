// apps/web/app/sitemap.ts
import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

// [Change 1 — #35] Dynamic sitemap. Uses the anon key (NOT service role)
// because all rows we surface are anon-readable via the post-#35 RLS
// policies. Defense in depth: every query also filters by visibility flag
// (collection_logs.is_public, drops.status != 'cancelled').

const BASE_URL = "https://slimelog.com";

// Cap each table at a sensible bound so the sitemap stays under the 50k
// URLs per file limit. We're nowhere near it now, but this keeps the file
// safe as the platform grows.
const PROFILE_LIMIT = 5000;
const SLIME_LIMIT = 20000;
const BRAND_LIMIT = 5000;
const DROP_LIMIT = 5000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const now = new Date();

  // Static routes
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/brands`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  // Profiles via profiles_public view (already filtered to public profiles)
  const { data: profileRows } = await supabase
    .from("profiles_public")
    .select("username, created_at")
    .not("username", "is", null)
    .order("created_at", { ascending: false })
    .limit(PROFILE_LIMIT);

  const profileEntries: MetadataRoute.Sitemap = (profileRows ?? [])
    .filter(
      (r): r is { username: string; created_at: string } =>
        typeof r.username === "string" && r.username.length > 0,
    )
    .map((r) => ({
      url: `${BASE_URL}/users/${r.username}`,
      lastModified: new Date(r.created_at),
      changeFrequency: "weekly",
      priority: 0.7,
    }));

  // Public collection logs
  const { data: slimeRows } = await supabase
    .from("collection_logs")
    .select("id, updated_at")
    .eq("is_public", true)
    .order("updated_at", { ascending: false })
    .limit(SLIME_LIMIT);

  const slimeEntries: MetadataRoute.Sitemap = (slimeRows ?? []).map((r) => ({
    url: `${BASE_URL}/slimes/${r.id as string}`,
    lastModified: new Date(r.updated_at as string),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  // Brands
  const { data: brandRows } = await supabase
    .from("brands")
    .select("slug, created_at")
    .not("slug", "is", null)
    .order("created_at", { ascending: false })
    .limit(BRAND_LIMIT);

  const brandEntries: MetadataRoute.Sitemap = (brandRows ?? [])
    .filter(
      (r): r is { slug: string; created_at: string } =>
        typeof r.slug === "string" && r.slug.length > 0,
    )
    .map((r) => ({
      url: `${BASE_URL}/brands/${r.slug}`,
      lastModified: new Date(r.created_at),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

  // Drops — exclude cancelled
  // [Change 2 — #35] Schema fix: column is `drop_at`, not `drop_date`.
  // Also pull updated_at as a fallback since drop_at can be null.
  const { data: dropRows } = await supabase
    .from("drops")
    .select("id, drop_at, updated_at")
    .neq("status", "cancelled")
    .order("drop_at", { ascending: false, nullsFirst: false })
    .limit(DROP_LIMIT);

  const dropEntries: MetadataRoute.Sitemap = (dropRows ?? []).map((r) => {
    const dateSource = (r.drop_at as string | null) ?? (r.updated_at as string);
    return {
      url: `${BASE_URL}/drops/${r.id as string}`,
      lastModified: new Date(dateSource),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    };
  });

  return [
    ...staticEntries,
    ...profileEntries,
    ...slimeEntries,
    ...brandEntries,
    ...dropEntries,
  ];
}
