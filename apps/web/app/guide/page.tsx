// apps/web/app/guide/page.tsx
// T32 (2026-07-13): The SlimeLog Guide — the full 12-part community
// reference. Server component so the whole guide renders in HTML for
// SEO. Interactive bits (nav scroll-spy, texture detail sheet, TOC
// drawer) are isolated to a few small client components.
//
// Content lives in ./content.ts. Copy is Jenn's V4.1 draft — do not
// rewrite it in-place, propose changes in the source doc first.

import type { Metadata } from "next";
import Link from "next/link";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import PageWrapper from "@/components/PageWrapper";
import PageHeader from "@/components/PageHeader";
import GuideNav from "@/components/guide/GuideNav";
import TextureExplorer from "@/components/guide/TextureExplorer";
import GlossaryList from "@/components/guide/GlossaryList";
import ProseSection from "@/components/guide/ProseSection";
import BrandGlossary from "@/components/guide/BrandGlossary";
import PricingBands from "@/components/guide/PricingBands";
// [T32d 2026-07-13] Part 12 now indexes the six axes from /how-to-rate
// instead of duplicating a competing legacy prose framework. Source of
// truth for the axis names, colors, and taglines is the how-to-rate
// content module. Any change there flows through automatically.
import { RATING_AXES } from "@/app/how-to-rate/content";
// T32b (2026-07-13): featured shops strip atop Part 5.
import FeaturedShopsStrip, {
  type FeaturedShop,
} from "@/components/guide/FeaturedShopsStrip";
// T32c (2026-07-13): compact chip strip for Part 3 sizes.
import SizeChipStrip from "@/components/guide/SizeChipStrip";
import type { SlimeBaseType } from "@/lib/types";
import {
  ADD_INS,
  AESTHETIC_VOCAB,
  BRAND_GLOSSARY,
  CARE_STORAGE,
  CONTAINER_SIZES,
  CONTAINER_TYPES,
  PACKAGING_ADDONS,
  PARTS,
  PRICING_BANDS,
  PRICING_DRIVERS,
  PRICING_RESALE_NOTE,
  SAFETY,
  SCENTS,
  SHIPPING,
  SOUND_VOCAB,
  TEXTURES,
  VALUE_INDICATORS,
} from "./content";

export const metadata: Metadata = {
  title: "The SlimeLog Guide",
  description:
    "The community reference for slime terminology, textures, add-ins, scents, brands, care, safety, pricing, sound, and the SlimeLog rating framework.",
  openGraph: {
    title: "The SlimeLog Guide",
    description:
      "The community reference for slime, textures, add-ins, scents, brands, care, safety, and pricing.",
    images: ["/guide/textures/butter-cats-craft.webp"],
    type: "article",
  },
};

// ─── Log counts ────────────────────────────────────────────────────────

/**
 * Fetch total public-log counts per base_type. Uses the anon-key server
 * client (RLS is fine here, is_public=true is the visibility gate). One
 * lightweight aggregate query, run at page-render time. When we cross
 * 20k logs we should swap this for an RPC or materialized view (see
 * docs/cost-tracker.md).
 */
async function fetchLogCountsBySlug(): Promise<Record<string, number>> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          /* read-only on server components */
        },
      },
    },
  );

  const { data, error } = await supabase
    .from("collection_logs")
    .select("base_type")
    .eq("is_public", true)
    .not("base_type", "is", null)
    .limit(20_000);

  if (error) {
    console.warn("[guide] log-count fetch failed", error);
    return {};
  }

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const bt = (row as { base_type: SlimeBaseType | null }).base_type;
    if (!bt) continue;
    counts[bt] = (counts[bt] ?? 0) + 1;
  }
  return counts;
}

// ─── Top brands (Featured Shops strip in Part 5) ────────────────────
//
// T32b (2026-07-13): mirrors the leaderboard's aggregate pattern —
// aggregate `brand_name_raw` from public logs, take the top N, then
// look up each in the brands catalog for slug + logo_url. Uses in-memory
// aggregation for now (docs/cost-tracker.md pins the mitigation path if
// this ever gets hot). Everything runs in parallel with the log-count
// fetch above.
const FEATURED_SHOPS_LIMIT = 10;

interface RawBrandRow {
  brand_name_raw: string | null;
}

