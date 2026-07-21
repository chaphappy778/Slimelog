// apps/web/components/guide/ExpandableSection.tsx
// T188 (2026-07-20): accordion treatment for the long-form reference
// parts (Part 6 Care, Part 13 Recipes). Both run long enough that a flat
// prose column buries the thing you came for, so each sub-section
// collapses to a titled row.
//
// SEO note: bodies are ALWAYS in the DOM and toggled with the `hidden`
// attribute rather than conditionally rendered. /guide is deliberately
// server-rendered so the full text indexes (see page.tsx header comment);
// conditional rendering would drop every closed sub-section out of the
// HTML. Keep it this way.

"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  ExpandableSection as ExpandableSectionData,
  ExpandableSubsection,
} from "@/app/guide/content";

interface ExpandableSectionProps {
  data: ExpandableSectionData;
  /** Prefix for anchor ids, keeps Part 6 and Part 13 ids distinct. */
  idPrefix: string;
  accent?: "cyan" | "green" | "magenta";
}

const ACCENTS = {
  cyan: { line: "#00F0FF", border: "rgba(0,240,255,0.32)", glow: "rgba(0,240,255,0.09)" },
  green: { line: "#39FF14", border: "rgba(57,255,20,0.30)", glow: "rgba(57,255,20,0.08)" },
  magenta: { line: "#FF7BEB", border: "rgba(255,0,229,0.34)", glow: "rgba(255,0,229,0.10)" },
} as const;

