// apps/web/app/slimes/[id]/opengraph-image.tsx
import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import { readFile } from "fs/promises";
import path from "path";
import {
  SLIME_BASE_TYPE_COLORS,
  SLIME_BASE_TYPE_LABELS,
  type SlimeBaseType,
} from "@/lib/types";

export const contentType = "image/png";
export const size = { width: 1200, height: 630 };
export const alt = "SlimeLog slime review";

// 2026-07-17 T39-M4: retired the local TYPE_COLORS map (only had 8
// legacy `slime_type` values from before the T71 taxonomy migration).
// SLIME_BASE_TYPE_COLORS in lib/types.ts is the source of truth for the
// current 20 base types plus their neon-palette tints, so we pull from
// there. Also flips the query below from `slime_type` (dead column) to
// `base_type` (current column) so OG tiles actually get colored again.

function getSupabase() {
  // [Change 1 — #35] Plain anon-key client. OG routes have no cookie ctx.
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// [Change 2 — #35] Static-instance TTFs as ArrayBuffer. Variable fonts
// crash Satori with "Cannot read properties of undefined (reading '256')".
async function loadFont(filename: string): Promise<ArrayBuffer | null> {
  try {
    const fontPath = path.join(process.cwd(), "public", "fonts", filename);
    const buffer = await readFile(fontPath);
    return buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ) as ArrayBuffer;
  } catch {
    return null;
  }
}

