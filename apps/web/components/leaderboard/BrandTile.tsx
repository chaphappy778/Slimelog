// apps/web/components/leaderboard/BrandTile.tsx
// T107 (2026-07-11): Community header for the selected brand on the
// leaderboard page. Mini galaxy viz + brand name + logger count +
// giant gradient community total, plus a Champion strip for rank 1.
//
// 2026-07-11 refinement:
//   - Top block (identity row + community total) is a Link to
//     /brands/[slug] when the brand is catalogued.
//   - Bottom "Champion" strip is a sibling Link to /users/[username]
//     when a leader exists (nested anchors are avoided by keeping the
//     two Links as siblings inside the shared card shell).
//   - Base type fragment is dropped from the subline — the tile
//     aggregates every log for the brand regardless of base type.
//   - The old flat 56x56 logo tile is replaced with an 84x84 SVG
//     "mini galaxy": brand-coloured dashed orbits with deterministic
//     satellite dots orbiting around a static hub (logo or letter).

"use client";

import Link from "next/link";
import { brandColor } from "@/lib/brand-color";
import type {
  LeaderboardBrand,
  LeaderboardEntry,
} from "@/app/leaderboard/LeaderboardClient";

interface Props {
  brand: LeaderboardBrand;
  communityTotal: number;
  leader: LeaderboardEntry | null;
}

const GOLD = "#FFD24A";

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export default function BrandTile({ brand, communityTotal, leader }: Props) {
  const logger_word = brand.logger_count === 1 ? "logger" : "loggers";

  const topBlock = (
    <>
      <div className="flex items-center gap-3">
        <MiniGalaxy brand={brand} size={84} />
        <div className="min-w-0 flex-1">
          <h2
            className="text-white truncate"
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 900,
              fontSize: 22,
              letterSpacing: "-0.01em",
              lineHeight: 1.15,
            }}
          >
            {brand.name}
          </h2>
          <p
            className="text-xs truncate"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            {formatNumber(brand.logger_count)} {logger_word}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 900,
            fontSize: 44,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            background: "linear-gradient(135deg, #39FF14, #00F0FF)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {formatNumber(communityTotal)}
        </div>
        <p
          className="text-sm mt-1"
          style={{ color: "rgba(245,245,245,0.7)" }}
        >
          logs by the community <span aria-hidden="true">{"\u{1F4A7}"}</span>
        </p>
        <p
          className="text-[11px] mt-1"
          style={{
            color: "rgba(245,245,245,0.4)",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          All time
        </p>
      </div>
    </>
  );

  const topWrapped = brand.slug ? (
    <Link
      href={`/brands/${brand.slug}`}
      className="block active:scale-[0.99] transition-transform"
    >
      {topBlock}
    </Link>
  ) : (
    <div>{topBlock}</div>
  );

  return (
    <div
      className="rounded-3xl p-4"
      style={{
        background: "rgba(45,10,78,0.3)",
        border: "1px solid rgba(45,10,78,0.7)",
      }}
    >
      {topWrapped}

      {leader && (
        <>
          <div
            className="mt-4"
            style={{
              height: 1,
              background: "rgba(45,10,78,0.7)",
              width: "100%",
            }}
          />
          <ChampionStrip brand={brand} leader={leader} />
        </>
      )}
    </div>
  );
}

// ─── Champion strip ───────────────────────────────────────────────────

function ChampionStrip({
  brand,
  leader,
}: {
  brand: LeaderboardBrand;
  leader: LeaderboardEntry;
}) {
  return (
    <Link
      href={`/users/${leader.username}`}
      className="block mt-3 active:scale-[0.99] transition-transform"
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: GOLD,
          marginBottom: 6,
        }}
      >
        The {brand.name} Champion
      </div>
      <div className="flex items-center gap-3">
        <CrownIcon />
        <LeaderAvatar entry={leader} />
        <div className="min-w-0 flex-1">
          <div
            className="text-sm truncate text-white"
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 600,
            }}
          >
            @{leader.username}
          </div>
        </div>
        <div
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 900,
            fontSize: 15,
            color: GOLD,
            flexShrink: 0,
          }}
        >
          {formatNumber(leader.count)} logs
        </div>
      </div>
    </Link>
  );
}

