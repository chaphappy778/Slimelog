// apps/web/components/leaderboard/BrandTile.tsx
// T107 (2026-07-11 v2): Community header for the selected brand on the
// leaderboard page. Reworked to match the mockup:
//
//   ┌───────────────────────────┐
//   │      hero galaxy          │  ← animated satellites, brand-tinted
//   │   ✦ orbiting  hub  ✦      │
//   │                           │
//   │  [🏆 SLIMEQUEEN'S GALAXY] │  ← rainbow pill overlaying the viz
//   │                           │
//   │ [logo] Cloud Nine  ▾      │  ← identity row → /brands/[slug]
//   │        Butter base · N loggers
//   │                           │
//   │ 18,420 logs by the community 💧
//   │                           │
//   │ [All time]  [This month]  │  ← time window toggle
//   └───────────────────────────┘
//
// The tile now does two jobs at once:
//   1. Show the brand's community totals (all time / this month)
//   2. Call out the top logger, whose "galaxy" the hero visual IS
//
// Under the hood: same anti-AI-art geometry (SVG orbits + satellite
// dots, no character art), density scales with the champion's log
// count so a heavy hitter's galaxy looks bigger.

"use client";

import Link from "next/link";
import { brandColor } from "@/lib/brand-color";
import type {
  LeaderboardBrand,
  LeaderboardEntry,
} from "@/app/leaderboard/LeaderboardClient";

export type LeaderboardWindow = "all_time" | "this_month";

