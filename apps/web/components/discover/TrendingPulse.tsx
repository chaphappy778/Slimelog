// apps/web/components/discover/TrendingPulse.tsx
// [Discover V1 — 2026-07-13] The "Trending this week" pulse widget.
// Gives /discover a heartbeat: logs today + delta vs the 7-day average,
// a mini sparkline of daily log counts, and up to three momentum rows
// (top climbing base types + one spiking tag).
//
// Data comes from the server component in `apps/web/app/discover/page.tsx`
// which aggregates over `collection_logs` (last 8 days) and `tags` (use_count).
// If activity is below the `EARLY_DAYS_THRESHOLD` we render the empty
// state instead — the "SlimeLog is just getting started" seed prompt.
// Pre-launch we'll show the empty state almost always, and that's fine.
//
// Anti-AI-art respected: geometric bars only, line SVG icons, no
// illustration. No em-dashes in any user-facing copy.

import Link from "next/link";

// Below this total-logs-in-last-7-days count, we drop the pulse and
// render the "seed the community" empty state instead. Keeps the
// widget from looking sad pre-launch.
//
// 2026-07-13: lowered from 20 → 5 while we're in internal testing so
// the pulse actually renders against real (thin) data. Nudge back up
// to 20 or higher before public launch — a 5-log pulse feels sparse
// once we have a real user base.
export const EARLY_DAYS_THRESHOLD = 5;

export interface MomentumRow {
  /** Icon / rank marker on the left. "up" renders a small arrow. */
  marker: "up" | "hot";
  /** Bold label for the row, e.g. "Butter" or "#galaxy". */
  label: string;
  /** Muted sub-label, e.g. "is heating up". */
  sub: string | null;
  /** Delta line on the right, e.g. "+240 logs". */
  delta: string;
}

export interface TrendingPulseProps {
  /** Logs today (start-of-day boundary in server tz). */
  logsToday: number;
  /** Total logs in the trailing 7 days. Used to derive avg + delta. */
  logsLast7Days: number;
  /** Daily log counts, oldest → newest. Length 7. */
  sparkline: number[];
  /** Up to 3 momentum rows. */
  momentum: MomentumRow[];
}