function CrownIcon() {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke={GOLD}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M2 4l3 12h14l3-12-6 7-4-9-4 9-6-7z" />
    </svg>
  );
}

function LeaderAvatar({ entry }: { entry: LeaderboardEntry }) {
  const size = 32;
  if (entry.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={entry.avatar_url}
        alt=""
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
          background: "rgba(0,0,0,0.4)",
        }}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #39FF14, #00F0FF)",
        flexShrink: 0,
      }}
    />
  );
}

// ─── Mini galaxy viz ──────────────────────────────────────────────────
// Pure SVG geometry (per anti-AI-art rule) — no character illustrations.
// Central hub (brand logo or letter fallback) stays put; orbit rings and
// satellite dots rotate together in a slow drift on non-reduced-motion.

interface Satellite {
  x: number;
  y: number;
  r: number;
  opacity: number;
}

function seededSatellites(
  seed: string,
  radii: readonly number[],
  count: number,
): Satellite[] {
  // Deterministic PRNG (mulberry32 with a djb2-ish int hash seed).
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  let state = (Math.abs(h) || 1) >>> 0;
  const rand = (): number => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const results: Satellite[] = [];
  for (let i = 0; i < count; i++) {
    const ringIdx = i % radii.length;
    const orbitR = radii[ringIdx];
    // Evenly-ish spaced base angle + jitter so brands still feel distinct.
    const baseAngle = (i / count) * Math.PI * 2;
    const jitter = (rand() - 0.5) * 1.0;
    const angle = baseAngle + jitter;
    results.push({
      x: Math.cos(angle) * orbitR,
      y: Math.sin(angle) * orbitR,
      r: 1.6 + rand() * 1.6,
      opacity: 0.55 + rand() * 0.35,
    });
  }
  return results;
}

function MiniGalaxy({
  brand,
  size,
}: {
  brand: LeaderboardBrand;
  size: number;
}) {
  const color = brandColor(brand.name_raw);
  const center = size / 2;
  const hubDiameter = Math.round(size * 0.4); // ~34 for size 84
  const innerR = Math.round(size * 0.34); // ~29
  const outerR = Math.round(size * 0.46); // ~39
  const satellites = seededSatellites(
    brand.name_raw || brand.name,
    [innerR, outerR, innerR, outerR, innerR, outerR],
    6,
  );
  const letter = (brand.name || brand.name_raw).trim().charAt(0).toUpperCase();

  return (
    <div
      aria-hidden="true"
      style={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          overflow: "visible",
        }}
      >
        <g className="slime-orbit-rotate">
          {/* Outer orbit */}
          <circle
            cx={center}
            cy={center}
            r={outerR}
            stroke={color}
            strokeOpacity={0.35}
            strokeWidth={1}
            strokeDasharray="3 4"
            fill="none"
          />
          {/* Inner orbit */}
          <circle
            cx={center}
            cy={center}
            r={innerR}
            stroke={color}
            strokeOpacity={0.5}
            strokeWidth={1}
            strokeDasharray="2 3"
            fill="none"
          />
          {satellites.map((sat, i) => (
            <circle
              key={i}
              cx={center + sat.x}
              cy={center + sat.y}
              r={sat.r}
              fill={color}
              fillOpacity={sat.opacity}
            />
          ))}
        </g>
      </svg>

      {/* Static hub — sits on top of the SVG, does not rotate. */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: hubDiameter,
          height: hubDiameter,
        }}
      >
        {brand.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brand.logo_url}
            alt=""
            width={hubDiameter}
            height={hubDiameter}
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              objectFit: "cover",
              background: "rgba(0,0,0,0.3)",
              border: `1px solid ${color}`,
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              background: color,
              color: "#04110A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 900,
              fontSize: Math.round(hubDiameter * 0.5),
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            {letter || "?"}
          </div>
        )}
      </div>
    </div>
  );
}
