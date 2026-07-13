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
  /**
   * Row type. `up` = arrow marker (base type or specific slime),
   * `hot` = flame marker (tag spiking). The visual delta between
   * these is what gives the pulse variety at scan — three ↑ rows
   * in a row read as one type of thing.
   */
  marker: "up" | "hot";
  /** Bold label for the row, e.g. "Butter" or "#galaxy". */
  label: string;
  /** Muted sub-label, e.g. "is heating up" or brand name. */
  sub: string | null;
  /** Delta line on the right, e.g. "+240 logs" or "climbing". */
  delta: string;
  /** Optional deep-link the whole row navigates to on tap. */
  href?: string;
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
          {/* Live dot pulses at 1.4s. Uses `pulse-live` keyframes
              declared once in globals.css so multiple pulse widgets
              on the page share the animation. */}
          <span
            className="pulse-live"
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#39FF14",
              boxShadow: "0 0 10px #39FF14",
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
            "linear-gradient(135deg, rgba(65,20,110,0.55), rgba(30,8,55,0.45))",
          // 2026-07-13: brighter purple border so the card lifts off
          // the wrapper background instead of blending in.
          border: "1px solid rgba(155,90,220,0.55)",
          boxShadow:
            "0 0 26px rgba(0,240,255,0.12), inset 0 0 20px rgba(120,60,200,0.10)",
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

          {/* 7-bar sparkline with day-letter labels. Newest bar on the
              right (today, highlighted). Labels give the "green bars"
              real context so users can tell what they're looking at. */}
          <SparklineWithLabels values={sparkline} maxValue={maxSpark} />
        </div>

        {/* Total-logs-this-week summary sits under the top row for
            extra context. Reads as "220 logs · past 7 days" — makes
            the sparkline scale explicit. */}
        <div
          className="mt-2 flex items-center gap-2 text-[11px]"
          style={{ color: "rgba(245,245,245,0.5)" }}
        >
          <span
            className="tabular-nums font-bold"
            style={{ color: "rgba(245,245,245,0.85)" }}
          >
            {logsLast7Days.toLocaleString()}
          </span>
          <span>logs · past 7 days</span>
        </div>

        {/* Momentum rows. Empty is fine, gracefully hidden. Each row
            can optionally deep-link on tap when `href` is set — used
            for the specific-slime row so users can jump straight into
            the top-climbing detail page. */}
        {momentum.length > 0 && (
          <div className="mt-3">
            {momentum.map((row, i) => (
              <MomentumRowRender key={i} row={row} showTopBorder={i > 0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sparkline with day labels ────────────────────────────────────────
// A vertical bar chart of the last 7 days' log counts + a row of
// day letters below so users can decode the scale at a glance. The
// letter for "today" is highlighted brighter so the newest bar is
// unambiguous. Bars scale by max of the series so the tallest bar
// always hits ~90-100% of the container height.

function dayLetterForOffset(offset: number): string {
  // offset 0 = 6 days ago, offset 6 = today.
  const daysAgo = 6 - offset;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  // "S M T W T F S" — 2-letter abbrevs would be clearer but eat
  // horizontal space we don't have on a 7-bar mini chart.
  return "SMTWTFS"[d.getDay()];
}

function SparklineWithLabels({
  values,
  maxValue,
}: {
  values: number[];
  maxValue: number;
}) {
  return (
    <div
      className="flex flex-col items-end shrink-0"
      role="img"
      aria-label="Logs per day for the past 7 days"
    >
      <div className="flex items-end gap-[4px]" style={{ height: 40 }}>
        {values.map((v, i) => {
          const heightPct = Math.max(8, (v / Math.max(1, maxValue)) * 100);
          const isToday = i === values.length - 1;
          return (
            <span
              key={i}
              title={`${v} logs`}
              style={{
                width: 7,
                height: `${heightPct}%`,
                borderRadius: 3,
                background: isToday
                  ? "linear-gradient(0deg, rgba(57,255,20,0.55), #39FF14)"
                  : "linear-gradient(0deg, rgba(57,255,20,0.18), rgba(57,255,20,0.85))",
                boxShadow: isToday
                  ? "0 0 10px rgba(57,255,20,0.55)"
                  : undefined,
                display: "block",
              }}
            />
          );
        })}
      </div>
      <div
        className="flex gap-[4px] mt-1.5"
        aria-hidden="true"
        style={{ letterSpacing: "0.02em" }}
      >
        {values.map((_, i) => {
          const isToday = i === values.length - 1;
          return (
            <span
              key={i}
              className="tabular-nums text-center"
              style={{
                width: 7,
                fontSize: 9,
                fontWeight: isToday ? 900 : 600,
                color: isToday ? "#7BFF7B" : "rgba(245,245,245,0.4)",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              {dayLetterForOffset(i)}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── Single momentum row ──────────────────────────────────────────────
// Extracted so we can conditionally wrap in a Link when the row has an
// href (specific-slime rows). Border, marker, label, sub, and delta
// treatment all live here.

function MomentumRowRender({
  row,
  showTopBorder,
}: {
  row: MomentumRow;
  showTopBorder: boolean;
}) {
  const body = (
    <div
      className="flex items-center gap-2.5 py-2"
      style={{
        borderTop: showTopBorder
          ? "1px solid rgba(120,60,180,0.18)"
          : undefined,
      }}
    >
      <span
        className="shrink-0 grid place-items-center"
        style={{ width: 22 }}
        aria-hidden="true"
      >
        {row.marker === "up" ? (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#7BFF7B"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M13 5l7 7-7 7" style={{ transform: "rotate(-45deg)", transformOrigin: "center" }} />
          </svg>
        ) : (
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FF7A2E"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2c1.5 3 4 4.5 4 8a4 4 0 1 1-8 0c0-1.5.5-2.5 1-3.5 0 2 1 3 2 3 0-3-1-5 1-7.5Z" />
          </svg>
        )}
      </span>
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
          <span
            style={{
              color: "rgba(245,245,245,0.65)",
              fontSize: 12,
            }}
          >
            {row.sub}
          </span>
        )}
      </div>
      <span
        className="shrink-0 text-[11.5px] font-bold tabular-nums"
        style={{
          color: row.marker === "hot" ? "#FFB870" : "#7BFF7B",
        }}
      >
        {row.delta}
      </span>
    </div>
  );

  if (row.href) {
    return (
      <Link href={row.href} className="block">
        {body}
      </Link>
    );
  }
  return body;
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