async function fetchTopShops(): Promise<FeaturedShop[]> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          /* read-only on server components */
        },
      },
    },
  );

  const { data: logRows, error: logErr } = await supabase
    .from("collection_logs")
    .select("brand_name_raw")
    .eq("is_public", true)
    .not("brand_name_raw", "is", null)
    .limit(20_000);

  if (logErr) {
    console.warn("[guide] top-shops log fetch failed", logErr);
    return [];
  }

  // Aggregate case-insensitively so "Cloud Nine" and "cloud nine" merge.
  // Track first-seen display casing so the tile label reads clean.
  const buckets = new Map<
    string,
    { key: string; displayName: string; total: number }
  >();
  for (const raw of (logRows ?? []) as RawBrandRow[]) {
    const trimmed = raw.brand_name_raw?.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.total += 1;
    } else {
      buckets.set(key, { key, displayName: trimmed, total: 1 });
    }
  }

  const topBuckets = Array.from(buckets.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, FEATURED_SHOPS_LIMIT);
  if (topBuckets.length === 0) return [];

  // Per-brand ILIKE lookup against the catalog for slug + logo_url.
  // Mirrors the leaderboard pattern; CLAUDE.md rule confirms brands.name
  // is the correct column (not name_raw — that's on collection_logs).
  const catalogResults = await Promise.all(
    topBuckets.map((b) =>
      supabase
        .from("brands")
        .select("name, slug, logo_url")
        .ilike("name", b.displayName)
        .maybeSingle(),
    ),
  );

  return topBuckets.map((bucket, idx) => {
    const catalog = catalogResults[idx];
    const catalogRow =
      catalog.error || !catalog.data
        ? null
        : (catalog.data as {
            name: string | null;
            slug: string | null;
            logo_url: string | null;
          });
    return {
      key: bucket.key,
      name: catalogRow?.name ?? bucket.displayName,
      slug: catalogRow?.slug ?? null,
      logo_url: catalogRow?.logo_url ?? null,
      totalLogs: bucket.total,
    };
  });
}

// ─── Page ──────────────────────────────────────────────────────────────