export default function TrendingPulse({
  logsToday,
  logsLast7Days,
  sparkline,
  momentum,
}: TrendingPulseProps) {
  // Guard: if we're below the threshold, don't render the pulse at
  // all. The parent surfaces the early-days empty state in its place.
  if (logsLast7Days < EARLY_DAYS_THRESHOLD) return null;

  // Delta vs the 7-day daily average.
  const avgPerDay = logsLast7Days / 7;
  const pct =
    avgPerDay > 0 ? Math.round(((logsToday - avgPerDay) / avgPerDay) * 100) : 0;
  const deltaLabel =
    pct === 0 ? "on trend" : pct > 0 ? `↑ ${pct}% vs avg` : `↓ ${Math.abs(pct)}% vs avg`;
  const deltaColor =
    pct > 5 ? "#7BFF7B" : pct < -5 ? "#FF7BEB" : "rgba(245,245,245,0.6)";

  // Normalize the sparkline to 0..1 for bar heights.
  const maxSpark = Math.max(1, ...sparkline);

  return (
    <div className="px-4 pb-4">
      <div
        className="flex items-center justify-between mb-2.5"
        aria-hidden="true"
      >
        <p className="section-label">Trending this week</p>
        <div className="flex items-center gap-1.5">
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#39FF14",
              boxShadow: "0 0 8px #39FF14",
              display: "inline-block",
            }}
          />
          <span
            className="text-[10.5px] font-black uppercase"
            style={{
              color: "#7BFF7B",
              letterSpacing: "0.14em",
              fontFamily: "Montserrat, sans-serif",
            }}
          >
            Live
          </span>
        </div>
      </div>

      <div
        className="rounded-2xl px-4 pt-4 pb-3"
        style={{
          background:
            "linear-gradient(135deg, rgba(45,10,78,0.5), rgba(16,0,32,0.4))",
          border: "1px solid rgba(45,10,78,0.7)",
          boxShadow: "0 0 22px rgba(0,240,255,0.10)",
        }}
      >
        {/* Big-number row + sparkline. */}
        <div className="flex items-end justify-between gap-3">
          <div>
            <div
              className="tabular-nums"
              style={{
                fontFamily: "Montserrat, sans-serif",
                fontWeight: 900,
                fontSize: 40,
                lineHeight: 0.9,
                letterSpacing: "-0.03em",
                color: "#FFFFFF",
              }}
            >
              {logsToday.toLocaleString()}
            </div>
            <div
              className="mt-1.5 text-[11.5px]"
              style={{ color: "rgba(245,245,245,0.6)" }}
            >
              logs today
              {" · "}
              <span style={{ color: deltaColor, fontWeight: 700 }}>
                {deltaLabel}
              </span>
            </div>
          </div>

          {/* 7-bar sparkline. Newest bar on the right. */}
          <div
            className="flex items-end gap-[3px]"
            style={{ height: 40 }}
            aria-label="Logs per day, last 7 days"
          >
            {sparkline.map((v, i) => {
              const heightPct = Math.max(8, (v / maxSpark) * 100);
              const isToday = i === sparkline.length - 1;
              return (
                <span
                  key={i}
                  style={{
                    width: 6,
                    height: `${heightPct}%`,
                    borderRadius: 3,
                    background: isToday
                      ? "linear-gradient(0deg, rgba(57,255,20,0.5), #39FF14)"
                      : "linear-gradient(0deg, rgba(57,255,20,0.15), rgba(57,255,20,0.85))",
                    display: "block",
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Momentum rows. Empty is fine, gracefully hidden. */}
        {momentum.length > 0 && (
          <div className="mt-3">
            {momentum.map((row, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 py-2"
                style={{
                  borderTop:
                    i === 0
                      ? undefined
                      : "1px solid rgba(120,60,180,0.18)",
                }}
              >
                <span
                  className="tabular-nums shrink-0"
                  style={{
                    color: "rgba(245,245,245,0.5)",
                    fontSize: 11,
                    width: 22,
                    textAlign: "center",
                  }}
                  aria-hidden="true"
                >
                  {row.marker === "up" ? "↑" : ""}
                </span>
                {row.marker === "hot" && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#FF7A2E"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="shrink-0 -ml-3"
                  >
                    <path d="M12 2c1.5 3 4 4.5 4 8a4 4 0 1 1-8 0c0-1.5.5-2.5 1-3.5 0 2 1 3 2 3 0-3-1-5 1-7.5Z" />
                  </svg>
                )}
                <div className="flex-1 min-w-0 text-[13px] leading-tight">
                  <span
                    className="mr-1"
                    style={{
                      fontFamily: "Montserrat, sans-serif",
                      fontWeight: 800,
                      color: "#FFFFFF",
                    }}
                  >
                    {row.label}
                  </span>
                  {row.sub && (
                    <span style={{ color: "rgba(245,245,245,0.7)" }}>
                      {row.sub}
                    </span>
                  )}
                </div>
                <span
                  className="shrink-0 text-[11.5px] font-bold tabular-nums"
                  style={{ color: "#7BFF7B" }}
                >
                  {row.delta}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Early-days empty state ────────────────────────────────────────────
// Renders when logsLast7Days < EARLY_DAYS_THRESHOLD. Not a Pulse
// component per se — a seed-the-community prompt in its place. Kept in
// the same file so it's easy to swap based on the threshold.

export function TrendingPulseEmpty() {
  return (
    <div className="px-4 pb-4">
      <div
        className="flex items-center justify-between mb-2.5"
        aria-hidden="true"
      >
        <p className="section-label">This week</p>
        <span
          className="text-[10.5px] font-black uppercase"
          style={{
            color: "#FFAE3B",
            letterSpacing: "0.14em",
            fontFamily: "Montserrat, sans-serif",
          }}
        >
          Day one
        </span>
      </div>

      <div
        className="rounded-2xl px-5 py-6 text-center"
        style={{
          background: "rgba(45,10,78,0.20)",
          border: "1px dashed rgba(120,60,180,0.55)",
        }}
      >
        {/* Sprout glyph, line SVG. Anti-AI-art rule. */}
        <svg
          width="30"
          height="30"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#39FF14"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="mx-auto"
          style={{ filter: "drop-shadow(0 0 8px rgba(57,255,20,0.5))" }}
        >
          <path d="M12 22V12" />
          <path d="M12 12c-2-4-6-5-9-5 0 5 3 8 9 8" />
          <path d="M12 12c2-4 6-5 9-5 0 5-3 8-9 8" />
        </svg>
        <div
          className="mt-3"
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 800,
            fontSize: 16,
            color: "#FFFFFF",
            letterSpacing: "-0.01em",
          }}
        >
          SlimeLog is just getting started
        </div>
        <p
          className="mt-1.5 text-[12.5px] leading-snug"
          style={{ color: "rgba(245,245,245,0.7)" }}
        >
          Every slime you log seeds the community pulse. Be one of the
          first shelves. The trending board fills in as people log.
        </p>
        <Link
          href="/log"
          className="mt-4 inline-flex items-center gap-1.5 rounded-full font-black"
          style={{
            padding: "9px 18px",
            fontSize: 12.5,
            fontFamily: "Montserrat, sans-serif",
            background: "linear-gradient(135deg, #39FF14, #00F0FF)",
            color: "#04110A",
            boxShadow: "0 0 14px rgba(57,255,20,0.5)",
            textDecoration: "none",
          }}
        >
          Log your first slime
          <svg
            width="14"
            height="14"
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
    </div>
  );
}