interface Props {
  brand: LeaderboardBrand;
  communityTotal: number;
  leader: LeaderboardEntry | null;
  window: LeaderboardWindow;
  onWindowChange: (w: LeaderboardWindow) => void;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export default function BrandTile({
  brand,
  communityTotal,
  leader,
  window,
  onWindowChange,
}: Props) {
  const loggerWord = brand.logger_count === 1 ? "logger" : "loggers";
  const basePrefix = brand.base_type_label
    ? `${brand.base_type_label} base · `
    : "";

  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        background:
          "radial-gradient(120% 100% at 50% 0%, rgba(120,40,180,0.28), rgba(45,10,78,0.3) 62%)",
        border: "1px solid rgba(45,10,78,0.7)",
      }}
    >
      {/* ── Hero galaxy + champion pill overlay ───────────────────── */}
      <div
        style={{
          position: "relative",
          padding: "26px 16px 18px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <HeroGalaxy brand={brand} leaderCount={leader?.count ?? 0} />
        {leader && <ChampionPill username={leader.username} />}
      </div>

      {/* ── Brand identity row → /brands/[slug] ───────────────────── */}
      <BrandIdentityRow
        brand={brand}
        subline={`${basePrefix}${formatNumber(brand.logger_count)} ${loggerWord}`}
      />

      {/* ── Community total ───────────────────────────────────────── */}
      <div style={{ padding: "12px 16px 6px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 900,
              fontSize: 40,
              letterSpacing: "-0.02em",
              lineHeight: 1,
              background: "linear-gradient(135deg, #39FF14, #00F0FF)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {formatNumber(communityTotal)}
          </span>
          <span
            style={{
              color: "rgba(245,245,245,0.75)",
              fontSize: 13,
              lineHeight: 1.25,
              fontWeight: 600,
            }}
          >
            logs by the
            <br />
            community{" "}
            <span aria-hidden="true">{"\u{1F4A7}"}</span>
          </span>
        </div>
      </div>

      {/* ── Time window toggle ────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "10px 16px 18px",
        }}
      >
        <TimeButton
          active={window === "all_time"}
          onClick={() => onWindowChange("all_time")}
        >
          All time
        </TimeButton>
        <TimeButton
          active={window === "this_month"}
          onClick={() => onWindowChange("this_month")}
        >
          This month
        </TimeButton>
      </div>
    </div>
  );
}

// ─── Brand identity row ─────────────────────────────────────────────

function BrandIdentityRow({
  brand,
  subline,
}: {
  brand: LeaderboardBrand;
  subline: string;
}) {
  const inner = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "4px 16px 0",
      }}
    >
      <BrandLogoTile brand={brand} size={56} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <h2
            className="truncate"
            style={{
              margin: 0,
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 900,
              fontSize: 24,
              color: "#FFFFFF",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            {brand.name}
          </h2>
          {brand.slug && (
            <svg
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.45)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ flexShrink: 0 }}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          )}
        </div>
        <p
          className="truncate"
          style={{
            margin: 0,
            marginTop: 2,
            color: "rgba(245,245,245,0.6)",
            fontSize: 12.5,
          }}
        >
          {subline}
        </p>
      </div>
    </div>
  );

  if (brand.slug) {
    return (
      <Link
        href={`/brands/${brand.slug}`}
        className="block active:scale-[0.99] transition-transform"
      >
        {inner}
      </Link>
    );
  }
  return <div>{inner}</div>;
}

function BrandLogoTile({
  brand,
  size,
}: {
  brand: LeaderboardBrand;
  size: number;
}) {
  const color = brandColor(brand.name_raw);
  const letter = (brand.name || brand.name_raw).trim().charAt(0).toUpperCase();
  if (brand.logo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={brand.logo_url}
        alt=""
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          borderRadius: 14,
          objectFit: "cover",
          flexShrink: 0,
          background: "rgba(0,0,0,0.3)",
          border: `1px solid ${color}`,
          boxShadow: `0 0 14px ${hexToRgba(color, 0.35)}`,
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
        borderRadius: 14,
        background: color,
        color: "#04110A",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontFamily: "Montserrat, sans-serif",
        fontWeight: 900,
        fontSize: 26,
        border: "1px solid rgba(255,255,255,0.15)",
        boxShadow: `0 0 14px ${hexToRgba(color, 0.35)}`,
      }}
    >
      {letter || "?"}
    </div>
  );
}

// ─── Champion pill ──────────────────────────────────────────────────
// Sits at the bottom of the hero galaxy, calling out whose collection
// the visual represents. Rainbow gradient reads celebratory without
// stealing focus from the giant number below.

function ChampionPill({ username }: { username: string }) {
  return (
    <Link
      href={`/users/${username}`}
      style={{
        position: "absolute",
        left: "50%",
        bottom: 6,
        transform: "translateX(-50%)",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 16px",
        borderRadius: 999,
        background:
          "linear-gradient(90deg, #39FF14 0%, #00F0FF 32%, #FF00E5 62%, #FFAE3B 100%)",
        color: "#0B0114",
        fontFamily: "Montserrat, sans-serif",
        fontWeight: 900,
        fontSize: 13,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        textDecoration: "none",
        whiteSpace: "nowrap",
        boxShadow:
          "0 0 22px rgba(255,0,229,0.35), 0 8px 22px rgba(0,0,0,0.35)",
        maxWidth: "90%",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      <TrophyIcon />
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {username}&apos;s galaxy
      </span>
    </Link>
  );
}

function TrophyIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0B0114"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

// ─── Time window toggle ────────────────────────────────────────────

function TimeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="transition-colors"
      style={{
        padding: "8px 16px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 800,
        letterSpacing: "-0.005em",
        fontFamily: "Montserrat, sans-serif",
        cursor: "pointer",
        color: active ? "#04110A" : "rgba(245,245,245,0.85)",
        background: active
          ? "linear-gradient(135deg, #39FF14, #00F0FF)"
          : "rgba(45,10,78,0.5)",
        border: active
          ? "1px solid transparent"
          : "1px solid rgba(255,255,255,0.15)",
        boxShadow: active ? "0 0 14px rgba(57,255,20,0.35)" : "none",
      }}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

// ─── Hero galaxy viz ────────────────────────────────────────────────
// Bigger sibling of MiniGalaxy. Central hub (brand logo/letter) is
// static; orbit rings and satellite dots rotate slowly. Density scales
// with the champion's log count so a deep-collector's galaxy visibly
// out-shines a casual one.

interface Satellite {
  x: number;
  y: number;
  r: number;
  opacity: number;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function seededSatellites(
  seed: string,
  radii: readonly number[],
  count: number,
): Satellite[] {
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
    const baseAngle = (i / count) * Math.PI * 2;
    const jitter = (rand() - 0.5) * 0.8;
    const angle = baseAngle + jitter;
    // Small radial wobble so satellites don't sit perfectly on the ring
    const radialWobble = (rand() - 0.5) * 4;
    const r = orbitR + radialWobble;
    results.push({
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
      r: 1.8 + rand() * 2.4,
      opacity: 0.55 + rand() * 0.4,
    });
  }
  return results;
}

function HeroGalaxy({
  brand,
  leaderCount,
}: {
  brand: LeaderboardBrand;
  leaderCount: number;
}) {
  const color = brandColor(brand.name_raw);
  const size = 240;
  const center = size / 2;
  const hubDiameter = 76;

  // Three orbit rings + one wide sparse outer edge.
  const ringR1 = 60;
  const ringR2 = 82;
  const ringR3 = 104;

  // Satellite count scales with leader depth: 18 baseline for a low-log
  // champion, up to ~48 for a heavy hitter (30+ logs). Caps so we don't
  // over-crowd the viz on very active brands.
  const satCount = Math.min(48, 18 + Math.round(leaderCount * 0.6));
  const satellites = seededSatellites(
    (brand.name_raw || brand.name) + "|hero",
    [ringR1, ringR2, ringR3, ringR2, ringR1, ringR3],
    satCount,
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
      {/* Ambient halo behind the whole thing */}
      <div
        style={{
          position: "absolute",
          inset: -20,
          borderRadius: "50%",
          background: `radial-gradient(circle at 50% 50%, ${hexToRgba(color, 0.18)} 0%, ${hexToRgba(color, 0.04)} 55%, transparent 78%)`,
          pointerEvents: "none",
        }}
      />

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
          {/* Outer orbit — most decorative */}
          <circle
            cx={center}
            cy={center}
            r={ringR3}
            stroke={color}
            strokeOpacity={0.28}
            strokeWidth={1}
            strokeDasharray="3 5"
            fill="none"
          />
          {/* Middle orbit */}
          <circle
            cx={center}
            cy={center}
            r={ringR2}
            stroke={color}
            strokeOpacity={0.38}
            strokeWidth={1}
            strokeDasharray="2 4"
            fill="none"
          />
          {/* Inner orbit — hugs the hub */}
          <circle
            cx={center}
            cy={center}
            r={ringR1}
            stroke={color}
            strokeOpacity={0.5}
            strokeWidth={1}
            strokeDasharray="2 3"
            fill="none"
          />

          {/* Faint connection lines from hub to inner satellites */}
          {satellites.slice(0, 8).map((sat, i) => (
            <line
              key={`ln-${i}`}
              x1={center}
              y1={center}
              x2={center + sat.x}
              y2={center + sat.y}
              stroke={color}
              strokeOpacity={0.12}
              strokeWidth={0.75}
            />
          ))}

          {/* Satellite dots */}
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

      {/* Static hub — logo or letter, sits on top of the SVG */}
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
              background: "rgba(0,0,0,0.35)",
              border: `1px solid ${color}`,
              boxShadow: `0 0 18px ${hexToRgba(color, 0.6)}, inset 0 0 22px ${hexToRgba(color, 0.35)}`,
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              background: `radial-gradient(circle at 35% 30%, ${hexToRgba(color, 0.9)}, ${color} 60%, rgba(0,0,0,0.6) 100%)`,
              color: "#04110A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 900,
              fontSize: 34,
              border: `1px solid ${color}`,
              boxShadow: `0 0 18px ${hexToRgba(color, 0.6)}`,
            }}
          >
            {letter || "?"}
          </div>
        )}
      </div>
    </div>
  );
}
