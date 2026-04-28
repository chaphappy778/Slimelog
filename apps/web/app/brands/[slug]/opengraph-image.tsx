// apps/web/app/brands/[slug]/opengraph-image.tsx
import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import { readFile } from "fs/promises";
import path from "path";

export const contentType = "image/png";
export const size = { width: 1200, height: 630 };
export const alt = "SlimeLog brand";

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
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = getSupabase();

  // [Change 4 — #35] Schema fix: brands table has no banner_url column.
  // Removed from select. Banner band uses the gradient fallback only.
  const { data: brandRow } = await supabase
    .from("brands")
    .select("id, name, bio, logo_url, is_verified, follower_count")
    .eq("slug", slug)
    .maybeSingle();

  const brand = brandRow as {
    id: string;
    name: string;
    bio: string | null;
    logo_url: string | null;
    is_verified: boolean | null;
    follower_count: number | null;
  } | null;

  // Aggregate stats
  let avgRating: number | null = null;
  let logCount = 0;
  if (brand) {
    const { data: ratingRows } = await supabase
      .from("collection_logs")
      .select("rating_overall")
      .eq("brand_name_raw", brand.name)
      .eq("is_public", true)
      .not("rating_overall", "is", null);
    const ratings = (ratingRows ?? [])
      .map((r) => r.rating_overall as number | null)
      .filter((r): r is number => r !== null);
    if (ratings.length > 0) {
      avgRating = ratings.reduce((s, r) => s + r, 0) / ratings.length;
    }
    logCount = ratings.length;
  }

  const name = brand?.name ?? "Brand not found";
  const bio = brand?.bio ?? "Slime brand on SlimeLog";

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
        flexDirection: "column",
        background: "#0A0A0A",
        fontFamily: "Montserrat, sans-serif",
        position: "relative",
      }}
    >
      {/* Banner band — top 220px (gradient fallback since no banner_url col) */}
      <div
        style={{
          width: "100%",
          height: 220,
          position: "relative",
          display: "flex",
          background:
            "linear-gradient(135deg, rgba(45,10,78,0.6), rgba(0,240,255,0.2))",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0) 30%, rgba(10,10,10,0.85) 100%)",
          }}
        />
      </div>

      {/* Body — radial purple grad */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "60px 80px",
          position: "relative",
          background:
            "radial-gradient(ellipse 80% 80% at 30% 50%, #2D0A4E 0%, #0F0018 60%, #0A0A0A 100%)",
        }}
      >
        {/* Logo + Name row, overlapping the banner above */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 28,
            marginTop: -120,
            marginBottom: 24,
          }}
        >
          {/* Logo box */}
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: 24,
              border: "5px solid #0A0A0A",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: brand?.logo_url
                ? "transparent"
                : "linear-gradient(135deg, #39FF14, #00F0FF)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
              flexShrink: 0,
            }}
          >
            {brand?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brand.logo_url}
                alt=""
                width={140}
                height={140}
                style={{ width: 140, height: 140, objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  fontSize: 64,
                  fontWeight: 700,
                  color: "#0A0A0A",
                  display: "flex",
                }}
              >
                {name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Wordmark — top right */}
          <div
            style={{
              position: "absolute",
              top: -200 + 30,
              right: 80,
              display: "flex",
              alignItems: "center",
              gap: 10,
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
                fontSize: 24,
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
        </div>

        {/* Brand name */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: "#fff",
              lineHeight: 1.05,
              display: "flex",
            }}
          >
            {name.length > 28 ? `${name.slice(0, 28)}...` : name}
          </div>
          {brand?.is_verified && (
            // [Change 5 — #35] SVG checkmark instead of Unicode (no-emoji rule).
            <div
              style={{
                width: 40,
                height: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#00F0FF",
                borderRadius: 999,
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0A0A0A"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          )}
        </div>

        {/* Bio */}
        {bio && (
          <div
            style={{
              fontSize: 24,
              color: "rgba(255,255,255,0.7)",
              lineHeight: 1.4,
              fontWeight: 400,
              maxWidth: 1000,
              marginBottom: 28,
              display: "flex",
            }}
          >
            {bio.length > 140 ? `${bio.slice(0, 140)}...` : bio}
          </div>
        )}

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: 60,
            marginTop: "auto",
          }}
        >
          {avgRating !== null && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div
                style={{
                  fontSize: 56,
                  fontWeight: 700,
                  color: "#39FF14",
                  lineHeight: 1,
                  display: "flex",
                }}
              >
                {avgRating.toFixed(1)}
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
                Avg Rating
              </div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{
                fontSize: 56,
                fontWeight: 700,
                color: "#00F0FF",
                lineHeight: 1,
                display: "flex",
              }}
            >
              {logCount}
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
              Community Logs
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{
                fontSize: 56,
                fontWeight: 700,
                color: "#FF00E5",
                lineHeight: 1,
                display: "flex",
              }}
            >
              {brand?.follower_count ?? 0}
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
              Followers
            </div>
          </div>
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: fonts.length > 0 ? fonts : undefined,
    },
  );
}
