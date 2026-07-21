"use client";
// apps/web/components/collection/SlimeDetailCareSection.tsx
//
// T188 Part 2 + T138 (2026-07-21): the collapsible Care section on
// /slimes/[id]. Folds the three care surfaces that used to stack down the
// page (owner aging banner, recommended cadence strip, Pro care-plan CTA)
// into one cyan-glow card. On mobile it renders inline and collapsed by
// default; on desktop it lives in a sticky right sidebar, expanded by
// default. Both instances share this component and toggle independently.
//
// Pure display + a useState toggle. All the day math is computed on the
// server (this page is a server component) and passed in as primitives so
// there is no Date usage or hydration drift here. No server actions live
// in this file.

import { useState } from "react";

interface Props {
  /** Start expanded? Mobile passes false, desktop sidebar passes true. */
  defaultOpen: boolean;
  /** Viewer is the log owner (controls the Pro CTA). */
  isOwner: boolean;
  /** Viewer has an active Pro subscription. */
  isPro: boolean;
  /** Whole days since the log was created (how long you have had it). */
  ownedDays: number;
  /** Whole days since the last recorded check-in. */
  daysSinceCheck: number;
  /** Whether last_checked_at is set (vs. never checked). */
  hasBeenChecked: boolean;
  /** Effective check-in interval for this slime, in days. */
  intervalDays: number;
  /** Days remaining until the next check-in is due (0 = due now). */
  daysToGo: number;
  /** Progress toward the next check-in, 0-100. */
  progressPct: number;
  /** Recommended cadence for the base type, in days (header pill). */
  cadenceDays: number;
  /** Lower-cased base-type label for the cadence copy, or null. */
  baseTypeLabel: string | null;
  /** Deep link to the care-plan editor for this log (Pro owners). */
  careHref: string;
}

function dayWord(n: number) {
  return n === 1 ? "day" : "days";
}