export default async function GuidePage() {
  const [logCountsBySlug, featuredShops] = await Promise.all([
    fetchLogCountsBySlug(),
    fetchTopShops(),
  ]);

  return (
    <PageWrapper dots glow="cyan" orbs>
      <PageHeader />

      <main
        className="pb-24"
        style={{
          // 2026-07-13: bumped from 6 to 24 so the header clears the
          // hero eyebrow with visible breathing room.
          paddingTop: 24,
        }}
      >
        {/* Hero */}
        <section className="px-4 pt-4 pb-3">
          <div
            className="text-[11px] font-bold uppercase mb-3"
            style={{
              color: "#00F0FF",
              letterSpacing: "0.18em",
              fontFamily: "Montserrat, sans-serif",
            }}
          >
            The SlimeLog Guide
          </div>
          <h1
            className="text-white m-0"
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 900,
              // 2026-07-13: forced line break — "Everything" on line 1,
              // "slime, decoded" on line 2. Only "decoded" carries the
              // pink gradient — putting the whole line in gradient
              // washed out the standout word.
              fontSize: 44,
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
            }}
          >
            Everything
            <br />
            slime,{" "}
            <span
              style={{
                background:
                  "linear-gradient(120deg, #FF00E5 0%, #CC44FF 55%, #7BF5FF 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              decoded.
            </span>
          </h1>
          <p
            className="mt-3 max-w-md"
            style={{
              color: "rgba(245,245,245,0.72)",
              fontSize: 14,
              lineHeight: 1.55,
            }}
          >
            Your field guide to the language of the shelf. Twelve parts,
            community-authored, updated as the craft moves.
          </p>
          {/* 2026-07-13: metadata chips ("12 parts", "20 base textures",
              "community-authored") removed per user feedback — hero paragraph
              already communicates all three of those. */}
        </section>

        {/* 2026-07-13: sticky pill nav lives BELOW the hero (matches
            the /how-to-rate treatment). On scroll it pins under the
            header and travels with the page, active pill glowing solid
            cyan. */}
        <GuideNav parts={PARTS} />

        {/* Part 1: Base Textures */}
        <PartSection n={1} title="Base Textures" tagline={PARTS[0].tagline}>
          <TextureExplorer
            textures={TEXTURES}
            logCountsBySlug={logCountsBySlug}
          />
        </PartSection>

        {/* Part 2: Add-ins */}
        <PartSection
          n={2}
          title="Add-ins & Inclusions"
          tagline={PARTS[1].tagline}
        >
          <IntroLine>
            Add-ins are the elements mixed into the base slime to create
            texture, sound, visual interest, and theme. These are what
            transform a base slime into a named, themed product.
          </IntroLine>
          <GlossaryList entries={ADD_INS} accent="cyan" />
        </PartSection>

        {/* Part 3: Containers */}
        <PartSection
          n={3}
          title="Containers & Packaging"
          tagline={PARTS[2].tagline}
        >
          <IntroLine>
            The container is part of the product. Slime containers affect
            storage, freshness, presentation, and unboxing experience.
          </IntroLine>

          <SubHeading>Container Types</SubHeading>
          <ContainerGrid
            entries={CONTAINER_TYPES.map((c) => ({
              term: c.name,
              tag: null,
              definition: c.description,
            }))}
          />

          <SubHeading>Sizes</SubHeading>
          {/* T32c (2026-07-13): five container sizes (4/6/8/16/32 oz)
              read tighter as a horizontal chip strip than as a
              two-column grid. Same content module, different layout
              for a short numeric ladder. */}
          <SizeChipStrip entries={CONTAINER_SIZES} />

          <SubHeading>Packaging Add-ons</SubHeading>
          <ContainerGrid
            entries={PACKAGING_ADDONS.map((c) => ({
              term: c.name,
              tag: null,
              definition: c.description,
            }))}
          />
        </PartSection>

        {/* Part 4: Scents */}
        <PartSection n={4} title="Scents" tagline={PARTS[3].tagline}>
          <IntroLine>
            Scent is a major dimension of the slime collecting experience.
            Scent profiles often align with seasonal drops, themed
            collections, or shop signatures.
          </IntroLine>
          <GlossaryList entries={SCENTS} accent="magenta" />
          <p
            className="mt-4 text-[12.5px]"
            style={{ color: "rgba(245,245,245,0.58)", lineHeight: 1.55 }}
          >
            Scents fade over time (usually noticeable within a few weeks
            of opening), and can migrate between slimes if stored
            together. Heat and air both accelerate scent loss. Scent
            boosters, sold separately, refresh a faded fragrance.
          </p>
        </PartSection>

        {/* Part 5: Brand Glossary */}
        <PartSection n={5} title="Brand Glossary" tagline={PARTS[4].tagline}>
          {/* T32b (2026-07-13): featured shops strip sits above Jenn's
              V4.1 vocabulary glossary. Restores Design's original
              brand-tile intent without dropping any of her copy. Tiles
              link to /brands/[slug] when the brand has a catalog row;
              free-text brands render as non-clickable name tiles. */}
          <FeaturedShopsStrip shops={featuredShops} />
          <IntroLine>
            A reference for slime industry terminology, the vocabulary
            collectors, makers, and shops use to describe products,
            drops, transactions, and community dynamics.
          </IntroLine>
          <BrandGlossary entries={BRAND_GLOSSARY} />
        </PartSection>

        {/* Part 6: Care */}
        <PartSection
          n={6}
          title="Care, Storage & Maintenance"
          tagline={PARTS[5].tagline}
        >
          <ProseSection data={CARE_STORAGE} />
        </PartSection>

        {/* Part 7: Safety */}
        <PartSection n={7} title="Safety & Allergies" tagline={PARTS[6].tagline}>
          <ProseSection data={SAFETY} />
        </PartSection>

        {/* Part 8: Pricing */}
        <PartSection
          n={8}
          title="Pricing, Sizing & Value"
          tagline={PARTS[7].tagline}
        >
          <IntroLine>
            The slime market spans a wide range of price points, from
            budget DIY drops to premium boutique offerings. Understanding
            standard pricing conventions helps collectors evaluate value.
          </IntroLine>

          <PricingBands bands={PRICING_BANDS} />

          <SubHeading>What Drives Pricing</SubHeading>
          <BulletList items={PRICING_DRIVERS} accent="cyan" />

          <SubHeading>Value Indicators</SubHeading>
          <BulletList items={VALUE_INDICATORS} accent="green" />

          <div
            className="rounded-2xl px-4 py-3.5 mt-4"
            style={{
              background: "rgba(255,0,229,0.09)",
              border: "1px solid rgba(255,0,229,0.32)",
            }}
          >
            <div
              className="text-[10.5px] font-bold uppercase mb-1.5"
              style={{
                color: "#FF7BEB",
                letterSpacing: "0.10em",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              Resale &amp; Secondary Market
            </div>
            <p
              className="text-[13px]"
              style={{
                color: "rgba(245,245,245,0.82)",
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              {PRICING_RESALE_NOTE}
            </p>
          </div>
        </PartSection>

        {/* Part 9: Shipping */}
        <PartSection
          n={9}
          title="Shipping & Handling"
          tagline={PARTS[8].tagline}
        >
          <ProseSection data={SHIPPING} />
        </PartSection>

        {/* Part 10: Aesthetic */}
        <PartSection
          n={10}
          title="Color, Theme & Aesthetic Vocabulary"
          tagline={PARTS[9].tagline}
        >
          <IntroLine>
            Color and theme drive much of the slime market alongside
            texture. The vocabulary below describes the visual and
            conceptual dimensions of slime products.
          </IntroLine>
          <GlossaryList entries={AESTHETIC_VOCAB} accent="gold" />
        </PartSection>

        {/* Part 11: Sound */}
        <PartSection
          n={11}
          title="Sound & ASMR Vocabulary"
          tagline={PARTS[10].tagline}
        >
          <IntroLine>
            Slime sounds are a primary driver of ASMR appeal and are
            often as important to collectors as visual or tactile
            qualities. Different textures produce distinct sound profiles.
          </IntroLine>
          <GlossaryList entries={SOUND_VOCAB} accent="green" />
        </PartSection>

        {/* Part 12: Rating Framework.
            [T32d 2026-07-13] Retired the legacy 9-dimension / 10-point
            prose block. Part 12 is now a lightweight index of the six
            axes defined in /how-to-rate — each card carries its own
            axis color and deep-links to that axis's section on the
            how-to-rate page. Full breakdown stays on /how-to-rate so
            the guide never falls out of sync with the rating model
            the app actually uses. */}
        <PartSection
          n={12}
          title="The SlimeLog Rating Framework"
          tagline={PARTS[11].tagline}
        >
          <IntroLine>
            Every log on SlimeLog is scored across six axes on a
            five-star scale. Tap any axis for the full definition,
            examples, and calibration on /how-to-rate.
          </IntroLine>
          <AxisIndex />
          <div className="mt-6">
            <Link
              href="/how-to-rate"
              className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-[14px] font-bold"
              style={{
                background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                color: "#0A0A0A",
                fontFamily: "Montserrat, sans-serif",
                textDecoration: "none",
                // 2026-07-13: full-width CTA to match the section width
                // and give it the same glow treatment as the texture
                // detail sheet's community-logs CTA.
                boxShadow:
                  "0 0 26px rgba(57,255,20,0.5), 0 8px 24px rgba(0,240,255,0.25), 0 0 6px rgba(57,255,20,0.45)",
              }}
            >
              Read the full rating guide
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </PartSection>

        <div
          className="px-4 pt-8 text-center"
          style={{ color: "rgba(245,245,245,0.42)", fontSize: 12 }}
        >
          You reached the end of the guide. Community-authored, updated as
          the craft moves.
        </div>
      </main>
    </PageWrapper>
  );
}

// ─── Section shells ───────────────────────────────────────────────────

function PartSection({
  n,
  title,
  tagline,
  children,
}: {
  n: number;
  title: string;
  tagline: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={`part-${n}`}
      data-part={n}
      className="px-4 pt-10"
      style={{ scrollMarginTop: 116 }}
    >
      <div className="flex items-baseline gap-2 mb-1.5">
        <span
          className="rounded-md px-1.5 py-0.5 font-black"
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontSize: 12,
            color: "#00F0FF",
            border: "1px solid rgba(0,240,255,0.35)",
            letterSpacing: "0.04em",
          }}
        >
          {n.toString().padStart(2, "0")}
        </span>
        <h2
          className="text-white m-0"
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 800,
            fontSize: 22,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
          }}
        >
          {title}
        </h2>
      </div>
      <p
        className="text-[13px] mb-4"
        style={{ color: "rgba(245,245,245,0.65)", lineHeight: 1.5 }}
      >
        {tagline}
      </p>
      {children}
    </section>
  );
}