export default async function OpengraphImage({
  params,
}: {
  // [Change 3 — #35] params is async in Next.js 16
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = getSupabase();

  // 2026-07-17 T39-M2 + M4: fixed the stale `slime_type` reference
  // (retired by the T71 taxonomy migration) and extended the query to
  // join `brands` for the logo lookup. brand_id may be null for
  // free-text brands, so the join is left; when it resolves we prefer
  // the catalog name over brand_name_raw so casing is canonical.
  const { data: logRow } = await supabase
    .from("collection_logs")
    .select(
      `slime_name, brand_name_raw, base_type, rating_overall, image_url,
       notes, user_id, brand:brands(name, logo_url)`,
    )
    .eq("id", id)
    .eq("is_public", true)
    .maybeSingle();

  type BrandJoin = { name: string | null; logo_url: string | null } | null;
  const log = logRow as {
    slime_name: string | null;
    brand_name_raw: string | null;
    base_type: string | null;
    rating_overall: number | null;
    image_url: string | null;
    notes: string | null;
    user_id: string;
    brand: BrandJoin | BrandJoin[];
  } | null;

  // Supabase's typegen returns 1:1 joins as arrays; normalize.
  const brandJoin: BrandJoin =
    log?.brand === undefined
      ? null
      : Array.isArray(log.brand)
        ? (log.brand[0] ?? null)
        : log.brand;
  const brandLogoUrl = brandJoin?.logo_url ?? null;

  let username: string | null = null;
  if (log?.user_id) {
    const { data: ownerRow } = await supabase
      .from("profiles_public")
      .select("username")
      .eq("id", log.user_id)
      .maybeSingle();
    username =
      (ownerRow as { username: string | null } | null)?.username ?? null;
  }

  const slimeName = log?.slime_name ?? "Unnamed slime";
  // Prefer the catalog brand name when the join resolved (canonical
  // casing + spelling); fall back to the log's raw text. Only reach
  // "Unknown brand" when there's literally no brand data at all.
  const brandName =
    brandJoin?.name ?? log?.brand_name_raw ?? "Unknown brand";
  const rating = log?.rating_overall;
  // 2026-07-17 T39-M4: base_type is the current column; map its value
  // into the shared neon palette. Falls back to slime green when the
  // base_type is unknown (extremely rare — should only happen for
  // pre-migration rows, all backfilled during the taxonomy work).
  const baseTypeKey = log?.base_type as SlimeBaseType | null | undefined;
  const typeColor = baseTypeKey
    ? (SLIME_BASE_TYPE_COLORS[baseTypeKey]?.text ?? "#39FF14")
    : "#39FF14";
  const typeLabel = baseTypeKey
    ? (SLIME_BASE_TYPE_LABELS[baseTypeKey] ?? baseTypeKey.replace(/_/g, " "))
    : null;

  const [bold, regular] = await Promise.all([
    loadFont("Montserrat-Bold.ttf"),
    loadFont("Montserrat-Regular.ttf"),
  ]);

  const fonts: {
    name: string;
    data: ArrayBuffer;
    weight: 400 | 700;
    style: "normal";
  }[] = [];
  if (regular)
    fonts.push({
      name: "Montserrat",
      data: regular,
      weight: 400,
      style: "normal",
    });
  if (bold)
    fonts.push({
      name: "Montserrat",
      data: bold,
      weight: 700,
      style: "normal",
    });

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#0A0A0A",
        fontFamily: "Montserrat, sans-serif",
        position: "relative",
      }}
    >
      {/* Left half: image */}
      <div
        style={{
          width: 600,
          height: 630,
          position: "relative",
          display: "flex",
          background: log?.image_url
            ? "transparent"
            : `linear-gradient(135deg, ${typeColor}40, rgba(45,10,78,0.5))`,
          overflow: "hidden",
        }}
      >
        {log?.image_url && (
          <img
            src={log.image_url}
            alt=""
            width={600}
            height={630}
            style={{
              width: 600,
              height: 630,
              objectFit: "cover",
            }}
          />
        )}
        {/* Subtle gradient veil for text readability against right edge */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: 80,
            background:
              "linear-gradient(to right, transparent, rgba(10,10,10,0.6))",
          }}
        />
      </div>

      {/* Right half: details */}
      <div
        style={{
          width: 600,
          height: 630,
          display: "flex",
          flexDirection: "column",
          padding: 60,
          background:
            "radial-gradient(ellipse 80% 70% at 50% 30%, #2D0A4E 0%, #0F0018 70%, #0A0A0A 100%)",
          position: "relative",
        }}
      >
        {/* Wordmark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: "linear-gradient(135deg, #39FF14, #00F0FF)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 22,
                height: 17,
                background: "#0A0A0A",
                borderRadius: "50%",
                opacity: 0.85,
              }}
            />
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              background: "linear-gradient(90deg, #39FF14, #00F0FF, #FF00E5)",
              backgroundClip: "text",
              color: "transparent",
              display: "flex",
            }}
          >
            SlimeLog
          </div>
        </div>

        {/* Type pill */}
        {typeLabel && (
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              padding: "8px 16px",
              borderRadius: 999,
              background: `${typeColor}25`,
              color: typeColor,
              border: `2px solid ${typeColor}50`,
              alignSelf: "flex-start",
              textTransform: "capitalize",
              letterSpacing: "0.04em",
              marginBottom: 24,
              display: "flex",
            }}
          >
            {typeLabel}
          </div>
        )}

        {/* Slime name */}
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            color: "#fff",
            lineHeight: 1.1,
            marginBottom: 12,
            display: "flex",
          }}
        >
          {slimeName.length > 32 ? `${slimeName.slice(0, 32)}...` : slimeName}
        </div>

        {/* Brand — with logo when the catalog brand join resolved.
            2026-07-17 T39-M2: small round logo tile improves the
            "native-looking product card" read when a reshared log
            preview appears in IG/DM. Falls back to the plain cyan
            wordmark for free-text brands. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 32,
          }}
        >
          {brandLogoUrl && (
            <img
              src={brandLogoUrl}
              alt=""
              width={36}
              height={36}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                objectFit: "cover",
                border: "1.5px solid rgba(0,240,255,0.35)",
              }}
            />
          )}
          <div
            style={{
              fontSize: 24,
              color: "#00F0FF",
              fontWeight: 700,
              display: "flex",
            }}
          >
            {brandName}
          </div>
        </div>

        {/* Rating */}
        {typeof rating === "number" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontSize: 110,
                fontWeight: 700,
                color: "#39FF14",
                lineHeight: 1,
                display: "flex",
              }}
            >
              {rating}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", gap: 4 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <div
                    key={n}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 4,
                      background:
                        n <= rating ? "#39FF14" : "rgba(57,255,20,0.15)",
                      display: "flex",
                    }}
                  />
                ))}
              </div>
              <div
                style={{
                  fontSize: 16,
                  color: "rgba(255,255,255,0.5)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  display: "flex",
                }}
              >
                out of 5
              </div>
            </div>
          </div>
        )}

        {/* Reviewer */}
        {username && (
          <div
            style={{
              position: "absolute",
              bottom: 50,
              left: 60,
              fontSize: 20,
              color: "#FF00E5",
              fontWeight: 700,
              display: "flex",
            }}
          >
            @{username}&apos;s review
          </div>
        )}
      </div>
    </div>,
    {
      ...size,
      fonts: fonts.length > 0 ? fonts : undefined,
    },
  );
}
