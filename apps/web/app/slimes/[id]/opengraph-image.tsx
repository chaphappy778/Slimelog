// apps/web/app/users/[username]/opengraph-image.tsx
import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import { readFile } from "fs/promises";
import path from "path";

export const contentType = "image/png";
export const size = { width: 1200, height: 630 };
export const alt = "SlimeLog profile";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSupabase() {
  // [Change 1 — #35] Use plain anon-key client (not createServerClient).
  // OG image routes don't have request cookie context, and we only read
  // public data here.
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// [Change 2 — #35] Static-instance TTF + ArrayBuffer conversion.
// Satori (the engine behind @vercel/og) does NOT support variable fonts —
// they crash with "Cannot read properties of undefined (reading '256')".
// Each weight is loaded from its own static file and converted from Node
// Buffer to ArrayBuffer before being passed to ImageResponse.
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

// ─── Image generator ──────────────────────────────────────────────────────────

export default async function OpengraphImage({
  params,
}: {
  // [Change 3 — #35] params is async in Next.js 16
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = getSupabase();

  const { data } = await supabase
    .from("profiles_public")
    .select(
      "username, display_name, avatar_url, bio, is_verified, is_premium, id",
    )
    .eq("username", username)
    .maybeSingle();

  const profile = data as {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    is_verified: boolean | null;
    is_premium: boolean | null;
    id: string;
  } | null;

  const displayName =
    profile?.display_name ?? profile?.username ?? "SlimeLog user";
  const handle = profile?.username ? `@${profile.username}` : "@slimer";
  const bio = profile?.bio ?? "Rate it. Log it. Love it.";

  // Stat: log count
  let logCount = 0;
  if (profile?.id) {
    const { count } = await supabase
      .from("collection_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .eq("is_public", true)
      .eq("in_collection", true);
    logCount = count ?? 0;
  }

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
        background:
          "radial-gradient(ellipse 60% 80% at 30% 20%, #2D0A4E 0%, #0F0018 60%, #0A0A0A 100%)",
        padding: 80,
        position: "relative",
        fontFamily: "Montserrat, sans-serif",
      }}
    >
      {/* Subtle accent dots */}
      <div
        style={{
          position: "absolute",
          top: 100,
          right: 120,
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: "#39FF14",
          boxShadow: "0 0 24px #39FF14",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 100,
          right: 200,
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "#00F0FF",
          boxShadow: "0 0 16px #00F0FF",
        }}
      />

      {/* Wordmark */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 60,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "linear-gradient(135deg, #39FF14, #00F0FF)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 28,
              height: 22,
              background: "#0A0A0A",
              borderRadius: "50%",
              opacity: 0.85,
            }}
          />
        </div>
        <div
          style={{
            fontSize: 36,
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

      {/* Avatar + name row */}
      <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
        {/* Avatar */}
        <div
          style={{
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: profile?.avatar_url
              ? "transparent"
              : "linear-gradient(135deg, #39FF14, #00F0FF)",
            border: "4px solid rgba(57,255,20,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              width={200}
              height={200}
              style={{ width: 200, height: 200, objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                fontSize: 96,
                fontWeight: 700,
                color: "#0A0A0A",
                display: "flex",
              }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Name + handle + bio */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            maxWidth: 760,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                fontSize: 64,
                fontWeight: 700,
                color: "#fff",
                lineHeight: 1.1,
                display: "flex",
              }}
            >
              {displayName}
            </div>
            {profile?.is_premium && (
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  padding: "6px 14px",
                  borderRadius: 999,
                  background: "rgba(57,255,20,0.15)",
                  color: "#39FF14",
                  border: "2px solid rgba(57,255,20,0.4)",
                  letterSpacing: "0.08em",
                  display: "flex",
                }}
              >
                PRO
              </div>
            )}
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#FF00E5",
              fontWeight: 400,
              display: "flex",
            }}
          >
            {handle}
          </div>
          {bio && (
            <div
              style={{
                fontSize: 22,
                color: "rgba(255,255,255,0.7)",
                lineHeight: 1.4,
                marginTop: 8,
                fontWeight: 400,
                display: "flex",
                maxWidth: 760,
              }}
            >
              {bio.length > 120 ? `${bio.slice(0, 120)}...` : bio}
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: log count + tagline */}
      <div
        style={{
          position: "absolute",
          bottom: 70,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: "#39FF14",
              lineHeight: 1,
              display: "flex",
            }}
          >
            {logCount}
          </div>
          <div
            style={{
              fontSize: 18,
              color: "rgba(255,255,255,0.5)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontWeight: 700,
              display: "flex",
            }}
          >
            Slimes Logged
          </div>
        </div>
        <div
          style={{
            fontSize: 22,
            color: "rgba(255,255,255,0.45)",
            fontWeight: 400,
            display: "flex",
          }}
        >
          Rate it. Log it. Love it.
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: fonts.length > 0 ? fonts : undefined,
    },
  );
}