// ─── Small primitives ─────────────────────────────────────────────────

function Chip({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "green";
}) {
  const isGreen = tone === "green";
  return (
    <span
      className="text-[11px] font-semibold rounded-full px-3 py-1"
      style={{
        color: isGreen ? "#7BFF7B" : "rgba(245,245,245,0.85)",
        background: isGreen
          ? "rgba(57,255,20,0.08)"
          : "rgba(45,10,78,0.4)",
        border: isGreen
          ? "1px solid rgba(57,255,20,0.30)"
          : "1px solid rgba(45,10,78,0.75)",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {children}
    </span>
  );
}

function IntroLine({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-4 text-[13.5px]"
      style={{ color: "rgba(245,245,245,0.78)", lineHeight: 1.55 }}
    >
      {children}
    </p>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="mt-6 mb-2 text-white"
      style={{
        fontFamily: "Montserrat, sans-serif",
        fontWeight: 800,
        fontSize: 14,
        letterSpacing: "-0.01em",
      }}
    >
      {children}
    </h3>
  );
}

interface ContainerEntryLike {
  term: string;
  tag: string | null;
  definition: string;
}

function ContainerGrid({ entries }: { entries: ContainerEntryLike[] }) {
  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        background: "rgba(45,10,78,0.3)",
        border: "1px solid rgba(45,10,78,0.7)",
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2">
        {entries.map((entry, i) => (
          <div
            key={`${entry.term}-${i}`}
            className="px-4 py-3"
            style={{ borderBottom: "1px solid rgba(45,10,78,0.55)" }}
          >
            <div className="flex items-baseline flex-wrap gap-2 mb-1">
              <span
                className="font-black text-white"
                style={{
                  fontFamily: "Montserrat, sans-serif",
                  fontSize: 13.5,
                  letterSpacing: "-0.01em",
                }}
              >
                {entry.term}
              </span>
              {entry.tag ? (
                <span
                  className="text-[10px] font-bold uppercase rounded-full px-2 py-0.5"
                  style={{
                    color: "#00F0FF",
                    background: "rgba(0,240,255,0.08)",
                    border: "1px solid rgba(0,240,255,0.32)",
                    letterSpacing: "0.06em",
                  }}
                >
                  {entry.tag}
                </span>
              ) : null}
            </div>
            <p
              className="text-[12.5px]"
              style={{ color: "rgba(245,245,245,0.72)", lineHeight: 1.5, margin: 0 }}
            >
              {entry.definition}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function BulletList({
  items,
  accent,
}: {
  items: string[];
  accent: "cyan" | "green";
}) {
  const color = accent === "cyan" ? "#00F0FF" : "#39FF14";
  return (
    <ul className="space-y-2 list-none pl-0 mt-2">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex items-start gap-2.5 text-[13px]"
          style={{ color: "rgba(245,245,245,0.82)", lineHeight: 1.55 }}
        >
          <span
            className="flex-none mt-2 rounded-sm"
            aria-hidden="true"
            style={{
              width: 6,
              height: 6,
              background: color,
              boxShadow: `0 0 8px ${color}`,
            }}
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

// ─── AxisIndex (Part 12) ──────────────────────────────────────────────
// [T32d 2026-07-13] Six-card index of the rating axes defined on
// /how-to-rate. Each card carries the axis's accent color and links to
// that axis's anchor on the how-to-rate page. Order + names + colors
// pull from `RATING_AXES` in `apps/web/app/how-to-rate/content.ts` so
// the guide never drifts from the rating model the app enforces.
function AxisIndex() {
  return (
    <ul className="list-none m-0 p-0 space-y-2.5">
      {RATING_AXES.map((axis) => {
        // Overall renders its name as gradient text; everything else
        // uses the solid accent color. Border + hover glow always use
        // the solid accentColor for consistency.
        const nameStyle: React.CSSProperties = axis.accentGradient
          ? {
              background: axis.accentGradient,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              color: "transparent",
            }
          : { color: axis.accentColor };

        return (
          <li key={axis.slug} className="m-0 p-0">
            <Link
              href={`/how-to-rate#${axis.slug}`}
              className="flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-transform active:scale-[0.985]"
              style={{
                background: "rgba(45,10,78,0.28)",
                border: `1px solid ${axis.accentBorder}`,
                boxShadow: `inset 0 0 24px ${axis.accentGlow}`,
                textDecoration: "none",
              }}
            >
              {/* Two-digit number badge in the axis accent color. */}
              <span
                className="flex-none grid place-items-center rounded-xl font-black"
                style={{
                  width: 36,
                  height: 36,
                  fontFamily: "Montserrat, sans-serif",
                  fontSize: 13,
                  letterSpacing: "0.06em",
                  color: axis.accentColor,
                  border: `1px solid ${axis.accentColor}`,
                  background: "rgba(10,0,20,0.35)",
                }}
              >
                {axis.displayN}
              </span>

              {/* Name + tagline. */}
              <div className="flex-1 min-w-0">
                <div
                  className="truncate"
                  style={{
                    fontFamily: "Montserrat, sans-serif",
                    fontWeight: 900,
                    fontSize: 16,
                    letterSpacing: "-0.01em",
                    lineHeight: 1.15,
                    ...nameStyle,
                  }}
                >
                  {axis.name}
                </div>
                <div
                  className="mt-0.5 text-[12.5px] truncate"
                  style={{
                    color: "rgba(245,245,245,0.62)",
                    lineHeight: 1.35,
                  }}
                >
                  {axis.tagline}
                </div>
              </div>

              {/* Chevron in the axis accent color. */}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke={axis.accentColor}
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="flex-none"
              >
                <path d="M9 6l6 6-6 6" />
              </svg>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
