// apps/web/components/how-to-rate/AxisSection.tsx
// T32e (2026-07-13): The per-axis section body for /how-to-rate. Renders
// a big neon gradient hero card with a wave-of-lines decoration, then
// the axis definition, "what to look for" bullets, low/high score
// examples with LowHighBar visualizations, an optional magenta note
// callout, and a "See top-rated slimes on {axis}" deep-link.

import Link from "next/link";
import type { CSSProperties } from "react";
import type { RatingAxis } from "@/app/how-to-rate/content";
import LowHighBar from "./LowHighBar";

const BLOCK_LABEL_STYLE: CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.09em",
  textTransform: "uppercase",
  color: "#00F0FF",
  margin: "22px 0 8px",
  fontFamily: "Montserrat, sans-serif",
};

const PROSE_STYLE: CSSProperties = {
  color: "rgba(245,245,245,0.88)",
  fontSize: 14,
  lineHeight: 1.65,
  margin: 0,
};

interface AxisSectionProps {
  axis: RatingAxis;
}

export default function AxisSection({ axis }: AxisSectionProps) {
  // When the axis has an `accentGradient`, we render the axis name as
  // gradient text (used for "Overall"). Otherwise the name renders in
  // solid `accentColor`.
  const nameTextStyle: CSSProperties = axis.accentGradient
    ? {
        background: axis.accentGradient,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        WebkitTextFillColor: "transparent",
        // Fallback for browsers that ignore -webkit-text-fill-color.
        color: "transparent",
      }
    : { color: axis.accentColor };

  return (
    <section
      id={axis.slug}
      className="px-4 pt-10"
      style={{ scrollMarginTop: 116 }}
    >
      {/* ── Section header ───────────────────────────────────────── */}
      <div className="mb-4">
        <div
          className="font-black"
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.14em",
            color: axis.accentColor,
          }}
        >
          {axis.displayN}
        </div>
        <h2
          className="mt-1.5 m-0"
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 900,
            fontSize: 30,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            ...nameTextStyle,
          }}
        >
          {axis.name}
        </h2>
        <p
          className="mt-2 m-0"
          style={{
            color: "rgba(245,245,245,0.65)",
            fontSize: 14.5,
            lineHeight: 1.5,
          }}
        >
          {axis.tagline}
        </p>
      </div>

      {/* ── Hero gradient card ────────────────────────────────────── */}
      <div
        className="relative rounded-3xl overflow-hidden"
        style={{
          minHeight: 168,
          padding: 22,
          border: `1px solid ${axis.accentBorder}`,
          background: `radial-gradient(130% 120% at 16% 16%, ${axis.accentGlow}, transparent 58%), linear-gradient(160deg, ${axis.gradientFrom}, ${axis.gradientTo})`,
          boxShadow: `0 0 34px ${axis.accentGlow}`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
        }}
      >
        {/* Number badge, top-left. */}
        <div
          className="absolute font-black"
          style={{
            top: 18,
            left: 22,
            fontFamily: "Montserrat, sans-serif",
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: "0.12em",
            color: axis.accentColor,
            opacity: 0.9,
          }}
        >
          {axis.displayN}
        </div>

        {/* Wave-of-lines decoration, top-right. Same 3-stroke motif
            across every axis; the accentColor is what changes. Line
            SVG only (2px stroke) — anti-AI-art hard rule. */}
        <svg
          aria-hidden="true"
          width="60"
          height="60"
          viewBox="0 0 48 48"
          fill="none"
          stroke={axis.accentColor}
          strokeWidth="2"
          strokeLinecap="round"
          className="absolute"
          style={{ top: 16, right: 18, opacity: 0.9 }}
        >
          <path d="M6 16c4-4 8-4 12 0s8 4 12 0 8-4 12 0" />
          <path d="M6 26c4-4 8-4 12 0s8 4 12 0 8-4 12 0" />
          <path d="M6 36c4-4 8-4 12 0s8 4 12 0 8-4 12 0" />
        </svg>

        {/* Axis name — sits bottom-left of the hero card. */}
        <div
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 900,
            fontSize: 36,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            ...nameTextStyle,
          }}
        >
          {axis.name}
        </div>
      </div>

      {/* ── Definition ────────────────────────────────────────────── */}
      <h3 style={BLOCK_LABEL_STYLE}>Definition</h3>
      <p style={PROSE_STYLE}>{axis.definition}</p>

      {/* ── What to look for ─────────────────────────────────────── */}
      <h3 style={BLOCK_LABEL_STYLE}>What to look for</h3>
      <ul className="list-none m-0 p-0">
        {axis.whatToLookFor.map((item, i) => (
          <li
            key={i}
            className="flex gap-3 items-start"
            style={{
              padding: "7px 0",
              color: "rgba(245,245,245,0.85)",
              fontSize: 14.5,
              lineHeight: 1.45,
            }}
          >
            <span
              aria-hidden="true"
              className="flex-none rounded-full"
              style={{
                marginTop: 7,
                width: 8,
                height: 8,
                background: axis.accentColor,
                boxShadow: `0 0 8px ${axis.accentColor}`,
              }}
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {/* ── Score examples ────────────────────────────────────────── */}
      <h3 style={BLOCK_LABEL_STYLE}>Score examples</h3>

      {/* LOW row */}
      <div className="mb-4">
        <div
          className="text-[11.5px] font-bold uppercase mb-2"
          style={{
            color: "#FF7BEB",
            letterSpacing: "0.08em",
            fontFamily: "Montserrat, sans-serif",
          }}
        >
          1 to 2 stars looks like
        </div>
        <LowHighBar variant="low" />
        <p
          className="mt-2"
          style={{
            fontSize: 13.5,
            lineHeight: 1.55,
            color: "rgba(245,245,245,0.75)",
            margin: "8px 0 0",
          }}
        >
          {axis.exampleLow}
        </p>
      </div>

      {/* HIGH row */}
      <div>
        <div
          className="text-[11.5px] font-bold uppercase mb-2"
          style={{
            color: "#7BFF7B",
            letterSpacing: "0.08em",
            fontFamily: "Montserrat, sans-serif",
          }}
        >
          4 to 5 stars looks like
        </div>
        <LowHighBar variant="high" />
        <p
          className="mt-2"
          style={{
            fontSize: 13.5,
            lineHeight: 1.55,
            color: "rgba(245,245,245,0.75)",
            margin: "8px 0 0",
          }}
        >
          {axis.exampleHigh}
        </p>
      </div>

      {/* ── Optional note callout (magenta tone) ─────────────────── */}
      {axis.note ? (
        <div
          className="rounded-2xl px-4 py-3.5 mt-5"
          style={{
            background: "rgba(255,0,229,0.09)",
            border: "1px solid rgba(255,0,229,0.34)",
          }}
        >
          <div
            className="mb-1.5 text-[11px] font-bold uppercase"
            style={{
              color: "#FF7BEB",
              letterSpacing: "0.10em",
              fontFamily: "Montserrat, sans-serif",
            }}
          >
            Note
          </div>
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.55,
              color: "rgba(245,245,245,0.85)",
              margin: 0,
            }}
          >
            {axis.note}
          </p>
        </div>
      ) : null}

      {/* ── Bottom deep-link ─────────────────────────────────────── */}
      <div className="mt-5">
        <Link
          href={`/discover?sort=${axis.slug}`}
          className="text-[13.5px] font-semibold"
          style={{ color: "#FF7BEB" }}
        >
          See top-rated slimes on {axis.name.toLowerCase()} →
        </Link>
      </div>
    </section>
  );
}
