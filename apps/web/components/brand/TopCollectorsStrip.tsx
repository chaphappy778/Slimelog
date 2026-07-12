// apps/web/components/brand/TopCollectorsStrip.tsx
// T107 part (b) — 2026-07-11.
//
// Closes the discovery loop between /brands/[slug] and /leaderboard.
// Shows the top 5 users who have logged the most slimes from this
// brand, with a "See full leaderboard →" pill that jumps to the
// leaderboard scoped to this brand.
//
// Presentational only — data is fetched server-side in the parent
// page and passed in. Gold treatment for rank 1 mirrors the leaderboard
// ranked list, so the two surfaces feel like one system.

import Link from "next/link";

export interface TopCollector {
  rank: number;
  username: string;
  avatar_url: string | null;
  count: number;
}

interface Props {
  brandName: string;
  brandSlug: string;
  collectors: TopCollector[];
}

const GOLD = "#FFD24A";

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

function medalFor(rank: number): string | null {
  if (rank === 1) return "\u{1F947}"; // 🥇
  if (rank === 2) return "\u{1F948}"; // 🥈
  if (rank === 3) return "\u{1F949}"; // 🥉
  return null;
}

export default function TopCollectorsStrip({
  brandName,
  brandSlug,
  collectors,
}: Props) {
  return (
    <section className="px-4 mt-8">
      <div className="flex items-center justify-between mb-3">
        <p
          className="text-[11px] font-black tracking-widest uppercase"
          style={{ color: "#00F0FF" }}
        >
          Top Collectors
        </p>
        <Link
          href={`/leaderboard?brand=${brandSlug}`}
          className="inline-flex items-center gap-1 text-[11px] font-bold"
          style={{ color: "#FF00E5" }}
        >
          See full leaderboard
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "rgba(45,10,78,0.3)",
          border: "1px solid rgba(45,10,78,0.7)",
        }}
      >
        {collectors.map((collector, i) => (
          <CollectorRow
            key={collector.username}
            collector={collector}
            brandName={brandName}
            isLast={i === collectors.length - 1}
          />
        ))}
      </div>
    </section>
  );
}

function CollectorRow({
  collector,
  brandName,
  isLast,
}: {
  collector: TopCollector;
  brandName: string;
  isLast: boolean;
}) {
  const isChampion = collector.rank === 1;
  const medal = medalFor(collector.rank);
  return (
    <Link
      href={`/users/${collector.username}`}
      className="flex items-center gap-3 px-3 py-2.5 active:scale-[0.99] transition-transform"
      style={{
        borderBottom: isLast
          ? "none"
          : "1px solid rgba(45,10,78,0.55)",
        background: isChampion ? "rgba(255,210,74,0.06)" : "transparent",
      }}
    >
      <div
        style={{
          width: 26,
          textAlign: "center",
          flexShrink: 0,
          fontFamily: "Montserrat, sans-serif",
          fontWeight: 800,
          fontSize: medal ? 18 : 14,
          color: isChampion ? GOLD : "rgba(245,245,245,0.6)",
        }}
      >
        {medal ?? collector.rank}
      </div>

      <CollectorAvatar
        avatarUrl={collector.avatar_url}
        isChampion={isChampion}
      />

      <div className="min-w-0 flex-1">
        <div
          className="truncate"
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 700,
            fontSize: 13.5,
            color: "#FFFFFF",
          }}
        >
          @{collector.username}
        </div>
        {isChampion && (
          <div
            className="truncate"
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: GOLD,
              marginTop: 1,
            }}
          >
            The {brandName} Champion
          </div>
        )}
      </div>

      <div
        style={{
          textAlign: "right",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 900,
            fontSize: 15,
            lineHeight: 1,
            color: isChampion ? GOLD : "#FFFFFF",
          }}
        >
          {formatNumber(collector.count)}
        </div>
        <div
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "rgba(245,245,245,0.4)",
            marginTop: 2,
          }}
        >
          Logs
        </div>
      </div>
    </Link>
  );
}

function CollectorAvatar({
  avatarUrl,
  isChampion,
}: {
  avatarUrl: string | null;
  isChampion: boolean;
}) {
  const size = 34;
  const commonStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    flexShrink: 0,
    background: "rgba(0,0,0,0.4)",
    border: isChampion
      ? `1px solid ${GOLD}`
      : "1px solid rgba(255,255,255,0.15)",
    boxShadow: isChampion
      ? `0 0 10px ${GOLD}55`
      : "none",
  };
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        width={size}
        height={size}
        style={{ ...commonStyle, objectFit: "cover" }}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      style={{
        ...commonStyle,
        background: "linear-gradient(135deg, #39FF14, #00F0FF)",
      }}
    />
  );
}
