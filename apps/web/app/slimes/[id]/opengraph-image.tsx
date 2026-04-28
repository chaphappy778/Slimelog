// apps/web/app/slimes/[id]/opengraph-image.tsx
import { ImageResponse } from "next/og";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { readFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };
export const alt = "SlimeLog slime review";

const TYPE_COLORS: Record<string, string> = {
  butter: "#FFB347",
  clear: "#00F0FF",
  cloud: "#F5F5F5",
  icee: "#4FC3F7",
  fluffy: "#FF6B9D",
  jelly: "#4ECDC4",
  beaded: "#FF00E5",
  clay: "#E74C3C",
  floam: "#8BC34A",
};

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } },
  );
}

// [Change 1 — #35] Variable font support — single file for both weights.
async function loadVariableFont(): Promise<Buffer | null> {
  try {
    const fontPath = path.join(
      process.cwd(),
      "public",
      "fonts",
      "Montserrat-VariableFont_wght.ttf",
    );
    return await readFile(fontPath);
  } catch {
    return null;
  }
}

export default async function OpengraphImage({
  params,
}: {
  // [Change 2 — #35] params is async in Next.js 16
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getSupabase();

  const { data: logRow } = await supabase
    .from("collection_logs")
    .select(
      "slime_name, brand_name_raw, slime_type, rating_overall, image_url, notes, user_id",
    )
    .eq("id", id)
    .eq("is_public", true)
    .maybeSingle();

  const log = logRow as {
    slime_name: string | null;
    brand_name_raw: string | null;
    slime_type: string | null;
    rating_overall: number | null;
    image_url: string | null;
    notes: string | null;
    user_id: string;
  } | null;

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
  const brandName = log?.brand_name_raw ?? "Unknown brand";
  const rating = log?.rating_overall;
  const typeColor = log?.slime_type
    ? (TYPE_COLORS[log.slime_type] ?? "#39FF14")
    : "#39FF14";
  const typeLabel = log?.slime_type ? log.slime_type.replace(/_/g, " ") : null;

  const fontBuffer = await loadVariableFont();

  const fonts: {
    name: string;
    data: Buffer;
    weight: 400 | 700;
    style: "normal";
  }[] = [];
  if (fontBuffer) {
    fonts.push({
      name: "Montserrat",
      data: fontBuffer,
      weight: 400,
      style: "normal",
    });
    fonts.push({
      name: "Montserrat",
      data: fontBuffer,
      weight: 700,
      style: "normal",
    });
  }

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
          // eslint-disable-next-line @next/next/no-img-element
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

        {/* Brand */}
        <div
          style={{
            fontSize: 24,
            color: "#00F0FF",
            fontWeight: 700,
            marginBottom: 32,
            display: "flex",
          }}
        >
          {brandName}
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