export default function ExpandableSection({
  data,
  idPrefix,
  accent = "cyan",
}: ExpandableSectionProps) {
  const tone = ACCENTS[accent];
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Hash-on-load: /guide#care-refresh-techniques opens that sub-section
  // and scrolls to it. Mirrors TextureExplorer's hash handling.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash?.replace(/^#/, "");
    if (!hash || !hash.startsWith(`${idPrefix}-`)) return;
    const match = data.subsections.find((s) => `${idPrefix}-${s.id}` === hash);
    if (!match) return;
    setOpenIds(new Set([match.id]));
    window.requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ block: "start" });
    });
  }, [data.subsections, idPrefix]);

  return (
    <div>
      {data.intro.map((p, i) => (
        <p
          key={`intro-${i}`}
          className="mb-4 text-[13.5px]"
          style={{ color: "rgba(245,245,245,0.78)", lineHeight: 1.55 }}
        >
          {p}
        </p>
      ))}

      <ul className="list-none m-0 p-0 space-y-2.5">
        {data.subsections.map((sub, i) => {
          const prevGroup = i > 0 ? data.subsections[i - 1].group : undefined;
          const showGroup = sub.group && sub.group !== prevGroup;
          return (
            <li key={sub.id} className="m-0 p-0">
              {showGroup ? (
                <div
                  className="text-[10.5px] font-bold uppercase pt-4 pb-1.5"
                  style={{
                    color: tone.line,
                    letterSpacing: "0.14em",
                    fontFamily: "Montserrat, sans-serif",
                  }}
                >
                  {sub.group}
                </div>
              ) : null}
              <Row
                sub={sub}
                idPrefix={idPrefix}
                tone={tone}
                open={openIds.has(sub.id)}
                onToggle={toggle}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────

function Row({
  sub,
  idPrefix,
  tone,
  open,
  onToggle,
}: {
  sub: ExpandableSubsection;
  idPrefix: string;
  tone: (typeof ACCENTS)[keyof typeof ACCENTS];
  open: boolean;
  onToggle: (id: string) => void;
}) {
  const anchorId = `${idPrefix}-${sub.id}`;
  const panelId = `${anchorId}-panel`;

  return (
    <div
      id={anchorId}
      className="rounded-2xl overflow-hidden"
      style={{
        background: "rgba(45,10,78,0.3)",
        border: `1px solid ${open ? tone.border : "rgba(45,10,78,0.7)"}`,
        boxShadow: open ? `inset 0 0 26px ${tone.glow}` : "none",
        scrollMarginTop: 116,
      }}
    >
      <button
        type="button"
        onClick={() => onToggle(sub.id)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-transform active:scale-[0.99]"
        style={{ background: "transparent", border: "none", cursor: "pointer" }}
      >
        <span
          className="flex-1 min-w-0 text-white"
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 900,
            fontSize: 14.5,
            letterSpacing: "-0.01em",
            lineHeight: 1.2,
          }}
        >
          {sub.title}
        </span>

        {sub.tag ? (
          <span
            className="flex-none text-[10px] font-bold uppercase rounded-full px-2 py-0.5"
            style={{
              color: tone.line,
              background: tone.glow,
              border: `1px solid ${tone.border}`,
              letterSpacing: "0.06em",
              fontFamily: "Montserrat, sans-serif",
            }}
          >
            {sub.tag}
          </span>
        ) : null}

        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={tone.line}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="flex-none"
          style={{
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 180ms ease",
          }}
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>

      {/* Always rendered, hidden when closed. See file header. */}
      <div
        id={panelId}
        hidden={!open}
        className="px-4 pb-4"
        style={{ borderTop: `1px solid ${tone.border}` }}
      >
        <div className="pt-3.5" style={{ maxWidth: "65ch" }}>
          {sub.paragraphs?.map((p, i) => (
            <p
              key={`p-${i}`}
              className="mb-3 last:mb-0"
              style={{
                fontSize: 13.5,
                lineHeight: 1.65,
                color: "rgba(245,245,245,0.82)",
              }}
            >
              {p}
            </p>
          ))}

          {sub.bullets ? (
            <ItemList
              label={sub.bullets.label}
              items={sub.bullets.items}
              tone={tone}
            />
          ) : null}

          {sub.steps ? (
            <ItemList
              label={sub.steps.label}
              items={sub.steps.items}
              tone={tone}
              ordered
            />
          ) : null}

          {sub.tiles ? <TileGrid tiles={sub.tiles} tone={tone} /> : null}

          {sub.tip ? (
            <div
              className="rounded-2xl px-4 py-3.5 mt-4"
              style={{ background: tone.glow, border: `1px solid ${tone.border}` }}
            >
              <div
                className="text-[10.5px] font-bold uppercase mb-1.5"
                style={{
                  color: tone.line,
                  letterSpacing: "0.10em",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                Tip
              </div>
              <p
                className="text-[13px]"
                style={{
                  color: "rgba(245,245,245,0.85)",
                  lineHeight: 1.55,
                  margin: 0,
                }}
              >
                {sub.tip}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── Lists ────────────────────────────────────────────────────────────

function ItemList({
  label,
  items,
  tone,
  ordered = false,
}: {
  label: string;
  items: string[];
  tone: (typeof ACCENTS)[keyof typeof ACCENTS];
  ordered?: boolean;
}) {
  return (
    <div className="mt-4 first:mt-0">
      <div
        className="text-[10.5px] font-bold uppercase mb-2"
        style={{
          color: tone.line,
          letterSpacing: "0.12em",
          fontFamily: "Montserrat, sans-serif",
        }}
      >
        {label}
      </div>
      <ol className="list-none m-0 p-0 space-y-2">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2.5 text-[13px]"
            style={{ color: "rgba(245,245,245,0.82)", lineHeight: 1.55 }}
          >
            {ordered ? (
              <span
                className="flex-none grid place-items-center rounded-md font-black"
                aria-hidden="true"
                style={{
                  width: 18,
                  height: 18,
                  marginTop: 1,
                  fontFamily: "Montserrat, sans-serif",
                  fontSize: 10.5,
                  color: tone.line,
                  border: `1px solid ${tone.border}`,
                }}
              >
                {i + 1}
              </span>
            ) : (
              <span
                className="flex-none rounded-sm"
                aria-hidden="true"
                style={{
                  width: 6,
                  height: 6,
                  marginTop: 7,
                  background: tone.line,
                  boxShadow: `0 0 8px ${tone.line}`,
                }}
              />
            )}
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── Tile grid (Care by Texture Type) ────────────────────────────────
// Always-visible once the parent row is open. Deliberately not a third
// level of accordion — nineteen nested expanders would be worse than
// scrolling.

function TileGrid({
  tiles,
  tone,
}: {
  tiles: { name: string; note: string }[];
  tone: (typeof ACCENTS)[keyof typeof ACCENTS];
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-4">
      {tiles.map((tile) => (
        <div
          key={tile.name}
          className="rounded-xl px-3.5 py-3"
          style={{
            background: "rgba(10,0,20,0.35)",
            border: "1px solid rgba(45,10,78,0.7)",
          }}
        >
          <div
            className="mb-1.5"
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 900,
              fontSize: 13,
              letterSpacing: "-0.01em",
              color: tone.line,
            }}
          >
            {tile.name}
          </div>
          <p
            className="text-[12.5px]"
            style={{
              color: "rgba(245,245,245,0.75)",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {tile.note}
          </p>
        </div>
      ))}
    </div>
  );
}