export default function SlimeDetailCareSection({
  defaultOpen,
  isOwner,
  isPro,
  ownedDays,
  daysSinceCheck,
  hasBeenChecked,
  intervalDays,
  daysToGo,
  progressPct,
  cadenceDays,
  baseTypeLabel,
  careHref,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  const collapsedSummary = hasBeenChecked
    ? `Checked ${daysSinceCheck} ${dayWord(daysSinceCheck)} ago. Next check due in about ${daysToGo} ${dayWord(daysToGo)}.`
    : `Not checked yet. First check due in about ${daysToGo} ${dayWord(daysToGo)}.`;

  const cadenceSubject = baseTypeLabel ? `${baseTypeLabel} slimes` : "this slime";

  return (
    <div
      style={{
        background: "rgba(45,10,78,0.25)",
        border: "1px solid rgba(0,240,255,0.55)",
        borderRadius: 16,
        backdropFilter: "blur(8px)",
        boxShadow: "0 0 22px rgba(0,240,255,0.10)",
      }}
    >
      {/* Header (toggle) */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "15px 16px",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#00F0FF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{ flexShrink: 0 }}
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        <span
          className="mont"
          style={{
            fontWeight: 900,
            fontSize: 15,
            letterSpacing: "0.06em",
            color: "#00F0FF",
            fontFamily: "Montserrat, Inter, sans-serif",
          }}
        >
          CARE
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "3px 9px",
            borderRadius: 999,
            background: "rgba(0,240,255,0.12)",
            border: "1px solid rgba(0,240,255,0.35)",
            color: "#7DF6FF",
            fontSize: 11,
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          typical: {cadenceDays}d
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#00F0FF"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{
            marginLeft: "auto",
            flexShrink: 0,
            transform: open ? "rotate(0deg)" : "rotate(-90deg)",
            transition: "transform 160ms ease",
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Collapsed summary */}
      {!open && (
        <div
          style={{
            padding: "0 16px 15px",
            color: "rgba(245,245,245,0.65)",
            fontSize: 13.5,
            lineHeight: 1.45,
          }}
        >
          {collapsedSummary}
        </div>
      )}

      {/* Expanded body */}
      {open && (
        <div
          style={{
            padding: "0 16px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {/* Aging banner */}
          <div
            style={{
              background: "rgba(0,240,255,0.06)",
              border: "1px solid rgba(0,240,255,0.22)",
              borderRadius: 12,
              padding: "13px 14px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span
                style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}
              >
                You&apos;ve had this{" "}
                <span
                  className="mont"
                  style={{
                    fontWeight: 900,
                    color: "#00F0FF",
                    fontFamily: "Montserrat, Inter, sans-serif",
                  }}
                >
                  {ownedDays} {dayWord(ownedDays)}
                </span>
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: "rgba(245,245,245,0.4)",
                  whiteSpace: "nowrap",
                }}
              >
                {hasBeenChecked
                  ? `last checked ${daysSinceCheck}d ago`
                  : "not checked yet"}
              </span>
            </div>
            <div
              style={{
                height: 7,
                borderRadius: 999,
                background: "rgba(45,10,78,0.6)",
                overflow: "hidden",
                marginTop: 10,
              }}
            >
              <div
                style={{
                  width: `${progressPct}%`,
                  height: "100%",
                  borderRadius: 999,
                  background: "linear-gradient(90deg, #00F0FF, #FF00E5)",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: "rgba(245,245,245,0.4)",
                marginTop: 6,
              }}
            >
              <span>
                {daysSinceCheck} of {intervalDays} days
              </span>
              <span>
                {daysToGo} {dayWord(daysToGo)} to go
              </span>
            </div>
          </div>

          {/* Recommended cadence + Pro CTA */}
          <div
            style={{
              border: "1px solid rgba(45,10,78,0.7)",
              borderRadius: 12,
              padding: 14,
              background: "rgba(45,10,78,0.18)",
            }}
          >
            <div
              className="mont"
              style={{
                fontWeight: 800,
                fontSize: 10.5,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "rgba(245,245,245,0.65)",
                marginBottom: 8,
                fontFamily: "Montserrat, Inter, sans-serif",
              }}
            >
              Recommended cadence
            </div>
            <div
              style={{
                fontSize: 13.5,
                lineHeight: 1.5,
                color: "rgba(245,245,245,0.85)",
              }}
            >
              Check{" "}
              <b style={{ color: "#fff" }}>{cadenceSubject}</b> about every{" "}
              <b style={{ color: "#fff" }}>
                {cadenceDays} {dayWord(cadenceDays)}
              </b>
              . This is a starting point (your slime may need more or less
              depending on storage, humidity, and how often you play with it).
            </div>

            {/* Owner-only care-plan CTA */}
            {isOwner &&
              (isPro ? (
                <a
                  href={careHref}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    marginTop: 12,
                    padding: "11px 14px",
                    borderRadius: 12,
                    background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                    color: "#0A0A0A",
                    fontSize: 13.5,
                    fontWeight: 800,
                    textDecoration: "none",
                    fontFamily: "Montserrat, Inter, sans-serif",
                    boxShadow: "0 0 12px rgba(0,240,255,0.35)",
                  }}
                >
                  Manage this slime&apos;s care plan →
                </a>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    marginTop: 12,
                    padding: "10px 12px",
                    borderRadius: 12,
                    background: "rgba(255,210,74,0.06)",
                    border: "1px solid rgba(255,210,74,0.35)",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: "rgba(255,210,74,0.85)",
                      lineHeight: 1.4,
                    }}
                  >
                    Go Pro to unlock care plans. Set your own cadence and notes
                    for this slime.
                  </p>
                  <a
                    href="/settings/subscription"
                    className="mont"
                    style={{
                      flexShrink: 0,
                      fontSize: 11,
                      fontWeight: 800,
                      borderRadius: 999,
                      padding: "6px 12px",
                      color: "#0A0A0A",
                      background: "linear-gradient(135deg, #FFD24A, #FFAE3B)",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                      fontFamily: "Montserrat, Inter, sans-serif",
                    }}
                  >
                    Go Pro
                  </a>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
